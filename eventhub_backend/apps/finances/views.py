from django.db.models import Sum, Count, Q
from rest_framework import generics, permissions, status, serializers
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.exceptions import PermissionDenied

from apps.events.models import Event
from apps.orders.models import Order, Ticket
from apps.checkin.models import CheckIn
from .models import Expense, Revenue
from .serializers import ExpenseSerializer, RevenueSerializer


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
        if request.user.role != 'organizer' and not request.user.is_staff:
            raise PermissionDenied("Only organizers can view this dashboard.")

        event_id = request.query_params.get('event_id')
        events_qs = Event.objects.filter(organizer=request.user)

        # Base filters
        if event_id:
            events_qs = events_qs.filter(id=event_id)
            orders_filter = Q(event_id=event_id)
            tickets_filter = Q(order__event_id=event_id)
            checkins_filter = Q(event_id=event_id)
            expenses_filter = Q(event_id=event_id)
        else:
            event_ids = events_qs.values_list('id', flat=True)
            orders_filter = Q(event_id__in=event_ids)
            tickets_filter = Q(order__event_id__in=event_ids)
            checkins_filter = Q(event_id__in=event_ids)
            expenses_filter = Q(event_id__in=event_ids)

        # KPIs
        total_events = events_qs.count()
        published_events = events_qs.filter(status='published').count()
        draft_events = events_qs.filter(status='draft').count()

        confirmed_orders = Order.objects.filter(orders_filter, status='confirmed')
        ticket_revenue = float(confirmed_orders.aggregate(rev=Sum('total'))['rev'] or 0)
        manual_revenue = float(Revenue.objects.filter(expenses_filter).aggregate(total=Sum("amount"))["total"] or 0)
        total_revenue = ticket_revenue + manual_revenue
        
        # Valid tickets
        all_tickets = Ticket.objects.filter(tickets_filter, status='valid')
        total_attendees = all_tickets.count()
        
        # Check-ins
        total_checkins = CheckIn.objects.filter(checkins_filter).count()
        checkin_pct = round((total_checkins / total_attendees * 100) if total_attendees > 0 else 0, 1)

        # Expenses
        total_expenses = float(Expense.objects.filter(expenses_filter).aggregate(total=Sum('amount'))['total'] or 0)
        net_profit = total_revenue - total_expenses

        # Category Breakdown
        expenses_by_cat = list(
            Expense.objects.filter(expenses_filter)
            .values('category')
            .annotate(amount=Sum('amount'))
            .order_by('-amount')
        )

        return Response({
            "kpis": {
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
            },
            "expenseBreakdown": expenses_by_cat,
        })


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
