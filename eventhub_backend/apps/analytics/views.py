from __future__ import annotations

from django.db.models import Count, Sum
from django.utils import timezone
from rest_framework import permissions, status
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework import generics

from apps.events.models import Event
from apps.orders.models import Order, Ticket
from apps.checkin.models import CheckIn
from .models import EventView, DailyEventStats


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
        EventView.objects.create(
            event=event,
            session_key=session_key,
            ip_address=request.META.get("REMOTE_ADDR"),
            user_agent=request.META.get("HTTP_USER_AGENT", "")[:500],
            referrer=request.META.get("HTTP_REFERER", "")[:500],
        )
        Event.objects.filter(pk=event.pk).update(view_count=event.view_count + 1)
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
