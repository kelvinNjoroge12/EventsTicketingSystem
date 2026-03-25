from django.urls import path
from .views import RecordEventViewView, EventAnalyticsSummaryView, EventAnalyticsExportView

urlpatterns = [
    path("", EventAnalyticsSummaryView.as_view(), name="event-analytics"),
    path("view/", RecordEventViewView.as_view(), name="event-analytics-view"),
    path("export/", EventAnalyticsExportView.as_view(), name="event-analytics-export"),
]
