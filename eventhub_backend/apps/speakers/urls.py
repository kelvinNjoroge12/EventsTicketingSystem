from django.urls import path
from .views import SpeakerListCreateView, SpeakerDetailView

urlpatterns = [
    path("", SpeakerListCreateView.as_view(), name="speaker-list-create"),
    path("<int:pk>/", SpeakerDetailView.as_view(), name="speaker-detail"),
]
