from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView
from django.http import JsonResponse
from apps.checkin.views import RetrieveTicketView
from apps.analytics.views import FrontendErrorReportView

def health_check(request):
    """Simple endpoint to confirm the server is running."""
    return JsonResponse({"status": "ok", "message": "Render instance is awake."})

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


urlpatterns = [
    path("", RedirectView.as_view(url="api/docs/", permanent=False)),
    path("hub-control-99/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Health Check
    path("api/health/", health_check, name="health-check"),
    path("api/analytics/frontend-error/", FrontendErrorReportView.as_view(), name="frontend-error"),
    path("api/analytics/frontend-error", FrontendErrorReportView.as_view(), name="frontend-error-no-slash"),
    # Ticket self-service retrieval (public, no auth)
    path("api/tickets/retrieve/", RetrieveTicketView.as_view(), name="ticket-retrieve"),
    # Core apps
    path("api/auth/", include("apps.accounts.urls")),
    path("api/events/", include("apps.events.urls")),
    path("api/", include("apps.tickets.urls")),
    path("api/orders/", include("apps.orders.urls")),
    path("api/payments/", include("apps.payments.urls")),
    path("api/settings/", include("apps.accounts.settings_urls")),
    path("api/organizer/", include("apps.accounts.team_urls")),
    # Per-event nested resources: speakers, schedule, sponsors, check-in, analytics
    path("api/events/<slug:slug>/speakers/", include("apps.speakers.urls")),
    path("api/events/<slug:slug>/schedule/", include("apps.schedules.urls")),
    path("api/events/<slug:slug>/sponsors/", include("apps.sponsors.urls")),
    path("api/events/<slug:slug>/checkin/", include("apps.checkin.urls")),
    path("api/events/<slug:slug>/analytics/", include("apps.analytics.urls")),
    # User notifications
    path("api/notifications/", include("apps.notifications.urls")),
    # New Finances / Budgeting module
    path("api/finances/", include("apps.finances.urls")),
    # Waitlist management (join + organizer view)
    path("api/events/<slug:slug>/waitlist/", include("apps.waitlist.urls")),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)

# Import image optimization signal
try:
    import common.image_utils
except ImportError:
    pass
