from __future__ import annotations

from django.urls import path

from .views import OrderCancelView, OrderCreateView, OrderDetailView, OrderListView, OrderResendEmailView, TicketQRView, TicketVerificationDetailView

urlpatterns = [
    path("qr/<str:qr_code_data>/", TicketQRView.as_view(), name="ticket-qr"),
    path("qr/<str:qr_code_data>/verify/", TicketVerificationDetailView.as_view(), name="ticket-verify"),
    path("", OrderListView.as_view(), name="order-list"),
    path("create/", OrderCreateView.as_view(), name="order-create"),
    path("<str:order_number>/", OrderDetailView.as_view(), name="order-detail"),
    path("<str:order_number>/cancel/", OrderCancelView.as_view(), name="order-cancel"),
    path("<str:order_number>/resend-email/", OrderResendEmailView.as_view(), name="order-resend-email"),
]

