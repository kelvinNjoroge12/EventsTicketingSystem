from __future__ import annotations

from django.urls import path

from .views import (
    FreeOrderConfirmView,
    MpesaInitiateView,
    MpesaQueryView,
    StripeCreatePaymentIntentView,
    SimulatePaymentConfirmView,
    mpesa_callback,
    stripe_webhook,
)
from .refund_views import RefundOrderView


urlpatterns = [
    path("stripe/create-intent/", StripeCreatePaymentIntentView.as_view(), name="stripe-create-intent"),
    path("free/confirm/", FreeOrderConfirmView.as_view(), name="free-confirm"),
    path("stripe/webhook/", stripe_webhook, name="stripe-webhook"),
    path("mpesa/initiate/", MpesaInitiateView.as_view(), name="mpesa-initiate"),
    path("mpesa/callback/", mpesa_callback, name="mpesa-callback"),
    path("mpesa/query/", MpesaQueryView.as_view(), name="mpesa-query"),
    path("simulate/confirm/", SimulatePaymentConfirmView.as_view(), name="simulate-confirm"),
    
    # Refund endpoint (issue #6)
    path("refund/", RefundOrderView.as_view(), name="refund-order"),
]

# Queue endpoints (issue #1)
from .queue_views import QueueJoinView, QueueStatusView, QueueAdminView
queue_patterns = [
    path("events/<slug:slug>/queue/status/", QueueStatusView.as_view(), name="queue-status"),
    path("events/<slug:slug>/queue/join/", QueueJoinView.as_view(), name="queue-join"),
    path("events/<slug:slug>/queue/admin/", QueueAdminView.as_view(), name="queue-admin"),
]

urlpatterns += queue_patterns

