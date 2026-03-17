
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
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
import OrganizerDashboardOverview from '../components/dashboard/Overview';
import OrganizerMyEvents from '../components/dashboard/MyEvents';
import OrganizerEventDetail from '../components/dashboard/EventDetail';
import OrganizerSettings from '../components/dashboard/Settings';
import { api } from '../lib/apiClient';
import { fetchEvent } from '../lib/eventsApi';
import { toast } from 'sonner';

import ExpenseFormModal from '../components/dashboard/ExpenseFormModal';
import RevenueFormModal from '../components/dashboard/RevenueFormModal';

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
  { id: 'ticket_sales', backend: 'ticket_sales', label: 'Ticket Sales (Auto)', icon: Ticket, color: '#02338D', auto: true },
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
  const mainScrollRef = useRef(null);

  const isStaffUser = user && (user.role === 'checkin' || user.role === 'staff');
  const hasAccess = user && (user.role === 'organizer' || user.role === 'admin');

  useEffect(() => {
    if (isStaffUser) {
      navigate('/organizer-checkin', { replace: true });
    }
  }, [isStaffUser, navigate]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const tab = params.get('tab');
    if (!tab) return;
    const allowed = ['dashboard', 'events', 'checkin', 'create', 'settings', 'event'];
    if (!allowed.includes(tab)) return;

    if (tab === 'event') {
      const eventParam = params.get('event');
      if (eventParam) {
        setSelectedEventId(eventParam);
        setCurrentPage('event-detail');
      } else {
        setCurrentPage('events');
      }
      return;
    }

    setCurrentPage(tab);
  }, [location.search]);

  const syncTabToUrl = useCallback((tab, extras = {}) => {
    const params = new URLSearchParams(location.search);
    params.set('tab', tab);
    Object.entries(extras).forEach(([key, value]) => {
      if (value === undefined || value === null || value === '') {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    navigate(`/organizer-dashboard?${params.toString()}`, { replace: true });
  }, [location.search, navigate]);

  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['organizer_events'],
    queryFn: async () => {
      // Try primary organizer endpoint first; fall back to /my/ if it fails
      try {
        const data = await api.get('/api/events/organizer/');
        return apiList(data);
      } catch {
        const data = await api.get('/api/events/my/');
        return apiList(data);
      }
    },
    enabled: !!hasAccess,
    staleTime: 5 * 60 * 1000,
    placeholderData: (prev) => prev,
  });

  const rawEvents = eventsData || [];
  const events = useMemo(() => rawEvents.map(normalizeEvent), [rawEvents]);

  const deleteEventMutation = useMutation({
    mutationFn: async (eventItem) => {
      await api.delete(`/api/events/${eventItem.slug}/delete/`);
    },
    onSuccess: (_, eventItem) => {
      queryClient.invalidateQueries({ queryKey: ['organizer_events'] });
      toast.success(`"${eventItem.name}" deleted successfully.`);
      if (String(selectedEventId) === String(eventItem.slug) || String(selectedEventId) === String(eventItem.id)) {
        setCurrentPage('events');
        syncTabToUrl('events', { event: null });
      }
    },
    onError: (err) => {
      const msg = err?.response?.error?.message || err?.message || 'Failed to delete event.';
      toast.error(msg);
    },
  });

  const selectedEvent = useMemo(
    () => events.find((eventItem) =>
      String(eventItem.id) === String(selectedEventId) ||
      String(eventItem.slug) === String(selectedEventId)
    ),
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
    queryKey: ['dashboard_stats', selectedEvent?.id],
    queryFn: () => api.get(`/api/finances/dashboard-stats/?event_id=${selectedEvent?.id}`),
    enabled: !!hasAccess && !!selectedEvent?.id,
    staleTime: 60 * 1000,
  });

  const { data: eventAttendeesData, isLoading: isLoadingEventAttendees } = useQuery({
    queryKey: ['event_attendees', selectedEvent?.id],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('event_id', selectedEvent?.id);
      const data = await api.get(`/api/finances/attendees/?${params.toString()}`);
      const items = apiList(data);
      const count = data?.count ?? data?.total ?? data?.total_count ?? items.length;
      return { items, count };
    },
    enabled: !!hasAccess && !!selectedEvent?.id,
    staleTime: 60 * 1000,
  });

  const { data: eventExpensesData, isLoading: isLoadingEventExpenses } = useQuery({
    queryKey: ['event_expenses', selectedEvent?.id],
    queryFn: async () => {
      const data = await api.get(`/api/finances/expenses/?event_id=${selectedEvent?.id}`);
      return apiList(data);
    },
    enabled: !!hasAccess && !!selectedEvent?.id,
    staleTime: 60 * 1000,
  });

  const { data: eventRevenuesData, isLoading: isLoadingEventRevenues } = useQuery({
    queryKey: ['event_revenues', selectedEvent?.id],
    queryFn: async () => {
      const data = await api.get(`/api/finances/revenues/?event_id=${selectedEvent?.id}`);
      return apiList(data);
    },
    enabled: !!hasAccess && !!selectedEvent?.id,
    staleTime: 60 * 1000,
  });

  const overviewStats = normalizeStats(globalStatsData?.kpis || globalStatsData || EMPTY_STATS);
  const statsChanges = buildStatChanges(globalStatsData);
  const selectedStats = normalizeStats(eventStatsData?.kpis || eventStatsData || EMPTY_STATS);
  const eventAttendees = eventAttendeesData?.items || [];
  const eventAttendeesTotal = eventAttendeesData?.count ?? eventAttendees.length;
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
    const identifier = eventItem.slug || eventItem.id;
    setSelectedEventId(String(identifier));
    setCurrentPage('event-detail');
    syncTabToUrl('event', { event: identifier });
  };

  const handleBackToEvents = () => {
    setCurrentPage('events');
    syncTabToUrl('events', { event: null });
  };

  const handleEditEvent = () => {
    if (!selectedEvent?.slug) return;
    navigate(`/edit-event/${selectedEvent.slug}`);
  };

  const handleCreateEvent = () => {
    navigate('/create-event');
  };

  const openPublicEvent = (eventItem) => {
    if (!eventItem?.slug) {
      toast.error('Select a valid event to view.');
      return;
    }
    navigate(`/events/${eventItem.slug}`);
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
    setCurrentPage(page);
    if (page === 'checkin') {
      syncTabToUrl('checkin', { event: null });
      return;
    }
    if (page === 'settings') {
      syncTabToUrl('settings', { event: null });
      return;
    }
    if (page === 'events') {
      syncTabToUrl('events', { event: null });
      return;
    }
    if (page === 'dashboard') {
      syncTabToUrl('dashboard', { event: null });
      return;
    }
  };

  useEffect(() => {
    const container = mainScrollRef.current;
    if (!container) return;
    requestAnimationFrame(() => {
      container.scrollTo({ top: 0, behavior: 'auto' });
    });
  }, [currentPage, selectedEventId]);

  const getPageTitle = () => {
    switch (currentPage) {
      case 'dashboard':
        return 'Dashboard';
      case 'events':
        return 'My Events';
      case 'event-detail':
        return '';
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
            onViewAll={() => {
              setCurrentPage('events');
              syncTabToUrl('events', { event: null });
            }}
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
            onViewEvent={openPublicEvent}
            onCreateEvent={handleCreateEvent}
            onEditEvent={(eventItem) => navigate(`/edit-event/${eventItem.slug}`)}
            onDeleteEvent={(eventItem) => deleteEventMutation.mutate(eventItem)}
            onCheckInEvent={openCheckinForEvent}
            isLoading={isLoadingEvents}
          />
        );
      case 'event-detail':
        return selectedEvent ? (
          <OrganizerEventDetail
            event={selectedEvent}
            eventDetail={eventDetailData}
            eventStats={selectedStats}
            attendees={eventAttendees}
            attendeesTotal={eventAttendeesTotal}
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
            onDeleteExpense={async (id) => {
              await api.delete(`/api/finances/expenses/${id}/`);
              queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
              queryClient.invalidateQueries({ queryKey: ['event_expenses'] });
              toast.success('Expense deleted.');
            }}
            onDeleteRevenue={async (id) => {
              await api.delete(`/api/finances/revenues/${id}/`);
              queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
              queryClient.invalidateQueries({ queryKey: ['event_revenues'] });
              toast.success('Revenue deleted.');
            }}
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
              onEventClick={openCheckinForEvent}
              onViewEvent={openPublicEvent}
              onCreateEvent={handleCreateEvent}
              onEditEvent={(eventItem) => navigate(`/edit-event/${eventItem.slug}`)}
              onDeleteEvent={(eventItem) => deleteEventMutation.mutate(eventItem)}
              onCheckInEvent={openCheckinForEvent}
              showStatusFilter={false}
              showCategoryFilter={false}
              isLoading={isLoadingEvents}
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

          <main ref={mainScrollRef} className="flex-1 px-4 pb-4 pt-20 lg:px-6 lg:pb-6 lg:pt-20 overflow-auto">
            <div className="max-w-7xl mx-auto">{renderPage()}</div>
          </main>
        </div>
      </div>

      <ExpenseFormModal
        isOpen={showExpenseForm}
        onClose={() => setShowExpenseForm(false)}
        events={events}
        defaultEventId={selectedEventId}
      />

      <RevenueFormModal
        isOpen={showRevenueForm}
        onClose={() => setShowRevenueForm(false)}
        events={events}
        defaultEventId={selectedEventId}
      />
    </PageWrapper>
  );
};

export default OrganizerDashboardPage;

