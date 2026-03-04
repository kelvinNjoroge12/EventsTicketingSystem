from __future__ import annotations

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.events.models import Event
from apps.tickets.models import TicketType
from .models import Order
from .serializers import OrderCreateSerializer, OrderDetailSerializer

class OrderCreateView(generics.GenericAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            
            with transaction.atomic():
                event = serializer.validated_data["event"]
                items = serializer.validated_data["items"]
                ticket_ids = [i["ticket_type_id"] for i in items]
                
                # Lock rows to prevent overselling race conditions
                # using nowait=True prevents gunicorn hanging if another worker is locking
                list(TicketType.objects.select_for_update(nowait=True).filter(event=event, id__in=ticket_ids))
                
                order = serializer.save()
            
            # AFTER the transaction commits successfully, dispatch to CELERY queue
            if order.status == "confirmed":
                try:
                    from .tasks import send_ticket_email_task
                    send_ticket_email_task.delay(order.id)
                except Exception as e:
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to dispatch Celery email task for order {order.order_number}: {e}")

            data = OrderDetailSerializer(order).data
            return Response({"data": data}, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            # We wrap this so any lock errors or validation errors get a clean payload
            import traceback
            tb = traceback.format_exc()
            return Response(
                {"success": False, "error": {"code": "VALIDATION_ERROR" if hasattr(e, "detail") else "SERVER_ERROR", "message": str(e), "details": getattr(e, "detail", str(e))}}, 
                status=status.HTTP_400_BAD_REQUEST
            )

class OrderDetailView(generics.RetrieveAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = "order_number"

    def get_queryset(self):
        try:
            attendee = self.request.user if self.request.user.is_authenticated else None
        except Exception:
            attendee = None
        return Order.objects.filter(attendee=attendee)


class OrderListView(generics.ListAPIView):
    serializer_class = OrderDetailSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Order.objects.filter(attendee=self.request.user).order_by("-created_at")


class OrderCancelView(generics.GenericAPIView):
    permission_classes = [permissions.IsAuthenticated]
    lookup_field = "order_number"

    def post(self, request, order_number: str):
        order = get_object_or_404(Order, order_number=order_number, attendee=request.user)
        if order.status != "pending":
            return Response({"detail": "Only pending orders can be cancelled."}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            for item in order.items.select_related("ticket_type"):
                if item.ticket_type:
                    item.ticket_type.quantity_reserved = max(
                        0, item.ticket_type.quantity_reserved - item.quantity
                    )
                    item.ticket_type.save(update_fields=["quantity_reserved"])
            order.status = "cancelled"
            order.save(update_fields=["status"])
        return Response({"message": "Order cancelled."})

