from django.urls import path
from .views import WaitlistJoinView, WaitlistListView, WaitlistEntryDetailView, WaitlistNotifyView

urlpatterns = [
    path("", WaitlistListView.as_view(), name="waitlist-list"),
    path("join/", WaitlistJoinView.as_view(), name="waitlist-join"),
    path("<uuid:pk>/", WaitlistEntryDetailView.as_view(), name="waitlist-entry-detail"),
    path("<uuid:pk>/notify/", WaitlistNotifyView.as_view(), name="waitlist-notify"),
]
