
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  Mic2,
  Tent,
  Monitor,
  Truck,
  TrendingUp,
  Receipt,
  MoreHorizontal,
  Ticket,
  X,
  DollarSign,
  QrCode,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PageWrapper from '../components/layout/PageWrapper';
import OrganizerSidebar from '../components/organizer/OrganizerSidebar';
import OrganizerMobileNav from '../components/organizer/OrganizerMobileNav';
import OrganizerHeader from '../components/organizer/OrganizerHeader';
import OrganizerDashboardOverview from './organizer/Dashboard';
import OrganizerMyEvents from './organizer/MyEvents';
import OrganizerEventDetail from './organizer/EventDetail';
import OrganizerSettings from './organizer/Settings';
import { api } from '../lib/apiClient';
import { fetchEvent } from '../lib/eventsApi';
import { Toaster } from '@/components/ui/sonner';
import { toast } from 'sonner';

const EXPENSE_CATEGORIES = [
  { id: 'speakers', label: 'Speakers', icon: Mic2, color: '#7C3AED' },
  { id: 'mc', label: 'MC / Host', icon: Mic2, color: '#EC4899' },
  { id: 'venue', label: 'Venue / Tent', icon: Tent, color: '#C58B1A' },
  { id: 'equipment', label: 'Equipment Hire', icon: Monitor, color: '#06B6D4' },
  { id: 'transport', label: 'Transport / Logistics', icon: Truck, color: '#10B981' },
  { id: 'marketing', label: 'Marketing', icon: TrendingUp, color: '#EF4444' },
  { id: 'catering', label: 'Catering', icon: Receipt, color: '#F97316' },
  { id: 'other', label: 'Other', icon: MoreHorizontal, color: '#64748B' },
];

const REVENUE_SOURCES = [
  { id: 'ticket_sales', backend: 'ticket_sales', label: 'Ticket Sales (Auto)', icon: Ticket, color: '#1E4DB7', auto: true },
  { id: 'sponsorship', backend: 'sponsorship', label: 'Sponsorship', icon: TrendingUp, color: '#16A34A' },
  { id: 'vendor', backend: 'vendor', label: 'Vendor Booth', icon: Tent, color: '#0EA5E9' },
  { id: 'donation', backend: 'donation', label: 'Donation', icon: DollarSign, color: '#7C3AED' },
  { id: 'grant', backend: 'other', label: 'Grant', icon: Receipt, color: '#C58B1A' },
  { id: 'merchandise', backend: 'other', label: 'Merchandise', icon: Receipt, color: '#EC4899' },
  { id: 'custom', backend: 'other', label: 'Custom', icon: MoreHorizontal, color: '#64748B', custom: true },
];

const EMPTY_STATS = {
  totalEvents: 0,
  publishedEvents: 0,
  draftEvents: 0,
  totalAttendees: 0,
  totalCheckins: 0,
  checkinPercent: 0,
  totalRevenue: 0,
  totalExpenses: 0,
  netProfit: 0,
};

