from django.urls import path
from .views import (
    OrganizerExpenseListCreateView, 
    OrganizerExpenseDetailView, 
    OrganizerDashboardStatsView,
    OrganizerAttendeeListView
)

urlpatterns = [
    path('expenses/', OrganizerExpenseListCreateView.as_view(), name='expense-list-create'),
    path('expenses/<uuid:pk>/', OrganizerExpenseDetailView.as_view(), name='expense-detail'),
    path('dashboard-stats/', OrganizerDashboardStatsView.as_view(), name='dashboard-stats'),
    path('attendees/', OrganizerAttendeeListView.as_view(), name='organizer-attendee-list'),
]
