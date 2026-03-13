from __future__ import annotations

from django.urls import path

from apps.notifications.views import NotificationPreferenceView
from .views import (
    IntegrationListView,
    IntegrationConnectView,
    IntegrationDisconnectView,
    OrganizerPaymentConnectView,
    OrganizerPaymentDashboardView,
    OrganizerPaymentSettingsView,
)

urlpatterns = [
    path("notifications/", NotificationPreferenceView.as_view(), name="notification-preferences"),
    path("integrations/", IntegrationListView.as_view(), name="integrations"),
    path("payments/", OrganizerPaymentSettingsView.as_view(), name="payments-settings"),
    path("payments/connect/", OrganizerPaymentConnectView.as_view(), name="payments-connect"),
    path("payments/dashboard/", OrganizerPaymentDashboardView.as_view(), name="payments-dashboard"),
    path(
        "integrations/<str:integration_id>/connect/",
        IntegrationConnectView.as_view(),
        name="integrations-connect",
    ),
    path(
        "integrations/<str:integration_id>/disconnect/",
        IntegrationDisconnectView.as_view(),
        name="integrations-disconnect",
    ),
]
