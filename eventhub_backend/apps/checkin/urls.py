from django.urls import path
from .views import (
    QRScanView,
    CheckInListView,
    AttendanceDashboardView,
    ResendTicketEmailView,
    RetrieveTicketView,
)

urlpatterns = [
    path("", CheckInListView.as_view(), name="checkin-list"),
    path("scan/", QRScanView.as_view(), name="checkin-scan"),
    path("attendance/", AttendanceDashboardView.as_view(), name="checkin-attendance"),
    path("resend/", ResendTicketEmailView.as_view(), name="checkin-resend"),
]
