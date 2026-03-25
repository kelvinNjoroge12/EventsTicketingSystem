from django.urls import path
from .views import SpeakerListCreateView, SpeakerDetailView

urlpatterns = [
    path("", SpeakerListCreateView.as_view(), name="speaker-list-create"),
    path("<uuid:pk>/", SpeakerDetailView.as_view(), name="speaker-detail"),
]
