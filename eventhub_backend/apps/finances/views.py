from __future__ import annotations

from datetime import date, timedelta

from django.db.models import Sum, Q, Prefetch
from django.db.models.functions import TruncDate
from django.utils import timezone
from rest_framework import generics, permissions, status, serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.views import APIView

from apps.accounts.access import user_requires_assigned_event_scope
from apps.events.models import Event
from apps.orders.models import Order, Ticket, OrderAnswer, OrderRegistration
from apps.checkin.models import CheckIn
from common.pagination import EventHubPagination
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
    Combined stats for the organizer dashboard (current year window).
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('organizer', 'admin') and not request.user.is_staff:
            raise PermissionDenied("Only organizers can view this dashboard.")
        if user_requires_assigned_event_scope(request.user):
            raise PermissionDenied("This account is limited to assigned event check-in.")

        event_id = request.query_params.get('event_id')
        events_qs = Event.objects.filter(organizer=request.user)
        if event_id:
            events_qs = events_qs.filter(id=event_id)

        event_ids = list(events_qs.values_list('id', flat=True))
        if not event_ids:
            return Response({"kpis": _build_kpis(events_qs, []), "expenseBreakdown": []})

        # Global finance overview is fixed to a yearly window (current calendar year).
        # Event-scoped detail requests keep full-event totals.
        period = None if event_id else _get_period_bounds("year")
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

        if period:
            response["year"] = start.year
            prev_period = _get_previous_bounds("year", period[0])
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
    GET /api/finances/revenue-series/
    Returns monthly revenue totals for the current calendar year.
    """

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if request.user.role not in ('organizer', 'admin') and not request.user.is_staff:
            raise PermissionDenied("Only organizers can view this dashboard.")
        if user_requires_assigned_event_scope(request.user):
            raise PermissionDenied("This account is limited to assigned event check-in.")

        event_id = request.query_params.get("event_id")

        events_qs = Event.objects.filter(organizer=request.user)
        if event_id:
            events_qs = events_qs.filter(id=event_id)
        event_ids = list(events_qs.values_list("id", flat=True))
        if not event_ids:
            return Response([])

        start, end = _get_period_bounds("year")

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
        month_labels = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
        month_totals = {i + 1: 0 for i in range(12)}
        for day, amount in totals.items():
            if day.year == start.year:
                month_totals[day.month] += amount
        for month in range(1, 13):
            series.append({"name": month_labels[month - 1], "revenue": month_totals[month]})

        return Response(series)


class OrganizerAttendeePagination(EventHubPagination):
    page_size = 25
    page_size_query_param = "page_size"
    max_page_size = 100


class AttendeeSerializer(serializers.ModelSerializer):
    RELATIONSHIP_LABELS = {
        "student": "Student",
        "alumni": "Alumni",
        "guest": "Guest",
    }

    event_title = serializers.CharField(source="event.title", read_only=True)
    event_slug = serializers.CharField(source="event.slug", read_only=True)
    event_start_date = serializers.DateField(source="event.start_date", read_only=True)
    event_year = serializers.SerializerMethodField()
    ticket_type_name = serializers.CharField(source="ticket_type.name", read_only=True)
    order_number = serializers.CharField(source="order.order_number", read_only=True)
    order_created_at = serializers.DateTimeField(source="order.created_at", read_only=True)
    attendee_phone = serializers.SerializerMethodField()
    relationship = serializers.SerializerMethodField()
    relationship_label = serializers.SerializerMethodField()
    category_label = serializers.SerializerMethodField()
    course_id = serializers.SerializerMethodField()
    course_name = serializers.SerializerMethodField()
    school_id = serializers.SerializerMethodField()
    school_name = serializers.SerializerMethodField()
    graduation_year = serializers.SerializerMethodField()
    admission_number = serializers.SerializerMethodField()
    student_email = serializers.SerializerMethodField()
    location_text = serializers.SerializerMethodField()
    location_city = serializers.SerializerMethodField()
    location_country = serializers.SerializerMethodField()
    custom_answers = serializers.SerializerMethodField()
    checked_in = serializers.SerializerMethodField()
    attendance_status = serializers.SerializerMethodField()
    ticket_status = serializers.CharField(source="status", read_only=True)
    payment_method = serializers.CharField(source="order.payment_method", read_only=True)
    order_total = serializers.DecimalField(source="order.total", max_digits=10, decimal_places=2, read_only=True)

    class Meta:
        model = Ticket
        fields = [
            "id",
            "attendee_name",
            "attendee_email",
            "attendee_phone",
            "event_title",
            "event_slug",
            "event_start_date",
            "event_year",
            "event_id",
            "ticket_type_name",
            "order_number",
            "order_created_at",
            "status",
            "ticket_status",
            "checked_in_at",
            "checked_in",
            "attendance_status",
            "relationship",
            "relationship_label",
            "category_label",
            "course_id",
            "course_name",
            "school_id",
            "school_name",
            "graduation_year",
            "admission_number",
            "student_email",
            "location_text",
            "location_city",
            "location_country",
            "payment_method",
            "order_total",
            "custom_answers",
        ]

    def _registration(self, obj):
        order = getattr(obj, "order", None)
        return getattr(order, "registration", None)

    def _checked_in(self, obj) -> bool:
        return bool(obj.checked_in_at) or obj.status == "used"

    def _relationship_label_from_value(self, value: str) -> str:
        if not value:
            return "Uncategorized"
        return self.RELATIONSHIP_LABELS.get(value, value.replace("_", " ").title())

    def get_event_year(self, obj):
        event = getattr(obj, "event", None)
        return event.start_date.year if event and event.start_date else None

    def get_attendee_phone(self, obj):
        order = getattr(obj, "order", None)
        return (getattr(order, "attendee_phone", "") or "").strip()

    def get_relationship(self, obj):
        registration = self._registration(obj)
        return (getattr(registration, "category", "") or "").strip().lower()

    def get_relationship_label(self, obj):
        relationship = self.get_relationship(obj)
        return self._relationship_label_from_value(relationship)

    def get_category_label(self, obj):
        registration = self._registration(obj)
        if not registration:
            return ""
        category_label = (registration.category_label or "").strip()
        if category_label:
            return category_label
        return self._relationship_label_from_value((registration.category or "").strip().lower())

    def get_course_id(self, obj):
        registration = self._registration(obj)
        return str(registration.course_id) if registration and registration.course_id else None

    def get_course_name(self, obj):
        registration = self._registration(obj)
        course = getattr(registration, "course", None)
        return course.name if course else ""

    def get_school_id(self, obj):
        registration = self._registration(obj)
        return str(registration.school_id) if registration and registration.school_id else None

    def get_school_name(self, obj):
        registration = self._registration(obj)
        school = getattr(registration, "school", None)
        return school.name if school else ""

    def get_graduation_year(self, obj):
        registration = self._registration(obj)
        return registration.graduation_year if registration else None

    def get_admission_number(self, obj):
        registration = self._registration(obj)
        return (registration.admission_number or "").strip() if registration else ""

    def get_student_email(self, obj):
        registration = self._registration(obj)
        return (registration.student_email or "").strip() if registration else ""

    def get_location_text(self, obj):
        registration = self._registration(obj)
        return (registration.location_text or "").strip() if registration else ""

    def get_location_city(self, obj):
        registration = self._registration(obj)
        return (registration.location_city or "").strip() if registration else ""

    def get_location_country(self, obj):
        registration = self._registration(obj)
        return (registration.location_country or "").strip() if registration else ""

    def get_custom_answers(self, obj):
        registration = self._registration(obj)
        if not registration:
            return []
        answers = []
        for answer in registration.answers.all():
            value = (answer.value or "").strip()
            if not value:
                continue
            question = getattr(answer, "question", None)
            answers.append(
                {
                    "question_id": str(question.id) if question else None,
                    "question": question.label if question else "Custom question",
                    "field_type": question.field_type if question else "",
                    "value": value,
                }
            )
        return answers

    def get_checked_in(self, obj):
        return self._checked_in(obj)

    def get_attendance_status(self, obj):
        return "checked_in" if self._checked_in(obj) else "not_checked_in"


class OrganizerAttendeeListView(generics.ListAPIView):
    """
    GET /api/finances/attendees/
    List of all tickets/attendees for an organizer's events.
    """
    serializer_class = AttendeeSerializer
    permission_classes = [permissions.IsAuthenticated]
    pagination_class = OrganizerAttendeePagination

    def _safe_int(self, value):
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    def _base_events_queryset(self):
        events_qs = Event.objects.filter(organizer=self.request.user)
        year = self._safe_int(self.request.query_params.get("year"))
        if year:
            events_qs = events_qs.filter(start_date__year=year)
        return events_qs

    def _build_filter_options(self):
        organizer_events = Event.objects.filter(organizer=self.request.user)
        available_years = sorted(
            {year for year in organizer_events.values_list("start_date__year", flat=True) if year},
            reverse=True,
        )

        scoped_events = self._base_events_queryset()
        event_options = [
            {
                "id": str(row["id"]),
                "title": row["title"],
                "year": row["start_date"].year if row.get("start_date") else None,
            }
            for row in scoped_events.values("id", "title", "start_date").order_by("-start_date", "title")
        ]

        registrations = OrderRegistration.objects.filter(order__event__organizer=self.request.user)
        year = self._safe_int(self.request.query_params.get("year"))
        if year:
            registrations = registrations.filter(order__event__start_date__year=year)

        courses = [
            {"id": str(row["course_id"]), "name": row["course__name"]}
            for row in registrations.exclude(course__isnull=True)
            .values("course_id", "course__name")
            .distinct()
            .order_by("course__name")
        ]
        schools = [
            {"id": str(row["school_id"]), "name": row["school__name"]}
            for row in registrations.exclude(school__isnull=True)
            .values("school_id", "school__name")
            .distinct()
            .order_by("school__name")
        ]
        graduation_years = list(
            registrations.exclude(graduation_year__isnull=True)
            .values_list("graduation_year", flat=True)
            .distinct()
            .order_by("-graduation_year")
        )

        relationships = []
        for category in (
            registrations.exclude(category__isnull=True)
            .exclude(category="")
            .values_list("category", flat=True)
            .distinct()
            .order_by("category")
        ):
            relationships.append(
                {
                    "value": category,
                    "label": AttendeeSerializer.RELATIONSHIP_LABELS.get(
                        category, category.replace("_", " ").title()
                    ),
                }
            )

        ticket_statuses = [{"value": value, "label": label} for value, label in Ticket.STATUS_CHOICES]

        return {
            "events": event_options,
            "years": available_years,
            "courses": courses,
            "schools": schools,
            "graduation_years": graduation_years,
            "relationships": relationships,
            "attendance_statuses": [
                {"value": "checked_in", "label": "Checked In"},
                {"value": "not_checked_in", "label": "Not Checked In"},
            ],
            "ticket_statuses": ticket_statuses,
        }

    def list(self, request, *args, **kwargs):
        queryset = self.filter_queryset(self.get_queryset())
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            response = self.get_paginated_response(serializer.data)
        else:
            serializer = self.get_serializer(queryset, many=True)
            response = Response(serializer.data)

        response.data["filters"] = self._build_filter_options()
        response.data["non_deletable"] = True
        return response

    def get_queryset(self):
        if self.request.user.role not in ("organizer", "admin") and not self.request.user.is_staff:
            raise PermissionDenied("Only organizers can view attendees.")
        if user_requires_assigned_event_scope(self.request.user):
            raise PermissionDenied("This account is limited to assigned event check-in.")

        event_id = self.request.query_params.get("event_id")
        search = (self.request.query_params.get("q") or "").strip()
        course_id = self.request.query_params.get("course_id")
        school_id = self.request.query_params.get("school_id")
        graduation_year = self._safe_int(self.request.query_params.get("graduation_year"))
        year = self._safe_int(self.request.query_params.get("year"))
        relationship = (
            self.request.query_params.get("relationship")
            or self.request.query_params.get("category")
            or ""
        ).strip().lower()
        attendance_status = (self.request.query_params.get("attendance_status") or "").strip().lower()
        ticket_status = (self.request.query_params.get("ticket_status") or "").strip().lower()

        qs = (
            Ticket.objects.filter(event__organizer=self.request.user)
            .select_related(
                "event",
                "ticket_type",
                "order",
                "order__registration",
                "order__registration__course",
                "order__registration__school",
            )
            .prefetch_related(
                Prefetch(
                    "order__registration__answers",
                    queryset=OrderAnswer.objects.select_related("question").order_by(
                        "question__sort_order", "created_at"
                    ),
                )
            )
        )

        if event_id:
            qs = qs.filter(event_id=event_id)

        if year:
            qs = qs.filter(event__start_date__year=year)

        if graduation_year is not None:
            qs = qs.filter(order__registration__graduation_year=graduation_year)

        if course_id:
            qs = qs.filter(order__registration__course_id=course_id)

        if school_id:
            qs = qs.filter(order__registration__school_id=school_id)

        if relationship in {"student", "alumni", "guest", "uncategorized"}:
            if relationship == "uncategorized":
                qs = qs.filter(Q(order__registration__category__isnull=True) | Q(order__registration__category=""))
            else:
                qs = qs.filter(order__registration__category=relationship)

        checked_in_states = {"checked_in", "checked-in", "present", "attended", "yes", "true", "1"}
        not_checked_in_states = {"not_checked_in", "not-checked-in", "absent", "no", "false", "0"}
        if attendance_status in checked_in_states:
            qs = qs.filter(Q(checked_in_at__isnull=False) | Q(status="used"))
        elif attendance_status in not_checked_in_states:
            qs = qs.exclude(Q(checked_in_at__isnull=False) | Q(status="used"))

        valid_ticket_statuses = {choice[0] for choice in Ticket.STATUS_CHOICES}
        if ticket_status in valid_ticket_statuses:
            qs = qs.filter(status=ticket_status)

        if search:
            qs = qs.filter(
                Q(attendee_name__icontains=search)
                | Q(attendee_email__icontains=search)
                | Q(order__order_number__icontains=search)
                | Q(order__attendee_phone__icontains=search)
                | Q(order__registration__admission_number__icontains=search)
                | Q(order__registration__student_email__icontains=search)
                | Q(order__registration__course__name__icontains=search)
                | Q(order__registration__school__name__icontains=search)
            )

        return qs.order_by("-created_at")
