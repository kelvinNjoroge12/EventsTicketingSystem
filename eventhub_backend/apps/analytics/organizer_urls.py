from django.urls import path

from .views import OrganizerAnalyticsDashboardView

urlpatterns = [
    path("summary/", OrganizerAnalyticsDashboardView.as_view(), name="organizer-analytics-summary"),
]
