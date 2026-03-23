from __future__ import annotations

import csv
import logging
import uuid
import hashlib

from django.db.models import Count, Sum, Q
from django.db.models.functions import TruncMonth
from django.http import HttpResponse
from django.utils import timezone
from django.core.cache import cache
from rest_framework import permissions, status, throttling
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics

from apps.events.models import Event
from apps.orders.models import Order, Ticket, OrderRegistration
from apps.checkin.models import CheckIn
from .models import EventView, DailyEventStats

logger = logging.getLogger(__name__)


def _trim_value(value, max_len: int = 1000):
    if value is None:
        return None
    text = str(value)
    if len(text) <= max_len:
        return text
    return text[:max_len] + "...(truncated)"


class FrontendErrorReportView(APIView):
    """
    POST /api/analytics/frontend-error/
    Lightweight endpoint for client-side error reporting.
    """

    permission_classes = [permissions.AllowAny]
    throttle_classes = [throttling.ScopedRateThrottle]
    throttle_scope = "frontend_error"

    def post(self, request):
        payload = request.data if isinstance(request.data, dict) else {}
        data = {
            "message": _trim_value(payload.get("message"), 400),
            "name": _trim_value(payload.get("name"), 200),
            "stack": _trim_value(payload.get("stack"), 4000),
            "componentStack": _trim_value(payload.get("componentStack"), 2000),
            "url": _trim_value(payload.get("url"), 1000),
            "userAgent": _trim_value(payload.get("userAgent"), 500),
            "timestamp": _trim_value(payload.get("timestamp"), 80),
            "severity": _trim_value(payload.get("severity"), 40),
        }

        user_id = None
        try:
            if request.user and request.user.is_authenticated:
                user_id = str(request.user.id)
        except Exception:
            user_id = None

        logger.error(
            "FrontendError user=%s ip=%s data=%s",
            user_id,
            request.META.get("REMOTE_ADDR"),
            data,
        )
        return Response({"received": True}, status=status.HTTP_201_CREATED)


class RecordEventViewView(APIView):
    """
    POST /api/events/{slug}/analytics/view/
    Anonymous — increments view counter on the Event model and stores a page-view record.
    """

    permission_classes = [permissions.AllowAny]
    throttle_scope = "anon"

    def post(self, request, slug):
        event = generics.get_object_or_404(Event, slug=slug)
        # Avoid counting the same session twice in one minute
        session_key = request.session.session_key or ""
        user_agent = request.META.get("HTTP_USER_AGENT", "")[:200]
        ip_addr = request.META.get("REMOTE_ADDR", "")
        fingerprint_source = session_key or f"{ip_addr}:{user_agent}"
        if fingerprint_source:
            fingerprint = hashlib.sha256(fingerprint_source.encode("utf-8")).hexdigest()
            cache_key = f"event:view:{event.pk}:{fingerprint}"
            if not cache.add(cache_key, "1", timeout=60):
                return Response({"recorded": False, "deduped": True}, status=status.HTTP_200_OK)

        EventView.objects.create(
            event=event,
            session_key=session_key,
            ip_address=ip_addr,
            user_agent=user_agent[:500],
            referrer=request.META.get("HTTP_REFERER", "")[:500],
        )
        from django.db.models import F
        Event.objects.filter(pk=event.pk).update(view_count=F("view_count") + 1)
        return Response({"recorded": True}, status=status.HTTP_201_CREATED)


