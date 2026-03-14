from __future__ import annotations

from datetime import date, timedelta

from django.db.models import Sum, Q
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import generics, permissions, status, serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.events.models import Event
from apps.orders.models import Order, Ticket
from apps.checkin.models import CheckIn
from .models import Expense, Revenue
from .serializers import ExpenseSerializer, RevenueSerializer


def _get_period_bounds(range_key: str) -> tuple[date, date]:
    today = timezone.localdate()
    if range_key == "week":
        start = today - timedelta(days=today.weekday())
        end = start + timedelta(days=7)
        return start, end
    if range_key == "year":
        start = date(today.year, 1, 1)
        end = date(today.year + 1, 1, 1)
        return start, end
    # default: month
    start = date(today.year, today.month, 1)
    if today.month == 12:
        end = date(today.year + 1, 1, 1)
    else:
        end = date(today.year, today.month + 1, 1)
    return start, end


def _get_previous_bounds(range_key: str, current_start: date) -> tuple[date, date]:
    if range_key == "week":
        prev_end = current_start
        prev_start = prev_end - timedelta(days=7)
        return prev_start, prev_end
    if range_key == "year":
        prev_start = date(current_start.year - 1, 1, 1)
        prev_end = current_start
        return prev_start, prev_end

    # month
    prev_end = current_start
    prev_month = current_start.month - 1
    prev_year = current_start.year
    if prev_month < 1:
        prev_month = 12
        prev_year -= 1
    prev_start = date(prev_year, prev_month, 1)
    return prev_start, prev_end


def _percent_change(current, previous):
    current_val = float(current or 0)
    previous_val = float(previous or 0)
    if previous_val == 0:
        return None
    return ((current_val - previous_val) / previous_val) * 100


def _build_kpis(events_qs, event_ids, period: tuple[date, date] | None = None):
    events_filtered = events_qs
    if period:
        start, end = period
        events_filtered = events_filtered.filter(created_at__date__gte=start, created_at__date__lt=end)

    total_events = events_filtered.count()
    published_events = events_filtered.filter(status="published").count()
    draft_events = events_filtered.filter(status="draft").count()

    orders_qs = Order.objects.filter(event_id__in=event_ids, status="confirmed")
    if period:
        orders_qs = orders_qs.filter(created_at__date__gte=start, created_at__date__lt=end)
    ticket_revenue = float(orders_qs.aggregate(rev=Sum("total"))["rev"] or 0)

    revenue_qs = Revenue.objects.filter(event_id__in=event_ids)
    if period:
        revenue_qs = revenue_qs.filter(date__gte=start, date__lt=end)
    manual_revenue = float(revenue_qs.aggregate(total=Sum("amount"))["total"] or 0)
    total_revenue = ticket_revenue + manual_revenue

    tickets_qs = Ticket.objects.filter(event_id__in=event_ids).exclude(status__in=["cancelled", "refunded"])
    if period:
        tickets_qs = tickets_qs.filter(created_at__date__gte=start, created_at__date__lt=end)
    total_attendees = tickets_qs.count()

    checkins_qs = CheckIn.objects.filter(event_id__in=event_ids)
    if period:
        checkins_qs = checkins_qs.filter(created_at__date__gte=start, created_at__date__lt=end)
    total_checkins = checkins_qs.count()
    checkin_pct = round((total_checkins / total_attendees * 100) if total_attendees > 0 else 0, 1)

    expenses_qs = Expense.objects.filter(event_id__in=event_ids)
    if period:
        expenses_qs = expenses_qs.filter(date__gte=start, date__lt=end)
    total_expenses = float(expenses_qs.aggregate(total=Sum("amount"))["total"] or 0)

    net_profit = total_revenue - total_expenses

    return {
        "totalEvents": total_events,
        "publishedEvents": published_events,
        "draftEvents": draft_events,
        "totalAttendees": total_attendees,
        "totalCheckins": total_checkins,
        "checkinPercent": checkin_pct,
        "totalRevenue": total_revenue,
        "ticketRevenue": ticket_revenue,
        "manualRevenue": manual_revenue,
        "totalExpenses": total_expenses,
        "netProfit": net_profit,
    }


