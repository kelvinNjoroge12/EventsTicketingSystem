from django.urls import path
from .views import SponsorListCreateView, SponsorDetailView

urlpatterns = [
    path("", SponsorListCreateView.as_view(), name="sponsor-list-create"),
    path("<uuid:pk>/", SponsorDetailView.as_view(), name="sponsor-detail"),
]
