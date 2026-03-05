from __future__ import annotations

from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, status, throttling
from rest_framework.response import Response

from apps.events.models import Event
from apps.tickets.models import TicketType
from .models import Order
from .serializers import OrderCreateSerializer, OrderDetailSerializer
from .utils import send_ticket_email
import time

import sys

class OrderCreateView(generics.GenericAPIView):
    serializer_class = OrderCreateSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "checkout"

    def post(self, request, *args, **kwargs):
        try:
            serializer = self.get_serializer(data=request.data, context={"request": request})
            serializer.is_valid(raise_exception=True)
            
            with transaction.atomic():
                event = serializer.validated_data["event"]
                items = serializer.validated_data["items"]
                ticket_ids = [i["ticket_type_id"] for i in items]
                list(TicketType.objects.select_for_update(nowait=True).filter(event=event, id__in=ticket_ids))
                order = serializer.save()
            
            if order.status == "confirmed":
                try:
                    send_ticket_email(order)
                except Exception as e:
                    import logging
                    logging.getLogger(__name__).error(f"Failed to send email for order {order.order_number}: {e}")
            
            data = OrderDetailSerializer(order).data
            return Response({"data": data}, status=status.HTTP_201_CREATED)
        except Exception as e:
            import traceback
            tb = traceback.format_exc()
            return Response({"success": False, "error": {"code": "SERVER_ERROR", "message": str(e), "traceback": tb}}, status=status.HTTP_400_BAD_REQUEST)


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


import io
import qrcode
from django.http import HttpResponse

class TicketQRView(generics.GenericAPIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, qr_code_data, *args, **kwargs):
        # Dynamically generate QR code to bypass any auth/S3 headers from storages
        # This becomes a pure 100% public PNG accessible via a simple HTTP GET.
        qr = qrcode.QRCode(version=1, box_size=10, border=4)
        qr.add_data(str(qr_code_data))
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
        
        buffer = io.BytesIO()
        img.save(buffer, format="PNG")
        
        return HttpResponse(buffer.getvalue(), content_type="image/png")
