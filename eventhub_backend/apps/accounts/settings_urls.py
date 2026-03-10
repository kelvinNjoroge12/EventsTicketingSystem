from __future__ import annotations

from django.urls import path

from apps.notifications.views import NotificationPreferenceView
from .views import IntegrationListView, IntegrationConnectView, IntegrationDisconnectView

urlpatterns = [
    path("notifications/", NotificationPreferenceView.as_view(), name="notification-preferences"),
    path("integrations/", IntegrationListView.as_view(), name="integrations"),
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
