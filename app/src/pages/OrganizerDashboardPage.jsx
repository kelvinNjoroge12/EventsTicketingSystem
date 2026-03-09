import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Users,
  Calendar,
  ArrowRight,
  AlertCircle,
  TrendingUp,
  DollarSign,
  CheckCircle2,
  Edit3,
  X,
  Receipt,
  UserCheck,
  Search,
  ArrowLeft,
  Ticket,
  Mic2,
  Tent,
  Monitor,
  Truck,
  MoreHorizontal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PageWrapper from '../components/layout/PageWrapper';
import CustomAvatar from '../components/ui/CustomAvatar';
import { api } from '../lib/apiClient';

const DASHBOARD_TAB_IDS = ['overview', 'events', 'checkin'];

const EXPENSE_CATEGORIES = [
  { id: 'speakers', label: 'Speakers', icon: Mic2, color: '#8B5CF6' },
  { id: 'mc', label: 'MC / Host', icon: Mic2, color: '#EC4899' },
  { id: 'venue', label: 'Venue / Tent', icon: Tent, color: '#F59E0B' },
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
  { id: 'grant', backend: 'other', label: 'Grant', icon: Calendar, color: '#F59E0B' },
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
const formatMoney = (value) => `KES ${(Number(value) || 0).toLocaleString()}`;
const formatDate = (value) => {
  if (!value) return 'Date not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not set';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const OrganizerDashboardPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabParam = searchParams.get('tab');
  const activeTab = DASHBOARD_TAB_IDS.includes(tabParam || '') ? tabParam : 'overview';
  const selectedEventId = searchParams.get('event') || '';

  const [eventSearch, setEventSearch] = useState('');
  const [guestSearch, setGuestSearch] = useState('');
  const [checkInEventId, setCheckInEventId] = useState('');
  const [flash, setFlash] = useState(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const [showGuestsModal, setShowGuestsModal] = useState(false);
  const [entryView, setEntryView] = useState('all');
  const [expenseForm, setExpenseForm] = useState({ event: '', description: '', amount: '', category: 'speakers' });
  const [revenueForm, setRevenueForm] = useState({ event: '', description: '', amount: '', source: 'sponsorship' });
  const [customRevenueSource, setCustomRevenueSource] = useState('');

  const hasAccess = user && (user.role === 'organizer' || user.role === 'admin');

  const openEventDashboard = (eventId) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'events');
    next.set('event', String(eventId));
    setSearchParams(next);
  };

  const clearEventDashboard = () => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', 'events');
    next.delete('event');
    setSearchParams(next);
  };

  const { data: eventsData, isLoading: isLoadingEvents } = useQuery({
    queryKey: ['organizer_events'],
    queryFn: async () => {
      const data = await api.get('/api/events/organizer/');
      return apiList(data);
    },
    enabled: !!hasAccess,
    staleTime: 5 * 60 * 1000,
  });

  const events = eventsData || [];

  const selectedEvent = useMemo(
    () => events.find((event) => String(event.id) === String(selectedEventId)),
    [events, selectedEventId]
  );

  const { data: globalStatsData, isLoading: isLoadingGlobalStats } = useQuery({
    queryKey: ['dashboard_stats', 'all'],
    queryFn: () => api.get('/api/finances/dashboard-stats/'),
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
    queryKey: ['event_attendees', selectedEventId, guestSearch],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.set('event_id', selectedEventId);
      if (guestSearch.trim()) params.set('q', guestSearch.trim());
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

  const overviewStats = globalStatsData?.kpis || EMPTY_STATS;
  const selectedStats = eventStatsData?.kpis || EMPTY_STATS;
  const eventAttendees = eventAttendeesData || [];
  const eventExpenses = eventExpensesData || [];
  const eventRevenues = eventRevenuesData || [];

  const filteredEvents = useMemo(() => {
    if (!eventSearch.trim()) return events;
    const q = eventSearch.toLowerCase();
    return events.filter((event) => event.title?.toLowerCase().includes(q));
  }, [events, eventSearch]);
  const expenseCategoryLabel = (value) =>
    EXPENSE_CATEGORIES.find((item) => item.id === value)?.label || value || 'Other';
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
  const addExpenseMutation = useMutation({
    mutationFn: async (payload) => api.post('/api/finances/expenses/', payload),
    onSuccess: () => {
      setFlash({ type: 'success', message: 'Expense added.' });
      setShowExpenseForm(false);
      setExpenseForm((prev) => ({ ...prev, description: '', amount: '' }));
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      queryClient.invalidateQueries({ queryKey: ['event_expenses'] });
    },
    onError: (error) => {
      setFlash({ type: 'error', message: error?.message || 'Failed to add expense.' });
    },
  });

  const deleteExpenseMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/finances/expenses/${id}/`),
    onSuccess: () => {
      setFlash({ type: 'success', message: 'Expense deleted.' });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      queryClient.invalidateQueries({ queryKey: ['event_expenses'] });
    },
    onError: () => {
      setFlash({ type: 'error', message: 'Failed to delete expense.' });
    },
  });

  const addRevenueMutation = useMutation({
    mutationFn: async (payload) => api.post('/api/finances/revenues/', payload),
    onSuccess: () => {
      setFlash({ type: 'success', message: 'Revenue added.' });
      setShowRevenueForm(false);
      setRevenueForm((prev) => ({ ...prev, description: '', amount: '', source: 'sponsorship' }));
      setCustomRevenueSource('');
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      queryClient.invalidateQueries({ queryKey: ['event_revenues'] });
    },
    onError: (error) => {
      setFlash({ type: 'error', message: error?.message || 'Failed to add revenue.' });
    },
  });

  const deleteRevenueMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/finances/revenues/${id}/`),
    onSuccess: () => {
      setFlash({ type: 'success', message: 'Revenue deleted.' });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
      queryClient.invalidateQueries({ queryKey: ['event_revenues'] });
    },
    onError: () => {
      setFlash({ type: 'error', message: 'Failed to delete revenue.' });
    },
  });
  useEffect(() => {
    if (!flash) return undefined;
    const timer = setTimeout(() => setFlash(null), 3000);
    return () => clearTimeout(timer);
  }, [flash]);

  useEffect(() => {
    if (!selectedEvent) return;
    setExpenseForm((prev) => ({ ...prev, event: String(selectedEvent.id) }));
    setRevenueForm((prev) => ({ ...prev, event: String(selectedEvent.id) }));
  }, [selectedEvent]);

  useEffect(() => {
    setShowGuestsModal(false);
  }, [selectedEventId]);

  useEffect(() => {
    if (events.length === 0 || checkInEventId) return;
    setCheckInEventId(String(events[0].id));
  }, [events, checkInEventId]);

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

  const openCheckinForSelected = () => {
    const event = events.find((item) => String(item.id) === String(checkInEventId));
    if (!event?.slug) return;
    navigate(`/organizer/events/${event.slug}/checkin`);
  };
  const selectedRevenueSource = REVENUE_SOURCES.find((item) => item.id === revenueForm.source) || REVENUE_SOURCES[1];
  const revenueNeedsCustomLabel = Boolean(selectedRevenueSource?.custom);
  const revenueSubmitDisabled =
    !revenueForm.event ||
    !revenueForm.description ||
    !revenueForm.amount ||
    Boolean(selectedRevenueSource?.auto) ||
    (revenueNeedsCustomLabel && !customRevenueSource.trim());
  const revenueBreakdownTotals = eventRevenues.reduce((acc, item) => {
    const key = item.source || 'other';
    acc[key] = (acc[key] || 0) + Number(item.amount || 0);
    return acc;
  }, {});
  const revenueBreakdown = Object.entries(revenueBreakdownTotals).map(([source, amount]) => ({
    source,
    label: revenueSourceLabel(source),
    amount,
  }));
  const showRevenueEntries = entryView === 'all' || entryView === 'revenues';
  const showExpenseEntries = entryView === 'all' || entryView === 'expenses';
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
  const dashboardCards = selectedEvent
    ? [
      { label: 'Guests', value: selectedStats.totalAttendees, icon: Users, color: '#1E4DB7' },
      { label: 'Checked In', value: selectedStats.totalCheckins, icon: UserCheck, color: '#C58B1A' },
      { label: 'Revenue', value: formatMoney(selectedStats.totalRevenue), icon: TrendingUp, color: '#0F4FA8', text: true },
      { label: 'Net Profit', value: formatMoney(selectedStats.netProfit), icon: DollarSign, color: '#B91C1C', text: true },
    ]
    : [
      { label: 'Total Events', value: overviewStats.totalEvents, icon: Calendar, color: '#1E4DB7' },
      { label: 'Guests', value: overviewStats.totalAttendees, icon: Users, color: '#C58B1A' },
      { label: 'Checked In', value: overviewStats.totalCheckins, icon: UserCheck, color: '#0F4FA8' },
      { label: 'Revenue', value: formatMoney(overviewStats.totalRevenue), icon: TrendingUp, color: '#B91C1C', text: true },
    ];
  const isStatsLoading = selectedEvent ? isLoadingEventStats : isLoadingGlobalStats;
  const eventHeaderLabel = selectedEvent ? 'Event Studio' : (activeTab === 'checkin' ? 'Check-In Console' : 'Organizer Dashboard');
  const eventHeaderTitle = selectedEvent ? selectedEvent.title : 'Organizer Dashboard';
  const eventHeaderDescription = selectedEvent
    ? `Manage every detail for ${selectedEvent.title} from one focused workspace.`
    : activeTab === 'checkin'
      ? 'Choose an event and launch your check-in workflow quickly.'
      : 'Select any event to switch into a full event-specific dashboard.';

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
          <AnimatePresence>
            {flash && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                className={`rounded-2xl px-4 py-3 text-sm font-medium border ${
                  flash.type === 'success'
                    ? 'bg-green-50 border-green-200 text-green-700'
                    : 'bg-red-50 border-red-200 text-red-700'
                }`}
              >
                {flash.message}
              </motion.div>
            )}
          </AnimatePresence>

          <div className="relative overflow-hidden bg-white border border-[#E2E8F0] rounded-[30px] shadow-sm">
            <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-[#C58B1A]/10" />
            <div className="absolute -bottom-24 -left-10 w-56 h-56 rounded-full bg-[#B91C1C]/10" />
            <div className="relative p-6 md:p-8">
              <p className="text-[11px] uppercase tracking-[0.2em] text-[#64748B] font-semibold">{eventHeaderLabel}</p>
              <h1 className="text-3xl md:text-4xl font-black text-[#0F172A] mt-2">{eventHeaderTitle}</h1>
              <p className="text-sm md:text-base text-[#475569] mt-2 max-w-3xl">{eventHeaderDescription}</p>
            </div>
          </div>

          <AnimatePresence mode="wait">
            {activeTab !== 'checkin' && (
              <motion.div
                key={`workspace-${activeTab}`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {dashboardCards.map((card) => (
                    <div key={card.label} className="bg-white border border-[#E2E8F0] rounded-[22px] p-5 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${card.color}15` }}>
                          <card.icon className="w-5 h-5" style={{ color: card.color }} />
                        </div>
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-[#94A3B8]">Live</span>
                      </div>
                      <p className="text-[11px] uppercase tracking-wider text-[#64748B] font-semibold mt-4">{card.label}</p>
                      <p className="text-xl md:text-2xl font-black text-[#0F172A] mt-1">
                        {isStatsLoading ? '...' : (card.text ? card.value : Number(card.value || 0).toLocaleString())}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-4 md:p-5 shadow-sm">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-4">
                    <div>
                      <h2 className="text-lg font-bold text-[#0F172A]">Event Directory</h2>
                      <p className="text-sm text-[#64748B]">Pick one event to open a focused event dashboard.</p>
                    </div>
                    <div className="relative w-full md:max-w-sm">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                      <input
                        type="text"
                        value={eventSearch}
                        onChange={(e) => setEventSearch(e.target.value)}
                        placeholder="Search events..."
                        className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E4DB7]/20"
                      />
                    </div>
                  </div>

                  {isLoadingEvents ? (
                    <div className="space-y-2 animate-pulse">
                      {[1, 2, 3].map((i) => <div key={i} className="h-16 rounded-2xl bg-[#F1F5F9]" />)}
                    </div>
                  ) : filteredEvents.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-[#CBD5E1] p-10 text-center">
                      <Calendar className="w-10 h-10 text-[#94A3B8] mx-auto mb-2" />
                      <h3 className="font-bold text-[#0F172A]">No events found</h3>
                      <p className="text-sm text-[#64748B] mt-1">Try another search keyword.</p>
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-[#E2E8F0] overflow-hidden">
                      {filteredEvents.map((event) => {
                        const eventIsSelected = String(event.id) === String(selectedEventId);
                        const isPublished = event.status === 'published' || event.is_published;
                        return (
                          <button
                            key={event.id}
                            onClick={() => openEventDashboard(event.id)}
                            className={`w-full text-left px-4 py-3 border-b border-[#E2E8F0] last:border-b-0 transition-colors ${
                              eventIsSelected ? 'bg-[#F8FAFC]' : 'bg-white hover:bg-[#F8FAFC]'
                            }`}
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="min-w-0">
                                <p className="font-bold text-[#0F172A] truncate">{event.title}</p>
                                <p className="text-xs text-[#64748B] mt-0.5">
                                  {formatDate(event.start_date || event.date)} • {event.attendee_count || 0} guests
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <span className={`px-2.5 py-1 rounded-full text-[11px] font-semibold ${
                                  isPublished ? 'bg-[#DBEAFE] text-[#1D4ED8]' : 'bg-[#FEF3C7] text-[#92400E]'
                                }`}>
                                  {isPublished ? 'Published' : 'Draft'}
                                </span>
                                <ArrowRight className="w-4 h-4 text-[#94A3B8]" />
                              </div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {selectedEvent && (
                  <div className="space-y-4">
                    <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 md:p-6 shadow-sm">
                      <div className="flex flex-col gap-5">
                        <div className="flex items-center justify-between gap-3 flex-wrap">
                          <button onClick={clearEventDashboard} className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E4DB7] hover:text-[#163B90]">
                            <ArrowLeft className="w-4 h-4" />
                            Back to event directory
                          </button>
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#FEE2E2] text-[#991B1B]">
                            Event Control
                          </span>
                        </div>
                        <div className="flex flex-col xl:flex-row xl:items-end xl:justify-between gap-4">
                          <div>
                            <p className="text-xs uppercase tracking-widest text-[#64748B] font-semibold">Selected Event</p>
                            <h2 className="text-2xl md:text-3xl font-black text-[#0F172A] mt-1">{selectedEvent.title}</h2>
                            <p className="text-sm text-[#64748B] mt-1">{formatDate(selectedEvent.start_date || selectedEvent.date)}</p>
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-2">
                            <Link to={`/edit-event/${selectedEvent.slug}`} className="px-3 py-2 rounded-xl text-sm font-semibold border border-[#BFDBFE] text-[#1E4DB7] bg-[#EFF6FF] inline-flex items-center justify-center gap-1.5">
                              <Edit3 className="w-4 h-4" />
                              Edit Event
                            </Link>
                            <button onClick={() => { setShowExpenseForm(true); setShowRevenueForm(false); }} className="px-3 py-2 rounded-xl text-sm font-semibold border border-[#FECACA] text-[#B91C1C] bg-[#FEF2F2] inline-flex items-center justify-center gap-1.5">
                              <Receipt className="w-4 h-4" />
                              Add Expense
                            </button>
                            <button onClick={() => { setShowRevenueForm(true); setShowExpenseForm(false); }} className="px-3 py-2 rounded-xl text-sm font-semibold border border-[#FDE68A] text-[#92400E] bg-[#FFFBEB] inline-flex items-center justify-center gap-1.5">
                              <DollarSign className="w-4 h-4" />
                              Add Revenue
                            </button>
                            <button
                              onClick={() => setShowGuestsModal(true)}
                              className="px-3 py-2 rounded-xl text-sm font-semibold border border-[#BFDBFE] text-[#1E4DB7] bg-white inline-flex items-center justify-center gap-1.5"
                            >
                              <Users className="w-4 h-4" />
                              See Guests
                            </button>
                            <Link to={`/organizer/events/${selectedEvent.slug}/checkin`} className="px-3 py-2 rounded-xl text-sm font-semibold text-white bg-[#1E4DB7] hover:bg-[#1B3E90] inline-flex items-center justify-center gap-1.5">
                              <CheckCircle2 className="w-4 h-4" />
                              Check-In
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="grid lg:grid-cols-2 gap-4">
                      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
                        <h3 className="font-semibold text-[#0F172A] mb-3">Guests</h3>
                        <div className="relative mb-3">
                          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                          <input value={guestSearch} onChange={(e) => setGuestSearch(e.target.value)} placeholder="Search guests..." className="w-full pl-9 pr-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E4DB7]/20" />
                        </div>
                        {isLoadingEventAttendees ? (
                          <div className="space-y-2 animate-pulse">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-[#F1F5F9]" />)}</div>
                        ) : eventAttendees.length === 0 ? (
                          <p className="text-sm text-[#64748B]">No guests found.</p>
                        ) : (
                          <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                            {eventAttendees.map((attendee) => (
                              <div key={attendee.id} className="border border-[#E2E8F0] rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <CustomAvatar name={attendee.attendee_name} size="sm" />
                                  <div className="min-w-0">
                                    <p className="text-sm font-semibold text-[#0F172A] truncate">{attendee.attendee_name}</p>
                                    <p className="text-[11px] text-[#64748B] truncate">{attendee.attendee_email}</p>
                                  </div>
                                </div>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${attendee.checked_in_at || attendee.status === 'used' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {attendee.checked_in_at || attendee.status === 'used' ? 'Checked In' : 'Pending'}
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
                        <div className="flex items-center justify-between gap-3 mb-3">
                          <h3 className="font-semibold text-[#0F172A]">Revenue & Expense Entries</h3>
                          <div className="inline-flex p-1 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0]">
                            <button
                              type="button"
                              onClick={() => setEntryView('all')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                entryView === 'all'
                                  ? 'bg-white text-[#0F172A] shadow-sm'
                                  : 'text-[#64748B] hover:text-[#334155]'
                              }`}
                            >
                              All
                            </button>
                            <button
                              type="button"
                              onClick={() => setEntryView('revenues')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                entryView === 'revenues'
                                  ? 'bg-white text-[#0F172A] shadow-sm'
                                  : 'text-[#64748B] hover:text-[#334155]'
                              }`}
                            >
                              Revenue Sources
                            </button>
                            <button
                              type="button"
                              onClick={() => setEntryView('expenses')}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                                entryView === 'expenses'
                                  ? 'bg-white text-[#0F172A] shadow-sm'
                                  : 'text-[#64748B] hover:text-[#334155]'
                              }`}
                            >
                              Expenses
                            </button>
                          </div>
                        </div>
                        {showRevenueEntries && revenueBreakdown.length > 0 && (
                          <div className="mb-3 flex flex-wrap gap-2">
                            {revenueBreakdown.map((item) => (
                              <span
                                key={item.source}
                                className="px-2.5 py-1 rounded-full text-xs font-semibold bg-[#DBEAFE] text-[#1E4DB7]"
                              >
                                {item.label}: {formatMoney(item.amount)}
                              </span>
                            ))}
                          </div>
                        )}
                        {(isLoadingEventExpenses || isLoadingEventRevenues) ? (
                          <div className="space-y-2 animate-pulse">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-[#F1F5F9]" />)}</div>
                        ) : (
                          <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                            {showRevenueEntries && eventRevenues.map((item) => (
                              <div key={item.id} className="border border-[#E2E8F0] rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[#0F172A] truncate">{item.description}</p>
                                  <div className="flex items-center gap-2">
                                    <p className="text-[11px] text-[#64748B]">{revenueSourceLabel(item.source)}</p>
                                    {item.source === 'ticket_sales' && (
                                      <span className="px-2 py-0.5 rounded-full bg-[#DBEAFE] text-[#1E40AF] text-[10px] font-semibold">Auto</span>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-[#15803D] whitespace-nowrap">+ {formatMoney(item.amount)}</span>
                                  {item.source !== 'ticket_sales' && (
                                    <button onClick={() => deleteRevenueMutation.mutate(item.id)} className="p-1 rounded-md hover:bg-red-50 text-[#94A3B8] hover:text-[#EF4444]"><X className="w-3.5 h-3.5" /></button>
                                  )}
                                </div>
                              </div>
                            ))}
                            {showExpenseEntries && eventExpenses.map((item) => (
                              <div key={item.id} className="border border-[#E2E8F0] rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[#0F172A] truncate">{item.description}</p>
                                  <p className="text-[11px] text-[#64748B]">{expenseCategoryLabel(item.category)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-[#DC2626] whitespace-nowrap">- {formatMoney(item.amount)}</span>
                                  <button onClick={() => deleteExpenseMutation.mutate(item.id)} className="p-1 rounded-md hover:bg-red-50 text-[#94A3B8] hover:text-[#EF4444]"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            ))}
                            {showRevenueEntries && showExpenseEntries && eventExpenses.length === 0 && eventRevenues.length === 0 && (
                              <p className="text-sm text-[#64748B]">No entries yet.</p>
                            )}
                            {showRevenueEntries && !showExpenseEntries && eventRevenues.length === 0 && (
                              <p className="text-sm text-[#64748B]">No revenue sources yet.</p>
                            )}
                            {!showRevenueEntries && showExpenseEntries && eventExpenses.length === 0 && (
                              <p className="text-sm text-[#64748B]">No expenses yet.</p>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            )}
            {activeTab === 'checkin' && (
              <motion.div
                key="checkin"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="space-y-5"
              >
                <div className="bg-white border border-[#E2E8F0] rounded-[28px] p-6 shadow-sm">
                  <h3 className="text-xl font-bold text-[#0F172A]">Start Check-In</h3>
                  <p className="text-sm text-[#64748B] mt-1">
                    Choose an event first, then open your check-in screen.
                  </p>
                  <div className="mt-5 grid md:grid-cols-[1fr_auto] gap-3 items-end">
                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">Event</label>
                      <select
                        value={checkInEventId}
                        onChange={(e) => setCheckInEventId(e.target.value)}
                        className="w-full px-4 py-3 border border-[#E2E8F0] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E4DB7]/20"
                      >
                        {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
                      </select>
                    </div>
                    <button
                      onClick={openCheckinForSelected}
                      disabled={!checkInEventId}
                      className="px-5 py-3 rounded-2xl text-sm font-semibold text-white bg-[#1E4DB7] hover:bg-[#1B3E90] disabled:opacity-50 inline-flex items-center gap-2"
                    >
                      <Ticket className="w-4 h-4" />
                      Open Check-In
                    </button>
                  </div>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-[28px] p-6 shadow-sm">
                  <h4 className="font-semibold text-[#0F172A] mb-3">Quick Event Access</h4>
                  {isLoadingEvents ? (
                    <div className="space-y-2 animate-pulse">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-[#F1F5F9]" />)}</div>
                  ) : (
                    <div className="grid md:grid-cols-2 gap-2">
                      {events.map((event) => (
                        <Link
                          key={event.id}
                          to={`/organizer/events/${event.slug}/checkin`}
                          className="px-4 py-3 rounded-2xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors text-sm flex items-center justify-between"
                        >
                          <span className="font-medium text-[#0F172A] truncate">{event.title}</span>
                          <ArrowRight className="w-4 h-4 text-[#94A3B8]" />
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>

      <AnimatePresence>
        {showGuestsModal && selectedEvent && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/45 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowGuestsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.96, y: 16 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.96, y: 16 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-5xl shadow-2xl overflow-hidden"
            >
              <div className="px-5 md:px-6 py-4 border-b border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-[#64748B] font-semibold">Guest List</p>
                  <h3 className="text-lg font-bold text-[#0F172A]">{selectedEvent.title}</h3>
                </div>
                <button onClick={() => setShowGuestsModal(false)} className="p-1.5 rounded-full hover:bg-[#E2E8F0] text-[#475569]">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="p-5 md:p-6 space-y-4">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                  <input
                    value={guestSearch}
                    onChange={(event) => setGuestSearch(event.target.value)}
                    placeholder="Search guests..."
                    className="w-full pl-9 pr-4 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E4DB7]/20"
                  />
                </div>

                {isLoadingEventAttendees ? (
                  <div className="space-y-2 animate-pulse">{[1, 2, 3, 4].map((i) => <div key={i} className="h-12 rounded-xl bg-[#F1F5F9]" />)}</div>
                ) : eventAttendees.length === 0 ? (
                  <p className="text-sm text-[#64748B]">No guests found.</p>
                ) : (
                  <div className="border border-[#E2E8F0] rounded-xl overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-[#F8FAFC] text-[#475569]">
                        <tr>
                          <th className="text-left px-4 py-3 font-semibold">Guest</th>
                          <th className="text-left px-4 py-3 font-semibold">Email</th>
                          <th className="text-left px-4 py-3 font-semibold">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {eventAttendees.map((attendee) => {
                          const checkedIn = attendee.checked_in_at || attendee.status === 'used';
                          return (
                            <tr key={attendee.id} className="border-t border-[#E2E8F0]">
                              <td className="px-4 py-3 font-semibold text-[#0F172A]">{attendee.attendee_name}</td>
                              <td className="px-4 py-3 text-[#475569]">{attendee.attendee_email}</td>
                              <td className="px-4 py-3">
                                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${checkedIn ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                                  {checkedIn ? 'Checked In' : 'Pending'}
                                </span>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}

        {showExpenseForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowExpenseForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
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
                    {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
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
            </motion.div>
          </motion.div>
        )}

        {showRevenueForm && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
            onClick={() => setShowRevenueForm(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              onClick={(event) => event.stopPropagation()}
              className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
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
                    {events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}
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
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </PageWrapper>
  );
};

export default OrganizerDashboardPage;
