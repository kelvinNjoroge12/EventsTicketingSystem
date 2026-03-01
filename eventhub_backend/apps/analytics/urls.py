from django.urls import path
from .views import RecordEventViewView, EventAnalyticsSummaryView

urlpatterns = [
    path("", EventAnalyticsSummaryView.as_view(), name="event-analytics"),
    path("view/", RecordEventViewView.as_view(), name="event-analytics-view"),
]
