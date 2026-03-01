from django.urls import path
from .views import ScheduleListCreateView, ScheduleItemDetailView

urlpatterns = [
    path("", ScheduleListCreateView.as_view(), name="schedule-list-create"),
    path("<int:pk>/", ScheduleItemDetailView.as_view(), name="schedule-item-detail"),
]
