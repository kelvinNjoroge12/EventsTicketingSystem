from __future__ import annotations

from django.urls import path

from .views import OrganizerTeamListView, OrganizerTeamInviteView, OrganizerTeamMemberDetailView

urlpatterns = [
    path("team/", OrganizerTeamListView.as_view(), name="organizer-team-list"),
    path("team/invite/", OrganizerTeamInviteView.as_view(), name="organizer-team-invite"),
    path("team/<uuid:pk>/", OrganizerTeamMemberDetailView.as_view(), name="organizer-team-member"),
]
