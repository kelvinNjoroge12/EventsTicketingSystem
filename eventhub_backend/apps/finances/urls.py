from django.urls import path
from .views import (
    OrganizerExpenseListCreateView, 
    OrganizerExpenseDetailView, 
    OrganizerDashboardStatsView,
    OrganizerAttendeeListView,
    OrganizerRevenueListCreateView,
    OrganizerRevenueDetailView,
    OrganizerRevenueSeriesView,
)

urlpatterns = [
    path('expenses/', OrganizerExpenseListCreateView.as_view(), name='expense-list-create'),
    path('expenses/<uuid:pk>/', OrganizerExpenseDetailView.as_view(), name='expense-detail'),
    path('revenues/', OrganizerRevenueListCreateView.as_view(), name='revenue-list-create'),
    path('revenues/<uuid:pk>/', OrganizerRevenueDetailView.as_view(), name='revenue-detail'),
    path('dashboard-stats/', OrganizerDashboardStatsView.as_view(), name='dashboard-stats'),
    path('revenue-series/', OrganizerRevenueSeriesView.as_view(), name='revenue-series'),
    path('attendees/', OrganizerAttendeeListView.as_view(), name='organizer-attendee-list'),
]
