from __future__ import annotations

from django.urls import path

from .views import (
    FreeOrderConfirmView,
    MpesaInitiateView,
    MpesaQueryView,
    StripeCreatePaymentIntentView,
    mpesa_callback,
    stripe_webhook,
)

urlpatterns = [
    path("stripe/create-intent/", StripeCreatePaymentIntentView.as_view(), name="stripe-create-intent"),
    path("free/confirm/", FreeOrderConfirmView.as_view(), name="free-confirm"),
    path("stripe/webhook/", stripe_webhook, name="stripe-webhook"),
    path("mpesa/initiate/", MpesaInitiateView.as_view(), name="mpesa-initiate"),
    path("mpesa/callback/", mpesa_callback, name="mpesa-callback"),
    path("mpesa/query/", MpesaQueryView.as_view(), name="mpesa-query"),
]