class EventAnalyticsSummaryView(APIView):
    """
    GET /api/events/{slug}/analytics/
    Organizer dashboard summary for an event.
    Returns total views, ticket_sales, revenue, check-ins, and daily breakdown.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        event = generics.get_object_or_404(Event, slug=slug)
        if event.organizer != request.user and not request.user.is_staff:
            raise PermissionDenied("Only the event organizer can view analytics.")

        # ── Total KPIs ──────────────────────────────────────────────
        confirmed_orders = Order.objects.filter(event=event, status="confirmed")
        total_revenue = confirmed_orders.aggregate(rev=Sum("total"))["rev"] or 0
        total_tickets_sold = Ticket.objects.filter(event=event).count()
        total_checkins = CheckIn.objects.filter(event=event).count()
        total_views = event.view_count

        # ── Daily breakdown (last 30 days) ───────────────────────────
        thirty_days_ago = timezone.now().date() - timezone.timedelta(days=30)
        daily = list(
            DailyEventStats.objects.filter(event=event, date__gte=thirty_days_ago)
            .values("date", "views", "tickets_sold", "revenue", "checkins")
            .order_by("date")
        )

        # ── Ticket breakdown by type ──────────────────────────────────
        ticket_breakdown = list(
            Ticket.objects.filter(event=event)
            .values("ticket_type__name")
            .annotate(count=Count("id"))
            .order_by("-count")
        )

        return Response(
            {
                "totals": {
                    "views": total_views,
                    "tickets_sold": total_tickets_sold,
                    "revenue": float(total_revenue),
                    "checkins": total_checkins,
                    "capacity": event.capacity,
                    "capacity_used_pct": (
                        round(total_tickets_sold / event.capacity * 100, 1)
                        if event.capacity
                        else None
                    ),
                },
                "daily": daily,
                "ticket_breakdown": ticket_breakdown,
            }
        )


class EventAnalyticsExportView(APIView):
    """
    GET /api/events/{slug}/analytics/export/
    Download event analytics as CSV.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        event = generics.get_object_or_404(Event, slug=slug)
        if event.organizer != request.user and not request.user.is_staff:
            raise PermissionDenied("Only the event organizer can export analytics.")

        response = HttpResponse(content_type="text/csv")
        filename = f"{event.slug}-analytics.csv"
        response["Content-Disposition"] = f'attachment; filename="{filename}"'

        writer = csv.writer(response)
        writer.writerow([
            "order_number",
            "attendee_name",
            "attendee_email",
            "ticket_type",
            "ticket_status",
            "checked_in_at",
            "checked_in_by",
            "order_total",
            "order_created_at",
        ])

        tickets = Ticket.objects.filter(event=event).select_related("order", "ticket_type", "checked_in_by")
        for ticket in tickets:
            order = ticket.order
            checkin = getattr(ticket, "checkin", None)
            writer.writerow([
                order.order_number if order else "",
                ticket.attendee_name,
                ticket.attendee_email,
                ticket.ticket_type.name if ticket.ticket_type else "",
                ticket.status,
                checkin.created_at.isoformat() if checkin else "",
                ticket.checked_in_by.get_full_name() if ticket.checked_in_by else "",
                str(order.total) if order else "",
                order.created_at.isoformat() if order else "",
            ])

        return response


def _safe_int(value):
    try:
        return int(value)
    except (TypeError, ValueError):
        return None


def _safe_uuid(value):
    try:
        return uuid.UUID(str(value))
    except (TypeError, ValueError, AttributeError):
        return None


