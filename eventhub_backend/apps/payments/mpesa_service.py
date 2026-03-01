from __future__ import annotations

import base64
import datetime
from decimal import Decimal
from typing import Any

import requests
from django.conf import settings
from django.core.cache import cache

from apps.orders.models import Order
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
            "TransactionDesc": "EventHub ticket purchase",
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
        body = data.get("Body", {})
        stk = body.get("stkCallback", {})
        result_code = stk.get("ResultCode")
        checkout_id = stk.get("CheckoutRequestID")
        try:
            payment = Payment.objects.select_related("order").get(mpesa_checkout_request_id=checkout_id)
        except Payment.DoesNotExist:
            return

        if result_code == 0:
            # success
            callback_meta = stk.get("CallbackMetadata", {}).get("Item", [])
            tx_id = ""
            for item in callback_meta:
                if item.get("Name") == "MpesaReceiptNumber":
                    tx_id = item.get("Value", "")
                    break
            payment.status = "succeeded"
            payment.mpesa_transaction_id = tx_id
            payment.raw_response = data
            payment.save(update_fields=["status", "mpesa_transaction_id", "raw_response"])
            order = payment.order
            if order.status != "confirmed":
                order.status = "confirmed"
                order.save(update_fields=["status"])
                # TODO: create Ticket rows + send emails (Celery)
        else:
            payment.status = "failed"
            payment.raw_response = data
            payment.save(update_fields=["status", "raw_response"])