class OrganizerExpenseListCreateView(generics.ListCreateAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        """Allow organizers to only see expenses for their events."""
        event_id = self.request.query_params.get('event_id')
        if event_id:
            # Check permission: event must belong to this user
            event = generics.get_object_or_404(Event, id=event_id, organizer=self.request.user)
            return Expense.objects.filter(event=event)

        # All expenses for all events of this organizer
        return Expense.objects.filter(event__organizer=self.request.user)

    def perform_create(self, serializer):
        """Ensure the user is authorized for the event they're adding an expense for."""
        event_id = self.request.data.get('event')
        generics.get_object_or_404(Event, id=event_id, organizer=self.request.user)
        serializer.save()


class OrganizerExpenseDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = ExpenseSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Expense.objects.filter(event__organizer=self.request.user)


class OrganizerRevenueListCreateView(generics.ListCreateAPIView):
    serializer_class = RevenueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        event_id = self.request.query_params.get("event_id")
        if event_id:
            event = generics.get_object_or_404(Event, id=event_id, organizer=self.request.user)
            return Revenue.objects.filter(event=event)
        return Revenue.objects.filter(event__organizer=self.request.user)

    def perform_create(self, serializer):
        event_id = self.request.data.get("event")
        generics.get_object_or_404(Event, id=event_id, organizer=self.request.user)
        serializer.save()


class OrganizerRevenueDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = RevenueSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Revenue.objects.filter(event__organizer=self.request.user)


class OrganizerDashboardStatsView(APIView):
    """
    GET /api/finances/dashboard-stats/
    Combined stats for the global organizer dashboard.
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('organizer', 'admin') and not request.user.is_staff:
            raise PermissionDenied("Only organizers can view this dashboard.")

        event_id = request.query_params.get('event_id')
        range_key = request.query_params.get('range')
        apply_range = range_key in ["week", "month", "year"] and not event_id

        events_qs = Event.objects.filter(organizer=request.user)
        if event_id:
            events_qs = events_qs.filter(id=event_id)

        event_ids = list(events_qs.values_list('id', flat=True))
        if not event_ids:
            return Response({"kpis": _build_kpis(events_qs, []), "expenseBreakdown": []})

        period = None
        if apply_range:
            period = _get_period_bounds(range_key)

        kpis = _build_kpis(events_qs, event_ids, period=period)

        expenses_qs = Expense.objects.filter(event_id__in=event_ids)
        if period:
            start, end = period
            expenses_qs = expenses_qs.filter(date__gte=start, date__lt=end)

        expenses_by_cat = list(
            expenses_qs.values('category')
            .annotate(amount=Sum('amount'))
            .order_by('-amount')
        )

        response = {
            "kpis": kpis,
            "expenseBreakdown": expenses_by_cat,
        }

        if apply_range and period:
            prev_period = _get_previous_bounds(range_key, period[0])
            previous_kpis = _build_kpis(events_qs, event_ids, period=prev_period)

            response["previous_kpis"] = previous_kpis
            response["changes"] = {
                "total_events": _percent_change(kpis["totalEvents"], previous_kpis["totalEvents"]),
                "total_attendees": _percent_change(kpis["totalAttendees"], previous_kpis["totalAttendees"]),
                "total_checkins": _percent_change(kpis["totalCheckins"], previous_kpis["totalCheckins"]),
                "total_revenue": _percent_change(kpis["totalRevenue"], previous_kpis["totalRevenue"]),
                "total_expenses": _percent_change(kpis["totalExpenses"], previous_kpis["totalExpenses"]),
                "net_profit": _percent_change(kpis["netProfit"], previous_kpis["netProfit"]),
            }

        return Response(response)


class OrganizerRevenueSeriesView(APIView):
    """
    GET /api/finances/revenue-series/?range=week|month|year
    Returns revenue totals grouped by the selected range.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('organizer', 'admin') and not request.user.is_staff:
            raise PermissionDenied("Only organizers can view this dashboard.")

        range_key = request.query_params.get("range", "month")
        event_id = request.query_params.get("event_id")

        events_qs = Event.objects.filter(organizer=request.user)
        if event_id:
            events_qs = events_qs.filter(id=event_id)
        event_ids = list(events_qs.values_list("id", flat=True))
        if not event_ids:
            return Response([])

        if range_key not in ["week", "month", "year"]:
            range_key = "month"

        start, end = _get_period_bounds(range_key)

        order_rows = (
            Order.objects.filter(
                event_id__in=event_ids,
                status="confirmed",
                created_at__date__gte=start,
                created_at__date__lt=end,
            )
            .annotate(day=TruncDate("created_at"))
            .values("day")
            .annotate(total=Sum("total"))
        )

        revenue_rows = (
            Revenue.objects.filter(
                event_id__in=event_ids,
                date__gte=start,
                date__lt=end,
            )
            .values("date")
            .annotate(total=Sum("amount"))
        )

        totals = {}
        for row in order_rows:
            day = row.get("day")
            if day:
                totals[day] = totals.get(day, 0) + float(row.get("total") or 0)
        for row in revenue_rows:
            day = row.get("date")
            if day:
                totals[day] = totals.get(day, 0) + float(row.get("total") or 0)

        series = []
        if range_key == "week":
            labels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
            for idx, label in enumerate(labels):
                day = start + timedelta(days=idx)
                series.append({"name": label, "revenue": totals.get(day, 0)})
        elif range_key == "year":
            month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
            month_totals = {i + 1: 0 for i in range(12)}
            for day, amount in totals.items():
                if day.year == start.year:
                    month_totals[day.month] += amount
            for month in range(1, 13):
                series.append({"name": month_labels[month - 1], "revenue": month_totals[month]})
        else:
            days_in_month = (end - start).days
            for offset in range(days_in_month):
                day = start + timedelta(days=offset)
                series.append({"name": str(day.day), "revenue": totals.get(day, 0)})

        return Response(series)


class AttendeeSerializer(serializers.ModelSerializer):
    event_title = serializers.CharField(source='event.title', read_only=True)
    ticket_type_name = serializers.CharField(source='ticket_type.name', read_only=True)

    class Meta:
        model = Ticket
        fields = [
            'id', 'attendee_name', 'attendee_email', 'event_title',
            'event_id', 'ticket_type_name', 'status', 'checked_in_at'
        ]


class OrganizerAttendeeListView(generics.ListAPIView):
    """
    GET /api/finances/attendees/
    List of all tickets/attendees for an organizer's events.
    """
    serializer_class = AttendeeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        event_id = self.request.query_params.get('event_id')
        search = self.request.query_params.get('q')

        qs = Ticket.objects.filter(event__organizer=self.request.user)

        if event_id:
            qs = qs.filter(event_id=event_id)

        if search:
            qs = qs.filter(
                Q(attendee_name__icontains=search) |
                Q(attendee_email__icontains=search)
            )

        return qs.select_related('event', 'ticket_type').order_by('-created_at')