class OrganizerAnalyticsDashboardView(APIView):
    """
    GET /api/analytics/organizer/summary/
    Organizer-only analytics across their events with optional filters.
    Query params: event_id, event_slug, year, graduation_year, course_id, school_id, location, category.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ("organizer", "admin") and not request.user.is_staff:
            raise PermissionDenied("Only organizers can view analytics.")

        organizer_events_qs = Event.objects.filter(organizer=request.user)
        available_years = sorted(
            {year for year in organizer_events_qs.values_list("start_date__year", flat=True) if year},
            reverse=True,
        )

        event_id = request.query_params.get("event_id") or request.query_params.get("event")
        event_slug = request.query_params.get("event_slug")
        year = _safe_int(request.query_params.get("year"))
        if year is None:
            year = timezone.now().year
        graduation_year = _safe_int(request.query_params.get("graduation_year"))
        course_id = _safe_uuid(request.query_params.get("course_id") or request.query_params.get("course"))
        school_id = _safe_uuid(request.query_params.get("school_id") or request.query_params.get("school"))
        location = (request.query_params.get("location") or "").strip()
        category = (request.query_params.get("category") or "").strip().lower()

        events_qs = organizer_events_qs
        if event_id:
            events_qs = events_qs.filter(id=event_id)
        if event_slug:
            events_qs = events_qs.filter(slug=event_slug)
        if location:
            parts = [p.strip() for p in location.split(",") if p.strip()]
            location_query = Q()
            for part in parts or [location]:
                location_query |= Q(city__icontains=part) | Q(country__icontains=part) | Q(venue_name__icontains=part)
            events_qs = events_qs.filter(location_query)
        events_qs = events_qs.filter(start_date__year=year)

        event_ids = list(events_qs.values_list("id", flat=True))
        if not event_ids:
            if not available_years:
                available_years = [year]
            return Response({
                "kpis": {
                    "total_events": 0,
                    "total_attendees": 0,
                    "total_students": 0,
                    "total_alumni": 0,
                    "total_guests": 0,
                    "total_uncategorized": 0,
                    "total_checkins": 0,
                    "checkin_percent": 0,
                },
                "category_breakdown": [],
                "alumni_insights": {
                    "total_alumni": 0,
                    "events_with_alumni": 0,
                    "most_engaged_class": None,
                    "top_graduation_years": [],
                    "most_active_alumni": [],
                    "registration_vs_attendance": {
                        "registered": 0,
                        "checked_in": 0,
                        "percent": 0,
                    },
                },
                "filters": {
                    "years": available_years,
                    "graduation_years": [],
                    "courses": [],
                    "schools": [],
                    "locations": [],
                },
                "selected_year": year,
            })

        tickets_qs = Ticket.objects.filter(event_id__in=event_ids).exclude(status__in=["cancelled", "refunded"])

        reg_filters = {}
        if graduation_year is not None:
            reg_filters["order__registration__graduation_year"] = graduation_year
        if course_id:
            reg_filters["order__registration__course_id"] = course_id
        if school_id:
            reg_filters["order__registration__school_id"] = school_id
        if category in ("student", "alumni", "guest"):
            reg_filters["order__registration__category"] = category

        if reg_filters:
            tickets_qs = tickets_qs.filter(**reg_filters)

        total_attendees = tickets_qs.count()
        total_checkins = CheckIn.objects.filter(ticket__in=tickets_qs).count()
        checkin_percent = round((total_checkins / total_attendees) * 100, 1) if total_attendees else 0

        # Category counts
        counts = {
            "student": 0,
            "alumni": 0,
            "guest": 0,
            "uncategorized": 0,
        }
        for row in tickets_qs.values("order__registration__category").annotate(count=Count("id")):
            key = row["order__registration__category"] or "uncategorized"
            if key not in counts:
                key = "uncategorized"
            counts[key] = row["count"]

        # Events count respects attendee filters when applied
        if reg_filters:
            filtered_event_ids = tickets_qs.values_list("event_id", flat=True).distinct()
            total_events = filtered_event_ids.count()
        else:
            total_events = events_qs.count()

        # Alumni-specific insights
        alumni_tickets = tickets_qs.filter(order__registration__category="alumni")
        alumni_registered = alumni_tickets.count()
        alumni_checkins = CheckIn.objects.filter(ticket__in=alumni_tickets).count()
        alumni_checkin_percent = round((alumni_checkins / alumni_registered) * 100, 1) if alumni_registered else 0

        alumni_years_qs = (
            alumni_tickets.exclude(order__registration__graduation_year__isnull=True)
            .values("order__registration__graduation_year")
            .annotate(count=Count("id"))
            .order_by("-count")
        )
        top_years = [
            {"year": row["order__registration__graduation_year"], "count": row["count"]}
            for row in alumni_years_qs[:5]
        ]
        most_engaged_class = top_years[0] if top_years else None

        alumni_activity = (
            alumni_tickets.values("order__attendee_email")
            .annotate(events=Count("event_id", distinct=True), tickets=Count("id"))
            .order_by("-events", "-tickets")
        )
        most_active_alumni = [
            {
                "email": row["order__attendee_email"],
                "events": row["events"],
                "tickets": row["tickets"],
            }
            for row in alumni_activity[:5]
            if row.get("order__attendee_email")
        ]

        events_with_alumni = alumni_tickets.values("event_id").distinct().count()

        # Engagement over time (monthly, current vs previous year)
        months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        current_year = year
        previous_year = current_year - 1

        def _year_counts(qs, year):
            rows = (
                qs.filter(order__created_at__year=year)
                .annotate(month=TruncMonth("order__created_at"))
                .values("month")
                .annotate(count=Count("id"))
                .order_by("month")
            )
            data = {}
            for row in rows:
                month = row.get("month")
                if not month:
                    continue
                data[month.month] = row["count"]
            return data

        def _build_series(qs):
            current_map = _year_counts(qs, current_year)
            previous_map = _year_counts(qs, previous_year)
            return [
                {
                    "label": months[i],
                    "current": current_map.get(i + 1, 0),
                    "previous": previous_map.get(i + 1, 0),
                }
                for i in range(12)
            ]

        engagement_categories = {
            "all": _build_series(tickets_qs),
            "student": _build_series(tickets_qs.filter(order__registration__category="student")),
            "alumni": _build_series(tickets_qs.filter(order__registration__category="alumni")),
            "guest": _build_series(tickets_qs.filter(order__registration__category="guest")),
        }

        # Most engaged schools (top 6)
        school_rows = (
            tickets_qs.exclude(order__registration__school__isnull=True)
            .values("order__registration__school__name")
            .annotate(count=Count("id"))
            .order_by("-count")[:6]
        )
        most_engaged_schools = [
            {"school": row["order__registration__school__name"], "count": row["count"]}
            for row in school_rows
            if row.get("order__registration__school__name")
        ]

        # Filter options (based on organizer events + registrations)
        reg_base = OrderRegistration.objects.filter(order__event_id__in=event_ids)
        graduation_years = list(
            reg_base.exclude(graduation_year__isnull=True)
            .values_list("graduation_year", flat=True)
            .distinct()
            .order_by("-graduation_year")
        )
        courses = list(
            reg_base.exclude(course__isnull=True)
            .values("course_id", "course__name")
            .distinct()
            .order_by("course__name")
        )
        schools = list(
            reg_base.exclude(school__isnull=True)
            .values("school_id", "school__name")
            .distinct()
            .order_by("school__name")
        )
        locations = []
        for row in events_qs.values("city", "country").distinct():
            city = (row.get("city") or "").strip()
            country = (row.get("country") or "").strip()
            label = ", ".join(part for part in [city, country] if part)
            if label:
                locations.append({"label": label, "city": city, "country": country})

        if not available_years:
            available_years = [year]

        return Response({
            "kpis": {
                "total_events": total_events,
                "total_attendees": total_attendees,
                "total_students": counts["student"],
                "total_alumni": counts["alumni"],
                "total_guests": counts["guest"],
                "total_uncategorized": counts["uncategorized"],
                "total_checkins": total_checkins,
                "checkin_percent": checkin_percent,
            },
            "category_breakdown": [
                {"category": "student", "label": "Students", "count": counts["student"]},
                {"category": "alumni", "label": "Alumni", "count": counts["alumni"]},
                {"category": "guest", "label": "Guests", "count": counts["guest"]},
                {"category": "uncategorized", "label": "Uncategorized", "count": counts["uncategorized"]},
            ],
            "alumni_insights": {
                "total_alumni": counts["alumni"],
                "events_with_alumni": events_with_alumni,
                "most_engaged_class": most_engaged_class,
                "top_graduation_years": top_years,
                "most_active_alumni": most_active_alumni,
                "registration_vs_attendance": {
                    "registered": alumni_registered,
                    "checked_in": alumni_checkins,
                    "percent": alumni_checkin_percent,
                },
            },
            "engagement_over_time": {
                "current_year": current_year,
                "previous_year": previous_year,
                "categories": engagement_categories,
            },
            "most_engaged_schools": most_engaged_schools,
            "filters": {
                "years": available_years,
                "graduation_years": graduation_years,
                "courses": courses,
                "schools": schools,
                "locations": locations,
            },
            "selected_year": year,
        })
