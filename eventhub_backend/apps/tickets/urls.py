from __future__ import annotations

from django.urls import path

from .views import (
    EventTicketTypesView,
    PromoCodeDetailView,
    PromoCodeManageView,
    PromoCodeValidateView,
    TicketTypeCreateView,
    TicketTypeUpdateView,
    EventRegistrationSetupView,
    EventRegistrationPublicView,
    SchoolListView,
    CourseListView,
    SchoolUploadView,
    CourseUploadView,
    LocationSearchView,
)

urlpatterns = [
    path("events/<slug:slug>/tickets/", EventTicketTypesView.as_view(), name="event-ticket-types"),
    path("events/<slug:slug>/tickets/create/", TicketTypeCreateView.as_view(), name="tickettype-create"),
    path(
        "events/<slug:slug>/tickets/<uuid:ticket_id>/",
        TicketTypeUpdateView.as_view(),
        name="tickettype-detail",
    ),
    path("events/<slug:slug>/registration/", EventRegistrationPublicView.as_view(), name="event-registration-public"),
    path("events/<slug:slug>/registration/setup/", EventRegistrationSetupView.as_view(), name="event-registration-setup"),
    path("events/<slug:slug>/promo-codes/", PromoCodeManageView.as_view(), name="promo-list-create"),
    path(
        "events/<slug:slug>/promo-codes/<uuid:promo_id>/",
        PromoCodeDetailView.as_view(),
        name="promo-detail",
    ),
    path("events/<slug:slug>/validate-promo/", PromoCodeValidateView.as_view(), name="promo-validate"),
    path("academics/schools/", SchoolListView.as_view(), name="schools-list"),
    path("academics/courses/", CourseListView.as_view(), name="courses-list"),
    path("academics/schools/upload/", SchoolUploadView.as_view(), name="schools-upload"),
    path("academics/courses/upload/", CourseUploadView.as_view(), name="courses-upload"),
    path("locations/search/", LocationSearchView.as_view(), name="location-search"),
]
