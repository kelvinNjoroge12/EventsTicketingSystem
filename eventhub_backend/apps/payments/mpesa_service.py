from __future__ import annotations

import base64
import datetime
import uuid
from decimal import Decimal
from typing import Any

import requests
from django.conf import settings
from django.core.cache import cache

from apps.orders.models import Order
from apps.orders.models import Ticket
from apps.orders.utils import send_ticket_email
from apps.notifications.serializers import create_notification
from apps.notifications.email_service import EmailService
from apps.notifications.utils import should_send_email_notification
from .models import Payment


class MpesaService:
    @property
    def base_url(self) -> str:
        if settings.MPESA_ENVIRONMENT == "production":
            return "https://api.safaricom.co.ke"
        return "https://sandbox.safaricom.co.ke"

    def get_access_token(self) -> str:
        cached = cache.get("mpesa_access_token")
        if cached:
            return cached
        auth = f"{settings.MPESA_CONSUMER_KEY}:{settings.MPESA_CONSUMER_SECRET}"
        encoded = base64.b64encode(auth.encode()).decode()
        resp = requests.get(
            f"{self.base_url}/oauth/v1/generate?grant_type=client_credentials",
            headers={"Authorization": f"Basic {encoded}"},
            timeout=10,
        )
        resp.raise_for_status()
        data = resp.json()
        token = data.get("access_token")
        if token:
            cache.set("mpesa_access_token", token, 55 * 60)
        return token

    def generate_password(self) -> tuple[str, str]:
        timestamp = datetime.datetime.now().strftime("%Y%m%d%H%M%S")
        raw = f"{settings.MPESA_SHORTCODE}{settings.MPESA_PASSKEY}{timestamp}"
        password = base64.b64encode(raw.encode()).decode()
        return password, timestamp

    def stk_push(self, order: Order, phone_number: str) -> Payment:
        access_token = self.get_access_token()
        password, timestamp = self.generate_password()
        url = f"{self.base_url}/mpesa/stkpush/v1/processrequest"
        amount = int(Decimal(order.total).quantize(Decimal("1")))
        payload = {
            "BusinessShortCode": settings.MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": amount,
            "PartyA": phone_number,
            "PartyB": settings.MPESA_SHORTCODE,
            "PhoneNumber": phone_number,
            "CallBackURL": settings.MPESA_CALLBACK_URL,
            "AccountReference": order.order_number,
            "TransactionDesc": "Strathmore University ticket purchase",
        }
        resp = requests.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=15,
        )
        resp.raise_for_status()
        data = resp.json()
        checkout_id = data.get("CheckoutRequestID", "")
        merchant_id = data.get("MerchantRequestID", "")
        payment, _ = Payment.objects.get_or_create(
            order=order,
            defaults={
                "method": "mpesa",
                "amount": order.total,
                "currency": order.currency,
                "status": "processing",
            },
        )
        payment.mpesa_checkout_request_id = checkout_id
        payment.mpesa_merchant_request_id = merchant_id
        payment.mpesa_phone_number = phone_number
        payment.status = "processing"
        payment.raw_response = data
        payment.save(
            update_fields=[
                "mpesa_checkout_request_id",
                "mpesa_merchant_request_id",
                "mpesa_phone_number",
                "status",
                "raw_response",
            ]
        )
        return payment

    def query_stk_status(self, checkout_request_id: str) -> dict[str, Any]:
        access_token = self.get_access_token()
        password, timestamp = self.generate_password()
        url = f"{self.base_url}/mpesa/stkpushquery/v1/query"
        payload = {
            "BusinessShortCode": settings.MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkout_request_id,
        }
        resp = requests.post(
            url,
            json=payload,
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=10,
        )
        resp.raise_for_status()
        return resp.json()

    def handle_callback(self, data: dict[str, Any]) -> None:
        import logging
        logger = logging.getLogger(__name__)

        body = data.get("Body", {})
        stk = body.get("stkCallback", {})
        result_code = stk.get("ResultCode")
        checkout_id = stk.get("CheckoutRequestID")
        try:
            payment = Payment.objects.select_related("order").get(mpesa_checkout_request_id=checkout_id)
        except Payment.DoesNotExist:
            logger.warning("M-Pesa callback for unknown checkout_id: %s", checkout_id)
            return

        # â”€â”€ IDEMPOTENCY GUARD (issue #3) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
        # Safaricom may retry callbacks. If already processed, exit early.
        if payment.status in ("succeeded", "failed", "refunded"):
            logger.info("M-Pesa callback replay ignored for payment %s (status=%s)", payment.id, payment.status)
            return

        if result_code == 0:
            # Extract metadata from callback
            callback_meta = stk.get("CallbackMetadata", {}).get("Item", [])
            tx_id = ""
            paid_amount = None
            for item in callback_meta:
                name = item.get("Name")
                if name == "MpesaReceiptNumber":
                    tx_id = item.get("Value", "")
                elif name == "Amount":
                    try:
                        paid_amount = Decimal(str(item.get("Value", 0)))
                    except Exception:
                        paid_amount = None

            # â”€â”€ AMOUNT VERIFICATION â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
            # Reject if Safaricom reports a lower amount than the order total
            order = payment.order
            if paid_amount is not None and paid_amount < order.total:
                payment.status = "failed"
                payment.failure_reason = f"Underpaid: received {paid_amount}, expected {order.total}"
                payment.raw_response = data
                payment.save(update_fields=["status", "failure_reason", "raw_response"])
                logger.warning(
                    "M-Pesa underpayment for order %s: paid=%s expected=%s",
                    order.order_number, paid_amount, order.total,
                )
                # Log to audit trail
                _audit_log("mpesa_underpaid", "Payment", payment.id, {
                    "order_number": order.order_number,
                    "paid_amount": str(paid_amount),
                    "expected_amount": str(order.total),
                })
                return

            # Mark payment as succeeded
            payment.status = "succeeded"
            payment.mpesa_transaction_id = tx_id
            payment.raw_response = data
            payment.save(update_fields=["status", "mpesa_transaction_id", "raw_response"])

            # â”€â”€ Use the shared idempotent order confirmation â”€â”€â”€â”€â”€â”€
            # This uses select_for_update() + atomic transaction to prevent
            # double ticket creation even under concurrent callbacks
            from apps.payments.views import _confirm_order_and_issue_tickets, _notify_and_email
            try:
                order, created = _confirm_order_and_issue_tickets(order)
            except ValueError:
                logger.warning("M-Pesa callback: order %s not in confirmable state", order.order_number)
                return

            if created:
                _notify_and_email(order, title="Your M-Pesa tickets are confirmed! ðŸŽ‰")

            # Audit log
            _audit_log("mpesa_payment_succeeded", "Payment", payment.id, {
                "order_number": order.order_number,
                "amount": str(payment.amount),
                "mpesa_receipt": tx_id,
            })

        else:
            payment.status = "failed"
            payment.failure_reason = stk.get("ResultDesc", "")
            payment.raw_response = data
            payment.save(update_fields=["status", "failure_reason", "raw_response"])

            # Audit log
            _audit_log("mpesa_payment_failed", "Payment", payment.id, {
                "order_number": payment.order.order_number,
                "result_code": result_code,
                "result_desc": stk.get("ResultDesc", ""),
            })


def _audit_log(action: str, entity_type: str, entity_id, metadata: dict | None = None):
    """Best-effort write to audit log. Never raises."""
    try:
        from common.audit import log_action
        log_action(
            actor=None,
            action=action,
            entity_type=entity_type,
            entity_id=entity_id,
            metadata=metadata or {},
        )
    except Exception:
        pass

