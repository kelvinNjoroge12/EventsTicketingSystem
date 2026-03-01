from django.urls import path
from .views import QRScanView, CheckInListView

urlpatterns = [
    path("", CheckInListView.as_view(), name="checkin-list"),
    path("scan/", QRScanView.as_view(), name="checkin-scan"),
]
