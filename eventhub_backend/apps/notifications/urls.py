from django.urls import path
from .views import (
    NotificationListView,
    NotificationMarkReadView,
    NotificationMarkAllReadView,
    UnreadCountView,
)

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification-list"),
    path("unread-count/", UnreadCountView.as_view(), name="notification-unread-count"),
    path("read-all/", NotificationMarkAllReadView.as_view(), name="notification-read-all"),
    path("<int:pk>/read/", NotificationMarkReadView.as_view(), name="notification-read"),
]
