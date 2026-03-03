from __future__ import annotations

from django.conf import settings
from django.http import HttpRequest, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from rest_framework import permissions, status
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.orders.models import Order, Ticket
from apps.orders.utils import send_ticket_email
from apps.notifications.serializers import create_notification
from .models import Payment
from .mpesa_service import MpesaService
from .stripe_service import StripeService

import json
import stripe
import uuid

class StripeCreatePaymentIntentView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order_number = request.data.get("order_number")
        attendee = request.user if request.user.is_authenticated else None
        order = Order.objects.filter(order_number=order_number, attendee=attendee, status="pending").first()
        if not order:
            return Response({"detail": "Order not found or not payable."}, status=status.HTTP_400_BAD_REQUEST)
        service = StripeService()
        client_secret = service.create_payment_intent(order)
        return Response({"client_secret": client_secret})


class FreeOrderConfirmView(APIView):
    """
    POST /api/payments/free/confirm/
    Accepts: { "order_number": "EH..." }
    Only works if order.total == 0 and payment_method == "free"
    """
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order_number = request.data.get("order_number")
        attendee = request.user if request.user.is_authenticated else None
        order = Order.objects.filter(
            order_number=order_number, 
            attendee=attendee, 
            status="pending"
        ).first()

        if not order:
            return Response({"detail": "Order not found or not pending."}, status=status.HTTP_400_BAD_REQUEST)
        
        if order.payment_method != "free" or order.total > 0:
            return Response({"detail": "Order is not free."}, status=status.HTTP_400_BAD_REQUEST)

        order.status = "confirmed"
        order.save(update_fields=["status"])
        
        # Create Ticket rows for each item in the free order
        tickets_to_create = []
        for item in order.items.all():
            for _ in range(item.quantity):
                tickets_to_create.append(
                    Ticket(
                        order=order,
                        order_item=item,
                        event=order.event,
                        ticket_type=item.ticket_type,
                        attendee_name=order.attendee_first_name + " " + order.attendee_last_name,
                        attendee_email=order.attendee_email,
                        status="valid",
                        qr_code_data=uuid.uuid4(),
                    )
                )
        if tickets_to_create:
            Ticket.objects.bulk_create(tickets_to_create)

        # Fire notification
        if order.attendee:
            create_notification(
                recipient=order.attendee,
                notification_type="ticket_confirmed",
                title="Your free tickets are confirmed! 🎉",
                message=(
                    f"Your order #{order.order_number} for "
                    f"{order.event.title if order.event else 'the event'} has been confirmed. "
                    f"Check your tickets below."
                ),
                event=order.event,
                action_url=f"/confirmation/{order.order_number}",
            )
            
        send_ticket_email(order)

        return Response({"success": True, "message": "Free order confirmed."})


@csrf_exempt
def stripe_webhook(request: HttpRequest) -> HttpResponse:
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except Exception:
        return HttpResponse(status=400)

    if event["type"] == "payment_intent.succeeded":
        intent = event["data"]["object"]
        pi_id = intent["id"]
        try:
            payment = Payment.objects.select_related("order").get(stripe_payment_intent_id=pi_id)
        except Payment.DoesNotExist:
            return HttpResponse(status=200)
        payment.status = "succeeded"
        payment.raw_response = intent
        payment.save(update_fields=["status", "raw_response"])
        order = payment.order
        if order.status != "confirmed":
            order.status = "confirmed"
            order.save(update_fields=["status"])
            
            # Create Ticket rows for each item in the order
            tickets_to_create = []
            for item in order.items.all():
                for _ in range(item.quantity):
                    tickets_to_create.append(
                        Ticket(
                            order=order,
                            order_item=item,
                            event=order.event,
                            ticket_type=item.ticket_type,
                            attendee_name=order.attendee_first_name + " " + order.attendee_last_name,
                            attendee_email=order.attendee_email,
                            status="valid",
                            qr_code_data=uuid.uuid4(),
                        )
                    )
            if tickets_to_create:
                Ticket.objects.bulk_create(tickets_to_create)

            # Fire in-app notification
            if order.attendee:
                create_notification(
                    recipient=order.attendee,
                    notification_type="ticket_confirmed",
                    title="Your tickets are confirmed! 🎉",
                    message=(
                        f"Your order #{order.order_number} for "
                        f"{order.event.title if order.event else 'the event'} has been confirmed. "
                        f"Check your tickets below."
                    ),
                    event=order.event,
                    action_url=f"/confirmation/{order.order_number}",
                )
            
            send_ticket_email(order)

    return HttpResponse(status=200)


class MpesaInitiateView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        order_number = request.data.get("order_number")
        phone = request.data.get("phone")
        attendee = request.user if request.user.is_authenticated else None
        order = Order.objects.filter(order_number=order_number, attendee=attendee, status="pending").first()
        if not order:
            return Response({"detail": "Order not found or not payable."}, status=status.HTTP_400_BAD_REQUEST)
        if not phone:
            return Response({"detail": "Phone number is required."}, status=status.HTTP_400_BAD_REQUEST)
        service = MpesaService()
        try:
            payment = service.stk_push(order, phone_number=phone)
            return Response({"checkout_request_id": payment.mpesa_checkout_request_id}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"detail": f"Mpesa Service unavailable: {str(e)}"}, status=status.HTTP_400_BAD_REQUEST)


@csrf_exempt
def mpesa_callback(request: HttpRequest) -> HttpResponse:
    try:
        data = json.loads(request.body.decode("utf-8"))
    except Exception:
        return HttpResponse(status=400)
    service = MpesaService()
    service.handle_callback(data)
    return HttpResponse(
        json.dumps({"ResultCode": 0, "ResultDesc": "Success"}), content_type="application/json", status=200
    )


class MpesaQueryView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        checkout_request_id = request.data.get("checkout_request_id")
        if not checkout_request_id:
            return Response({"detail": "checkout_request_id is required."}, status=status.HTTP_400_BAD_REQUEST)
        try:
            payment = Payment.objects.select_related("order").get(mpesa_checkout_request_id=checkout_request_id)
        except Payment.DoesNotExist:
            return Response({"detail": "Payment not found."}, status=status.HTTP_404_NOT_FOUND)
        
        attendee = request.user if request.user.is_authenticated else None
        if payment.order.attendee != attendee:
            return Response({"detail": "Not allowed."}, status=status.HTTP_403_FORBIDDEN)
        
        return Response({"status": payment.status}, status=status.HTTP_200_OK)

