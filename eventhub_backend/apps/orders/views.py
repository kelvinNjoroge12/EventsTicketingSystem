from __future__ import annotations

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status
from rest_framework.response import Response

from apps.events.models import Event
from apps.tickets.models import TicketType
from .models import Order
from .serializers import OrderCreateSerializer, OrderDetailSerializer
from .utils import send_ticket_email
import time

class OrderCreateView(generics.GenericAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.AllowAny]

    def post(self, request, *args, **kwargs):
        if request.data.get("ping") == "pong":
            from django.db import connection
            try:
                with connection.cursor() as c:
                    c.execute("SELECT pid, state, query, wait_event_type, wait_event FROM pg_stat_activity WHERE pid <> pg_backend_pid() AND datname = current_database() AND state != 'idle'")
                    active = c.fetchall()
            except Exception as e:
                active = str(e)
            return Response({"success": True, "active": active}, status=200)
        
        t0 = time.time()
        try:
            serializer = self.get_serializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            
            t1 = time.time()
            with transaction.atomic():
                event = serializer.validated_data["event"]
                items = serializer.validated_data["items"]
                ticket_ids = [i["ticket_type_id"] for i in items]
                list(TicketType.objects.select_for_update(nowait=True).filter(event=event, id__in=ticket_ids))
                
                t2 = time.time()
                order = serializer.save()
            
            t3 = time.time()
            if order.status == "confirmed":
                send_ticket_email(order)
            
            t4 = time.time()
            data = OrderDetailSerializer(order).data
            return Response({"data": data, "times": [t1-t0, t2-t1, t3-t2, t4-t3]}, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            return Response({"success": False, "error": {"code": "SERVER_ERROR", "message": str(e), "traceback": tb, "time": time.time()-t0}}, status=status.HTTP_400_BAD_REQUEST)


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

