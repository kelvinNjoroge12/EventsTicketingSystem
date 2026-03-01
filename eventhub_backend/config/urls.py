from django.conf import settings
from django.conf.urls.static import static
from django.contrib import admin
from django.urls import include, path
from django.views.generic import RedirectView

from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView,
)


urlpatterns = [
    path("", RedirectView.as_view(url="api/docs/", permanent=False)),
    path("admin/", admin.site.urls),
    path("api/schema/", SpectacularAPIView.as_view(), name="schema"),
    path("api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="swagger-ui"),
    path("api/redoc/", SpectacularRedocView.as_view(url_name="schema"), name="redoc"),
    # Core apps
    path("api/auth/", include("apps.accounts.urls")),
    path("api/events/", include("apps.events.urls")),
    path("api/", include("apps.tickets.urls")),
    path("api/orders/", include("apps.orders.urls")),
    path("api/payments/", include("apps.payments.urls")),
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
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