const apiList = (value) => (Array.isArray(value) ? value : value?.results || []);
const formatDate = (value) => {
  if (!value) return 'Date not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not set';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const resolveStatus = (event) => {
  const raw = event.status || (event.is_published ? 'published' : 'draft');
  if (raw === 'draft') return 'draft';
  if (raw === 'completed') return 'completed';
  const eventDate = new Date(event.start_date || event.date || event.startDate || '');
  if (!Number.isNaN(eventDate.getTime())) {
    const today = new Date();
    const isSameDay = eventDate.toDateString() === today.toDateString();
    if (eventDate < today && !isSameDay) return 'completed';
    if (isSameDay) return 'live';
  }
  return raw === 'published' ? 'upcoming' : raw;
};

const parseDateValue = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildRevenueSeriesFromEntries = (entries, range) => {
  const now = new Date();
  const buckets = [];
  const values = new Map();

  const addValue = (label, amount) => {
    values.set(label, (values.get(label) || 0) + amount);
  };

  if (range === 'year') {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    months.forEach((label) => buckets.push(label));
    entries.forEach((entry) => {
      const date = parseDateValue(entry.date || entry.created_at || entry.created || entry.recorded_at);
      if (!date || date.getFullYear() !== now.getFullYear()) return;
      addValue(months[date.getMonth()], Number(entry.amount || entry.revenue || 0));
    });
  } else if (range === 'week') {
    const start = new Date(now);
    const day = start.getDay() || 7;
    start.setDate(start.getDate() - (day - 1));
    const labels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    labels.forEach((label) => buckets.push(label));
    entries.forEach((entry) => {
      const date = parseDateValue(entry.date || entry.created_at || entry.created || entry.recorded_at);
      if (!date) return;
      const diffDays = Math.floor((date - start) / (1000 * 60 * 60 * 24));
      if (diffDays < 0 || diffDays > 6) return;
      addValue(labels[diffDays], Number(entry.amount || entry.revenue || 0));
    });
  } else {
    const year = now.getFullYear();
    const month = now.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    for (let i = 1; i <= daysInMonth; i += 1) {
      buckets.push(String(i));
    }
    entries.forEach((entry) => {
      const date = parseDateValue(entry.date || entry.created_at || entry.created || entry.recorded_at);
      if (!date || date.getFullYear() !== year || date.getMonth() !== month) return;
      addValue(String(date.getDate()), Number(entry.amount || entry.revenue || 0));
    });
  }

  return buckets.map((label) => ({ name: label, revenue: values.get(label) || 0 }));
};

const normalizeRevenueSeries = (data) => {
  if (!data) return [];
  const list = Array.isArray(data) ? data : data?.results || data?.series || data?.data || [];
  if (!Array.isArray(list)) return [];
  return list.map((item) => ({
    name: item.name || item.label || item.period || item.date || item.day || '',
    revenue: Number(item.revenue ?? item.amount ?? item.value ?? 0),
  }));
};

const extractPercentValue = (value) => {
  if (value === null || value === undefined) return null;
  if (typeof value === 'object') {
    return extractPercentValue(
      value.percent ?? value.percentage ?? value.change ?? value.delta ?? null
    );
  }
  if (typeof value === 'string') {
    const numeric = Number(value.replace('%', '').trim());
    if (Number.isNaN(numeric)) return null;
    return numeric;
  }
  const numeric = Number(value);
  if (Number.isNaN(numeric)) return null;
  if (Math.abs(numeric) > 0 && Math.abs(numeric) < 1) return numeric * 100;
  return numeric;
};

const computePercentChange = (current, previous) => {
  const currentNum = Number(current);
  const previousNum = Number(previous);
  if (Number.isNaN(currentNum) || Number.isNaN(previousNum) || previousNum === 0) return null;
  return ((currentNum - previousNum) / previousNum) * 100;
};

const buildStatChanges = (statsData) => {
  if (!statsData) return {};
  const kpis = statsData.kpis || statsData.stats || statsData || {};
  const deltas = statsData.changes || statsData.deltas || statsData.trends || statsData.percent_changes || {};
  const previous = statsData.previous_kpis || statsData.previous || statsData.prior || statsData.comparison || {};

  const buildChange = (deltaKey, currentKey, snakeKey) => (
    extractPercentValue(deltas[deltaKey]) ??
    extractPercentValue(deltas[currentKey]) ??
    extractPercentValue(deltas[snakeKey]) ??
    computePercentChange(kpis[currentKey] ?? kpis[snakeKey], previous[currentKey] ?? previous[snakeKey])
  );

  return {
    totalEvents: buildChange('total_events', 'totalEvents', 'total_events'),
    totalAttendees: buildChange('total_attendees', 'totalAttendees', 'total_attendees'),
    totalCheckins: buildChange('total_checkins', 'totalCheckins', 'total_checkins'),
    totalRevenue: buildChange('total_revenue', 'totalRevenue', 'total_revenue'),
    totalExpenses: buildChange('total_expenses', 'totalExpenses', 'total_expenses'),
    netProfit: buildChange('net_profit', 'netProfit', 'net_profit'),
  };
};

const normalizeStats = (stats) => ({
  totalEvents: stats?.totalEvents ?? stats?.total_events ?? 0,
  publishedEvents: stats?.publishedEvents ?? stats?.published_events ?? 0,
  draftEvents: stats?.draftEvents ?? stats?.draft_events ?? 0,
  totalAttendees: stats?.totalAttendees ?? stats?.total_attendees ?? 0,
  totalCheckins: stats?.totalCheckins ?? stats?.total_checkins ?? 0,
  checkinPercent: stats?.checkinPercent ?? stats?.checkin_percent ?? 0,
  totalRevenue: stats?.totalRevenue ?? stats?.total_revenue ?? 0,
  totalExpenses: stats?.totalExpenses ?? stats?.total_expenses ?? 0,
  netProfit: stats?.netProfit ?? stats?.net_profit ?? 0,
});

const normalizeEvent = (event) => {
  const category = event.category?.name || event.category_name || event.category || 'General';
  const date = event.start_date || event.date || '';
  const time = event.start_time || event.time || '';
  const endTime = event.end_time || event.endTime || '';
  const location = event.venue_name
    ? `${event.venue_name}${event.city ? `, ${event.city}` : ''}`
    : event.location || event.city || 'Online';
  const address = event.venue_address || event.address || '';
  const ticketsSold = event.tickets_sold || event.attendee_count || event.attendeeCount || 0;
  const totalTickets = event.capacity || event.total_tickets || event.totalTickets || 0;
  const revenue = event.revenue || event.total_revenue || 0;
  const image = event.cover_image || event.banner_image || event.image || event.coverImage || '';
  return {
    id: event.id,
    slug: event.slug,
    name: event.title || event.name || 'Untitled Event',
    description: event.description || '',
    date: formatDate(date),
    time,
    endTime,
    location,
    address,
    status: resolveStatus(event),
    ticketsSold,
    totalTickets,
    revenue,
    image,
    category,
  };
};
const OrganizerDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [currentPage, setCurrentPage] = useState('dashboard');
  const [selectedEventId, setSelectedEventId] = useState('');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [revenueRange, setRevenueRange] = useState('month');
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [entryView, setEntryView] = useState('all');
  const [expenseForm, setExpenseForm] = useState({ event: '', description: '', amount: '', category: 'speakers' });
  const [revenueForm, setRevenueForm] = useState({ event: '', description: '', amount: '', source: 'sponsorship' });
  const [customRevenueSource, setCustomRevenueSource] = useState('');

  const hasAccess = user && (user.role === 'organizer' || user.role === 'admin');

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (!tab) return;
    const allowed = ['dashboard', 'events', 'checkin', 'create', 'settings'];
    if (allowed.includes(tab)) {
      setCurrentPage(tab);
    }
  }, [location.search]);

  const { data: eventsData } = useQuery({
    queryKey: ['organizer_events'],
    queryFn: async () => {
      const data = await api.get('/api/events/organizer/');
      return apiList(data);
    },
    enabled: !!hasAccess,
    staleTime: 5 * 60 * 1000,
  });

  const rawEvents = eventsData || [];
  const events = useMemo(() => rawEvents.map(normalizeEvent), [rawEvents]);

  const selectedEvent = useMemo(
    () => events.find((eventItem) => String(eventItem.id) === String(selectedEventId)),
    [events, selectedEventId]
  );

  const { data: eventDetailData } = useQuery({
    queryKey: ['organizer_event_detail', selectedEvent?.slug],
    queryFn: () => fetchEvent(selectedEvent.slug),
    enabled: !!selectedEvent?.slug,
    staleTime: 2 * 60 * 1000,
  });

  const { data: globalStatsData, isLoading: isLoadingGlobalStats } = useQuery({
    queryKey: ['dashboard_stats', 'all', revenueRange],
    queryFn: () => api.get(`/api/finances/dashboard-stats/?range=${revenueRange}`),
    enabled: !!hasAccess,
    staleTime: 5 * 60 * 1000,
  });

  const { data: eventStatsData, isLoading: isLoadingEventStats } = useQuery({
    queryKey: ['dashboard_stats', selectedEventId],
    queryFn: () => api.get(`/api/finances/dashboard-stats/?event_id=${selectedEventId}`),
    enabled: !!hasAccess && !!selectedEventId,
    staleTime: 60 * 1000,
  });

  const { data: eventAttendeesData, isLoading: isLoadingEventAttendees } = useQuery({
    queryKey: ['event_attendees', selectedEventId],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('event_id', selectedEventId);
      const data = await api.get(`/api/finances/attendees/?${params.toString()}`);
      return apiList(data);
    },
    enabled: !!hasAccess && !!selectedEventId,
    staleTime: 60 * 1000,
  });

  const { data: eventExpensesData, isLoading: isLoadingEventExpenses } = useQuery({
    queryKey: ['event_expenses', selectedEventId],
    queryFn: async () => {
      const data = await api.get(`/api/finances/expenses/?event_id=${selectedEventId}`);
      return apiList(data);
    },
    enabled: !!hasAccess && !!selectedEventId,
    staleTime: 60 * 1000,
  });

  const { data: eventRevenuesData, isLoading: isLoadingEventRevenues } = useQuery({
    queryKey: ['event_revenues', selectedEventId],
    queryFn: async () => {
      const data = await api.get(`/api/finances/revenues/?event_id=${selectedEventId}`);
      return apiList(data);
    },
    enabled: !!hasAccess && !!selectedEventId,
    staleTime: 60 * 1000,
  });

  const overviewStats = normalizeStats(globalStatsData?.kpis || globalStatsData || EMPTY_STATS);
  const statsChanges = buildStatChanges(globalStatsData);
  const selectedStats = normalizeStats(eventStatsData?.kpis || eventStatsData || EMPTY_STATS);
  const eventAttendees = eventAttendeesData || [];
  const eventExpenses = eventExpensesData || [];
  const eventRevenues = eventRevenuesData || [];

  const { data: revenueSeriesData } = useQuery({
    queryKey: ['dashboard_revenue_series', revenueRange],
    queryFn: async () => {
      try {
        const data = await api.get(`/api/finances/revenue-series/?range=${revenueRange}`);
        return apiList(data);
      } catch (err) {
        try {
          const allRevenues = await api.get('/api/finances/revenues/');
          return buildRevenueSeriesFromEntries(apiList(allRevenues), revenueRange);
        } catch {
          return [];
        }
      }
    },
    enabled: !!hasAccess,
    staleTime: 60 * 1000,
  });

  const normalizedRevenueSeries = useMemo(
    () => normalizeRevenueSeries(revenueSeriesData),
    [revenueSeriesData]
  );

  useEffect(() => {
    if (!selectedEvent) return;
    setExpenseForm((prev) => ({ ...prev, event: String(selectedEvent.id) }));
    setRevenueForm((prev) => ({ ...prev, event: String(selectedEvent.id) }));
  }, [selectedEvent]);

  const addExpenseMutation = useMutation({
    mutationFn: async (payload) => api.post('/api/finances/expenses/', payload),
    onSuccess: () => {
      toast.success('Expense added.');
      setShowExpenseForm(false);
      setExpenseForm((prev) => ({ ...prev, description: '', amount: '' }));
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      queryClient.invalidateQueries({ queryKey: ['event_expenses'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to add expense.');
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/finances/expenses/${id}/`),
    onSuccess: () => {
      toast.success('Expense deleted.');
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      queryClient.invalidateQueries({ queryKey: ['event_expenses'] });
    },
    onError: () => {
      toast.error('Failed to delete expense.');
    },
  });

  const addRevenueMutation = useMutation({
    mutationFn: async (payload) => api.post('/api/finances/revenues/', payload),
    onSuccess: () => {
      toast.success('Revenue added.');
      setShowRevenueForm(false);
      setRevenueForm((prev) => ({ ...prev, description: '', amount: '', source: 'sponsorship' }));
      setCustomRevenueSource('');
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      queryClient.invalidateQueries({ queryKey: ['event_revenues'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to add revenue.');
    },
  });

  const deleteRevenueMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/finances/revenues/${id}/`),
    onSuccess: () => {
      toast.success('Revenue deleted.');
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      queryClient.invalidateQueries({ queryKey: ['event_revenues'] });
    },
    onError: () => {
      toast.error('Failed to delete revenue.');
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventItem) => {
      const identifier = eventItem?.slug || eventItem?.id;
      if (!identifier) throw new Error('Missing event identifier');
      return api.delete(`/api/events/${identifier}/`);
    },
    onSuccess: () => {
      toast.success('Event deleted.');
      queryClient.invalidateQueries({ queryKey: ['organizer_events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    },
    onError: (error) => {
      toast.error(error?.message || 'Failed to delete event.');
    },
  });

  const revenueBreakdownTotals = eventRevenues.reduce((acc, item) => {
    const key = item.source || 'other';
    acc[key] = (acc[key] || 0) + Number(item.amount || 0);
    return acc;
  }, {});

  const revenueSourceLabel = (value) => {
    const labels = {
      ticket_sales: 'Ticket Sales',
      sponsorship: 'Sponsorship',
      vendor: 'Vendor Booth',
      donation: 'Donation',
      other: 'Other',
    };
    return labels[value] || value || 'Other';
  };

  const revenueBreakdown = Object.entries(revenueBreakdownTotals).map(([source, amount]) => ({
    source,
    label: revenueSourceLabel(source),
    amount,
  }));

  const openEventDetail = (eventItem) => {
    setSelectedEventId(String(eventItem.id));
    setCurrentPage('event-detail');
  };

  const handleBackToEvents = () => {
    setCurrentPage('events');
  };

  const handleEditEvent = () => {
    if (!selectedEvent?.slug) return;
    navigate(`/edit-event/${selectedEvent.slug}`);
  };

  const handleCreateEvent = () => {
    navigate('/create-event');
  };


  const openCheckinForEvent = (eventItem) => {
    if (!eventItem?.slug) {
      toast.error('Select a valid event to start check-in.');
      return;
    }
    navigate(`/organizer/events/${eventItem.slug}/checkin`);
  };

  const handlePageChange = (page) => {
    if (page === 'create') {
      navigate('/create-event');
      return;
    }
    if (page === 'checkin') {
      setCurrentPage('events');
      toast.info('Select an event to start check-in.');
      return;
    }
    setCurrentPage(page);
  };

  const selectedRevenueSource = REVENUE_SOURCES.find((item) => item.id === revenueForm.source) || REVENUE_SOURCES[1];
  const revenueNeedsCustomLabel = Boolean(selectedRevenueSource?.custom);
  const revenueSubmitDisabled =
    !revenueForm.event ||
    !revenueForm.description ||
    !revenueForm.amount ||
    Boolean(selectedRevenueSource?.auto) ||
    (revenueNeedsCustomLabel && !customRevenueSource.trim());

  const submitRevenueEntry = () => {
    if (revenueSubmitDisabled) return;
    const customLabel = customRevenueSource.trim();
    const description = revenueForm.description.trim();
    const payload = {
      event: revenueForm.event,
      source: selectedRevenueSource.backend,
      description: revenueNeedsCustomLabel ? `${customLabel}: ${description}` : description,
      amount: Number(revenueForm.amount),
    };
    addRevenueMutation.mutate(payload);
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Dashboard';
      case 'events':
        return 'My Events';
      case 'event-detail':
        return selectedEvent?.name || 'Event Details';
      case 'checkin':
        return 'Check-in';
      case 'create':
        return 'Create Event';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  if (!hasAccess) {
    return (
      <PageWrapper>
        <div className="text-center py-20 px-4">
          <AlertCircle className="w-12 h-12 text-[#DC2626] mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-[#0F172A]">Access Denied</h2>
          <p className="text-[#64748B] mt-2">You must be an organizer to view this page.</p>
        </div>
      </PageWrapper>
    );
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return (
          <OrganizerDashboardOverview
            events={events}
            stats={overviewStats}
            statChanges={statsChanges}
            onEventClick={openEventDetail}
            onViewAll={() => setCurrentPage('events')}
            isLoadingStats={isLoadingGlobalStats}
            revenueSeries={normalizedRevenueSeries}
            range={revenueRange}
            onRangeChange={setRevenueRange}
          />
        );
      case 'events':
        return (
          <OrganizerMyEvents
            events={events}
            onEventClick={openEventDetail}
            onCreateEvent={handleCreateEvent}
            onEditEvent={(eventItem) => navigate(`/edit-event/${eventItem.slug}`)}
            onDeleteEvent={(eventItem) => deleteEventMutation.mutate(eventItem)}
            onCheckInEvent={openCheckinForEvent}
          />
        );
      case 'event-detail':
        return selectedEvent ? (
          <OrganizerEventDetail
            event={selectedEvent}
            eventDetail={eventDetailData}
            eventStats={selectedStats}
            attendees={eventAttendees}
            attendeesLoading={isLoadingEventAttendees}
            onBack={handleBackToEvents}
            onCheckIn={() => openCheckinForEvent(selectedEvent)}
            onEditEvent={handleEditEvent}
            onOpenExpense={() => setShowExpenseForm(true)}
            onOpenRevenue={() => setShowRevenueForm(true)}
            revenueBreakdown={revenueBreakdown}
            entryView={entryView}
            setEntryView={setEntryView}
            eventExpenses={eventExpenses}
            eventRevenues={eventRevenues}
            isLoadingEventExpenses={isLoadingEventExpenses}
            isLoadingEventRevenues={isLoadingEventRevenues}
            onDeleteExpense={(id) => deleteExpenseMutation.mutate(id)}
            onDeleteRevenue={(id) => deleteRevenueMutation.mutate(id)}
            onRefreshEvent={() => queryClient.invalidateQueries({ queryKey: ['organizer_event_detail', selectedEvent?.slug] })}
          />
        ) : null;
      case 'checkin':
        return (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-sm text-gray-600 bg-white border border-[#E2E8F0] rounded-xl px-4 py-3">
              <QrCode className="w-4 h-4 text-[#C58B1A]" />
              Choose an event below to open the check-in screen.
            </div>
            <OrganizerMyEvents
              events={events}
              onEventClick={openEventDetail}
              onCreateEvent={handleCreateEvent}
              onEditEvent={(eventItem) => navigate(`/edit-event/${eventItem.slug}`)}
              onDeleteEvent={(eventItem) => deleteEventMutation.mutate(eventItem)}
              onCheckInEvent={openCheckinForEvent}
            />
          </div>
        );
      case 'settings':
        return <OrganizerSettings events={events} />;
      default:
        return null;
    }
  };

  return (
    <PageWrapper className="bg-[#F8FAFC]">
      <div className="min-h-screen flex">
        <div className="hidden lg:block">
          <OrganizerSidebar currentPage={currentPage} onPageChange={handlePageChange} />
        </div>

        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <div className={`lg:hidden fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
          <OrganizerMobileNav
            currentPage={currentPage}
            onPageChange={(page) => {
              handlePageChange(page);
              setSidebarOpen(false);
            }}
            onClose={() => setSidebarOpen(false)}
          />
        </div>

        <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
          <OrganizerHeader
            title={getPageTitle()}
            onMenuClick={() => setSidebarOpen(true)}
            showMenu
          />
          <div className="h-16 shrink-0" />

          <main className="flex-1 p-4 lg:p-6 overflow-auto">
            <div className="max-w-7xl mx-auto">{renderPage()}</div>
          </main>
        </div>
        <Toaster position="top-right" />
      </div>

      {showExpenseForm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowExpenseForm(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-[#B91C1C] px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-semibold">Add Expense</h3>
              <button onClick={() => setShowExpenseForm(false)} className="p-1 rounded-full hover:bg-white/20">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5">Event *</label>
                <select
                  value={expenseForm.event}
                  onChange={(event) => setExpenseForm((prev) => ({ ...prev, event: event.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                >
                  <option value="">Select event...</option>
                  {events.map((eventItem) => (
                    <option key={eventItem.id} value={eventItem.id}>{eventItem.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5">Category *</label>
                <div className="grid grid-cols-4 gap-2">
                  {EXPENSE_CATEGORIES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setExpenseForm((prev) => ({ ...prev, category: item.id }))}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-center ${
                        expenseForm.category === item.id
                          ? 'border-[#7C3AED] bg-purple-50'
                          : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                      }`}
                    >
                      {item.icon && <item.icon className="w-4 h-4" style={{ color: item.color }} />}
                      <span className="text-[8px] font-medium text-[#64748B] leading-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5">Description *</label>
                <input
                  type="text"
                  value={expenseForm.description}
                  onChange={(event) => setExpenseForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="e.g., DJ equipment rental"
                  className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5">Amount (KES) *</label>
                <input
                  type="number"
                  value={expenseForm.amount}
                  onChange={(event) => setExpenseForm((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                />
              </div>

              <button
                type="button"
                onClick={() => {
                  if (!expenseForm.event || !expenseForm.description || !expenseForm.amount) return;
                  addExpenseMutation.mutate({
                    event: expenseForm.event,
                    category: expenseForm.category,
                    description: expenseForm.description,
                    amount: Number(expenseForm.amount),
                  });
                }}
                disabled={!expenseForm.event || !expenseForm.description || !expenseForm.amount}
                className="w-full py-3 bg-[#B91C1C] hover:bg-[#991B1B] text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Add Expense
              </button>
            </div>
          </div>
        </div>
      )}

      {showRevenueForm && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowRevenueForm(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-[#C58B1A] px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-semibold">Add Revenue</h3>
              <button onClick={() => setShowRevenueForm(false)} className="p-1 rounded-full hover:bg-white/20">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5">Event *</label>
                <select
                  value={revenueForm.event}
                  onChange={(event) => setRevenueForm((prev) => ({ ...prev, event: event.target.value }))}
                  className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20"
                >
                  <option value="">Select event...</option>
                  {events.map((eventItem) => (
                    <option key={eventItem.id} value={eventItem.id}>{eventItem.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5">Source *</label>
                <div className="grid grid-cols-3 gap-2">
                  {REVENUE_SOURCES.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      disabled={item.auto}
                      onClick={() => {
                        if (item.auto) return;
                        setRevenueForm((prev) => ({ ...prev, source: item.id }));
                        if (!item.custom) setCustomRevenueSource('');
                      }}
                      className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-center ${
                        revenueForm.source === item.id
                          ? 'border-[#16A34A] bg-green-50'
                          : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                      } ${item.auto ? 'opacity-70 cursor-not-allowed bg-[#F8FAFC]' : ''}`}
                    >
                      {item.icon && <item.icon className="w-4 h-4" style={{ color: item.color }} />}
                      <span className="text-[9px] font-medium text-[#64748B] leading-tight">{item.label}</span>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-[#64748B] mt-2">
                  Ticket Sales revenue is automatic and recorded after successful ticket purchase.
                </p>
              </div>

              {revenueNeedsCustomLabel && (
                <div>
                  <label className="block text-xs font-medium text-[#64748B] mb-1.5">Custom Source Name *</label>
                  <input
                    type="text"
                    value={customRevenueSource}
                    onChange={(event) => setCustomRevenueSource(event.target.value)}
                    placeholder="e.g., Main brand sponsor"
                    className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5">Description *</label>
                <input
                  type="text"
                  value={revenueForm.description}
                  onChange={(event) => setRevenueForm((prev) => ({ ...prev, description: event.target.value }))}
                  placeholder="e.g., Gold sponsor package"
                  className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[#64748B] mb-1.5">Amount (KES) *</label>
                <input
                  type="number"
                  value={revenueForm.amount}
                  onChange={(event) => setRevenueForm((prev) => ({ ...prev, amount: event.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20"
                />
              </div>

              <button
                type="button"
                onClick={submitRevenueEntry}
                disabled={revenueSubmitDisabled}
                className="w-full py-3 bg-[#C58B1A] hover:bg-[#A56F14] text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Add Revenue
              </button>
            </div>
          </div>
        </div>
      )}
    </PageWrapper>
  );
};

export default OrganizerDashboardPage;

