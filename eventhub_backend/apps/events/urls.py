from __future__ import annotations

from django.urls import path

from .views import (
    CategoryListView,
    EventApproveView,
    EventCreateView,
    EventDeleteView,
    EventDetailView,
    EventListView,
    EventPublishView,
    EventRejectView,
    EventReviewQueueView,
    EventUpdateView,
    FeaturedEventsView,
    MyEventsListView,
    OrganizerEventListView,
    related_events,
)

urlpatterns = [
    # Top-priority specific endpoints
    path("organizer/", MyEventsListView.as_view(), name="my-events"),
    # Alias for /organizer/ — kept for backwards-compat with old frontend builds
    path("my/", MyEventsListView.as_view(), name="my-events-alias"),
    path("create/", EventCreateView.as_view(), name="event-create"),
    path("categories/", CategoryListView.as_view(), name="event-categories"),
    path("featured/", FeaturedEventsView.as_view(), name="event-featured"),
    path("reviews/", EventReviewQueueView.as_view(), name="event-review-queue"),
    path("reviews/<slug:slug>/approve/", EventApproveView.as_view(), name="event-review-approve"),
    path("reviews/<slug:slug>/reject/", EventRejectView.as_view(), name="event-review-reject"),

    # Generic list and organizer list
    path("", EventListView.as_view(), name="event-list"),
    path("organizers/<str:id>/", OrganizerEventListView.as_view(), name="organizer-events"),

    # Sluggish details
    path("<slug:slug>/", EventDetailView.as_view(), name="event-detail"),
    path("<slug:slug>/publish/", EventPublishView.as_view(), name="event-publish"),
    path("<slug:slug>/edit/", EventUpdateView.as_view(), name="event-update"),
    path("<slug:slug>/delete/", EventDeleteView.as_view(), name="event-delete"),
    path("<slug:slug>/related/", related_events, name="event-related"),
]
