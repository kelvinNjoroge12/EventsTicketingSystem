import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Users,
  Calendar,
  ArrowRight,
  Eye,
  AlertCircle,
  TrendingUp,
  DollarSign,
  BarChart3,
  CheckCircle2,
  Clock,
  Edit3,
  X,
  Receipt,
  UserCheck,
  Search,
  ArrowLeft,
  Ticket,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PageWrapper from '../components/layout/PageWrapper';
import CustomButton from '../components/ui/CustomButton';
import CustomAvatar from '../components/ui/CustomAvatar';
import { api } from '../lib/apiClient';

const TABS = [
  { id: 'overview', label: 'Overview', icon: BarChart3 },
  { id: 'events', label: 'My Events', icon: Calendar },
  { id: 'checkin', label: 'Check-In', icon: UserCheck },
];

const EXPENSE_CATEGORIES = [
  { id: 'speakers', label: 'Speakers' },
  { id: 'mc', label: 'MC / Host' },
  { id: 'venue', label: 'Venue / Tent' },
  { id: 'equipment', label: 'Equipment Hire' },
  { id: 'transport', label: 'Transport / Logistics' },
  { id: 'marketing', label: 'Marketing' },
  { id: 'catering', label: 'Catering' },
  { id: 'other', label: 'Other' },
];

const REVENUE_SOURCES = [
  { id: 'ticket_sales', label: 'Ticket Sales' },
  { id: 'sponsorship', label: 'Sponsorship' },
  { id: 'vendor', label: 'Vendor Booth' },
  { id: 'donation', label: 'Donation' },
  { id: 'other', label: 'Other' },
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
  const activeTab = TABS.some((tab) => tab.id === tabParam) ? tabParam : 'overview';
  const selectedEventId = searchParams.get('event') || '';

  const [eventSearch, setEventSearch] = useState('');
  const [guestSearch, setGuestSearch] = useState('');
  const [checkInEventId, setCheckInEventId] = useState('');
  const [flash, setFlash] = useState(null);
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [showRevenueForm, setShowRevenueForm] = useState(false);
  const guestsSectionRef = useRef(null);
  const [expenseForm, setExpenseForm] = useState({ event: '', description: '', amount: '', category: 'speakers' });
  const [revenueForm, setRevenueForm] = useState({ event: '', description: '', amount: '', source: 'ticket_sales' });

  const hasAccess = user && (user.role === 'organizer' || user.role === 'admin');

  const setTab = (tab) => {
    const next = new URLSearchParams(searchParams);
    next.set('tab', tab);
    if (tab !== 'events') next.delete('event');
    setSearchParams(next);
  };

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
  const revenueSourceLabel = (value) =>
    REVENUE_SOURCES.find((item) => item.id === value)?.label || value || 'Other';
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
      setRevenueForm((prev) => ({ ...prev, description: '', amount: '' }));
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
  const greeting = new Date().getHours() < 12
    ? 'Good Morning'
    : new Date().getHours() < 18
      ? 'Good Afternoon'
      : 'Good Evening';

  return (
    <PageWrapper>
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <p className="text-sm text-[#64748B]">{greeting}</p>
              <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A]">Organizer Dashboard</h1>
            </div>
            <Link to="/create-event">
              <CustomButton variant="primary" className="gap-2">
                <Plus className="w-4 h-4" />
                Create Event
              </CustomButton>
            </Link>
          </div>

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

          <div className="bg-white border border-[#E2E8F0] rounded-[28px] p-2 flex flex-wrap gap-2">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setTab(tab.id)}
                className={`px-4 py-2.5 rounded-2xl text-sm font-semibold transition-all flex items-center gap-2 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#1E4DB7] to-[#7C3AED] text-white shadow-md'
                    : 'text-[#475569] hover:bg-[#F8FAFC]'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'overview' && (
              <motion.div
                key="overview"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="space-y-6"
              >
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {[
                    { label: 'Events', value: overviewStats.totalEvents, icon: Calendar, color: '#1E4DB7' },
                    { label: 'Guests', value: overviewStats.totalAttendees, icon: Users, color: '#16A34A' },
                    { label: 'Checked In', value: overviewStats.totalCheckins, icon: UserCheck, color: '#F59E0B' },
                    { label: 'Revenue', value: formatMoney(overviewStats.totalRevenue), icon: TrendingUp, color: '#7C3AED', text: true },
                  ].map((kpi) => (
                    <div key={kpi.label} className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
                      <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${kpi.color}15` }}>
                        <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                      </div>
                      <p className="text-[11px] uppercase tracking-wider text-[#64748B] font-medium">{kpi.label}</p>
                      <p className="text-xl font-bold text-[#0F172A] mt-0.5">
                        {isLoadingGlobalStats ? '...' : (kpi.text ? kpi.value : Number(kpi.value || 0).toLocaleString())}
                      </p>
                    </div>
                  ))}
                </div>

                <div className="grid lg:grid-cols-2 gap-4">
                  <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm">
                    <h3 className="font-semibold text-[#0F172A] mb-2">Check-In Progress</h3>
                    <p className="text-sm text-[#64748B] mb-4">
                      {overviewStats.totalCheckins} of {overviewStats.totalAttendees} total attendees have checked in.
                    </p>
                    <div className="w-full h-3 rounded-full bg-[#E2E8F0] overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.min(Number(overviewStats.checkinPercent || 0), 100)}%` }}
                        transition={{ duration: 0.6 }}
                        className="h-full bg-gradient-to-r from-[#16A34A] to-[#22C55E]"
                      />
                    </div>
                    <p className="text-right mt-2 text-sm font-bold text-[#16A34A]">{overviewStats.checkinPercent || 0}%</p>
                  </div>

                  <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm">
                    <h3 className="font-semibold text-[#0F172A] mb-3">Quick Actions</h3>
                    <div className="grid sm:grid-cols-2 gap-3">
                      <button onClick={() => setTab('events')} className="px-4 py-4 rounded-2xl border border-[#DBEAFE] bg-[#EFF6FF] text-[#1E4DB7] text-sm font-semibold text-left">
                        Open My Events
                      </button>
                      <button onClick={() => setTab('checkin')} className="px-4 py-4 rounded-2xl border border-[#D1FAE5] bg-[#ECFDF5] text-[#047857] text-sm font-semibold text-left">
                        Start Check-In
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-6 shadow-sm">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-semibold text-[#0F172A]">Recent Events</h3>
                    <button onClick={() => setTab('events')} className="text-[#1E4DB7] text-sm font-semibold inline-flex items-center gap-1">
                      Manage
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                  {isLoadingEvents ? (
                    <div className="space-y-2 animate-pulse">
                      {[1, 2, 3].map((i) => <div key={i} className="h-14 rounded-xl bg-[#F1F5F9]" />)}
                    </div>
                  ) : events.length === 0 ? (
                    <p className="text-sm text-[#64748B]">No events yet.</p>
                  ) : (
                    <div className="space-y-2">
                      {events.slice(0, 5).map((event) => (
                        <button
                          key={event.id}
                          onClick={() => openEventDashboard(event.id)}
                          className="w-full text-left px-4 py-3 rounded-2xl border border-[#F1F5F9] hover:bg-[#F8FAFC] transition-colors flex items-center justify-between"
                        >
                          <div>
                            <p className="font-semibold text-[#0F172A] text-sm">{event.title}</p>
                            <p className="text-xs text-[#64748B] mt-0.5">{formatDate(event.start_date || event.date)}</p>
                          </div>
                          <ArrowRight className="w-4 h-4 text-[#94A3B8]" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}

            {activeTab === 'events' && (
              <motion.div
                key="events"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 8 }}
                className="space-y-6"
              >
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="relative w-full md:max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                    <input
                      type="text"
                      value={eventSearch}
                      onChange={(e) => setEventSearch(e.target.value)}
                      placeholder="Search your events..."
                      className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E4DB7]/20"
                    />
                  </div>
                  <Link to="/create-event">
                    <CustomButton variant="primary" className="gap-2">
                      <Plus className="w-4 h-4" />
                      New Event
                    </CustomButton>
                  </Link>
                </div>

                {!selectedEvent && (
                  <>
                    {isLoadingEvents ? (
                      <div className="space-y-3 animate-pulse">
                        {[1, 2, 3].map((i) => <div key={i} className="h-28 rounded-[24px] bg-white border border-[#E2E8F0]" />)}
                      </div>
                    ) : filteredEvents.length === 0 ? (
                      <div className="bg-white border border-[#E2E8F0] rounded-[28px] p-12 text-center">
                        <Calendar className="w-12 h-12 text-[#94A3B8] mx-auto mb-3" />
                        <h3 className="font-bold text-[#0F172A]">No events found</h3>
                        <p className="text-sm text-[#64748B] mt-1">Try another search or create a new event.</p>
                      </div>
                    ) : (
                      <div className="space-y-3">
                        {filteredEvents.map((event) => (
                          <div key={event.id} className="bg-white border border-[#E2E8F0] rounded-[28px] p-5 shadow-sm">
                            <div className="flex flex-col md:flex-row md:items-center gap-4 justify-between">
                              <div>
                                <h3 className="font-bold text-[#0F172A]">{event.title}</h3>
                                <p className="text-sm text-[#64748B] mt-1">
                                  {formatDate(event.start_date || event.date)} - {event.attendee_count || 0} guests
                                </p>
                              </div>
                              <div className="flex flex-wrap gap-2">
                                <Link to={`/events/${event.slug}`} className="px-3 py-2 rounded-xl text-sm font-semibold bg-[#EFF6FF] text-[#1E4DB7] inline-flex items-center gap-1.5">
                                  <Eye className="w-4 h-4" />
                                  View
                                </Link>
                                <Link to={`/edit-event/${event.slug}`} className="px-3 py-2 rounded-xl text-sm font-semibold bg-[#F8FAFC] text-[#334155] inline-flex items-center gap-1.5">
                                  <Edit3 className="w-4 h-4" />
                                  Edit
                                </Link>
                                <button onClick={() => openEventDashboard(event.id)} className="px-3 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#1E4DB7] to-[#7C3AED] inline-flex items-center gap-1.5">
                                  <BarChart3 className="w-4 h-4" />
                                  Open Dashboard
                                </button>
                                <Link to={`/organizer/events/${event.slug}/checkin`} className="px-3 py-2 rounded-xl text-sm font-semibold bg-[#ECFDF5] text-[#047857] inline-flex items-center gap-1.5">
                                  <CheckCircle2 className="w-4 h-4" />
                                  Check-In
                                </Link>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {selectedEvent && (
                  <div className="space-y-5">
                    <button onClick={clearEventDashboard} className="inline-flex items-center gap-2 text-sm font-semibold text-[#1E4DB7]">
                      <ArrowLeft className="w-4 h-4" />
                      Back to all events
                    </button>

                    <div className="bg-white border border-[#E2E8F0] rounded-[28px] p-6 shadow-sm">
                      <div className="flex flex-col lg:flex-row lg:items-start gap-4 justify-between">
                        <div>
                          <p className="text-xs uppercase tracking-wider text-[#64748B] font-semibold">Selected Event</p>
                          <h2 className="text-2xl font-bold text-[#0F172A] mt-1">{selectedEvent.title}</h2>
                          <p className="text-sm text-[#64748B] mt-1">{formatDate(selectedEvent.start_date || selectedEvent.date)}</p>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Link to={`/edit-event/${selectedEvent.slug}`} className="px-3 py-2 rounded-xl text-sm font-semibold bg-[#F8FAFC] text-[#334155] inline-flex items-center gap-1.5">
                            <Edit3 className="w-4 h-4" />
                            Edit Event
                          </Link>
                          <button onClick={() => { setShowExpenseForm((prev) => !prev); setShowRevenueForm(false); }} className="px-3 py-2 rounded-xl text-sm font-semibold bg-[#FAF5FF] text-[#7C3AED] inline-flex items-center gap-1.5">
                            <Receipt className="w-4 h-4" />
                            Add Expense
                          </button>
                          <button onClick={() => { setShowRevenueForm((prev) => !prev); setShowExpenseForm(false); }} className="px-3 py-2 rounded-xl text-sm font-semibold bg-[#ECFDF5] text-[#15803D] inline-flex items-center gap-1.5">
                            <DollarSign className="w-4 h-4" />
                            Add Revenue
                          </button>
                          <button
                            onClick={() => guestsSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
                            className="px-3 py-2 rounded-xl text-sm font-semibold bg-[#EFF6FF] text-[#1E4DB7] inline-flex items-center gap-1.5"
                          >
                            <Users className="w-4 h-4" />
                            See Guests
                          </button>
                          <Link to={`/organizer/events/${selectedEvent.slug}/checkin`} className="px-3 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-[#1E4DB7] to-[#7C3AED] inline-flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4" />
                            Check-In
                          </Link>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      {[
                        { label: 'Guests', value: selectedStats.totalAttendees, icon: Users, color: '#1E4DB7' },
                        { label: 'Checked In', value: selectedStats.totalCheckins, icon: UserCheck, color: '#16A34A' },
                        { label: 'Revenue', value: formatMoney(selectedStats.totalRevenue), icon: TrendingUp, color: '#7C3AED', text: true },
                        { label: 'Net Profit', value: formatMoney(selectedStats.netProfit), icon: DollarSign, color: '#0F766E', text: true },
                      ].map((kpi) => (
                        <div key={kpi.label} className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
                          <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3" style={{ backgroundColor: `${kpi.color}15` }}>
                            <kpi.icon className="w-4 h-4" style={{ color: kpi.color }} />
                          </div>
                          <p className="text-[11px] uppercase tracking-wider text-[#64748B] font-medium">{kpi.label}</p>
                          <p className="text-xl font-bold text-[#0F172A] mt-0.5">{isLoadingEventStats ? '...' : (kpi.text ? kpi.value : Number(kpi.value || 0).toLocaleString())}</p>
                        </div>
                      ))}
                    </div>

                    {(showExpenseForm || showRevenueForm) && (
                      <div className="grid lg:grid-cols-2 gap-4">
                        {showExpenseForm && (
                          <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
                            <h3 className="font-semibold text-[#0F172A] mb-3">Create Expense</h3>
                            <div className="space-y-3">
                              <select value={expenseForm.category} onChange={(e) => setExpenseForm((prev) => ({ ...prev, category: e.target.value }))} className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20">
                                {EXPENSE_CATEGORIES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                              </select>
                              <input value={expenseForm.description} onChange={(e) => setExpenseForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Expense description" className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20" />
                              <input type="number" value={expenseForm.amount} onChange={(e) => setExpenseForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="Amount (KES)" className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20" />
                              <button
                                onClick={() => {
                                  if (!selectedEventId || !expenseForm.description || !expenseForm.amount) return;
                                  addExpenseMutation.mutate({
                                    event: selectedEventId,
                                    category: expenseForm.category,
                                    description: expenseForm.description,
                                    amount: Number(expenseForm.amount),
                                  });
                                }}
                                className="w-full py-2.5 rounded-xl text-white font-semibold bg-gradient-to-r from-[#7C3AED] to-[#EC4899]"
                              >
                                Add Expense
                              </button>
                            </div>
                          </div>
                        )}

                        {showRevenueForm && (
                          <div className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
                            <h3 className="font-semibold text-[#0F172A] mb-3">Create Revenue</h3>
                            <div className="space-y-3">
                              <select value={revenueForm.source} onChange={(e) => setRevenueForm((prev) => ({ ...prev, source: e.target.value }))} className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20">
                                {REVENUE_SOURCES.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}
                              </select>
                              <input value={revenueForm.description} onChange={(e) => setRevenueForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="Revenue description" className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20" />
                              <input type="number" value={revenueForm.amount} onChange={(e) => setRevenueForm((prev) => ({ ...prev, amount: e.target.value }))} placeholder="Amount (KES)" className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#16A34A]/20" />
                              <button
                                onClick={() => {
                                  if (!selectedEventId || !revenueForm.description || !revenueForm.amount) return;
                                  addRevenueMutation.mutate({
                                    event: selectedEventId,
                                    source: revenueForm.source,
                                    description: revenueForm.description,
                                    amount: Number(revenueForm.amount),
                                  });
                                }}
                                className="w-full py-2.5 rounded-xl text-white font-semibold bg-gradient-to-r from-[#16A34A] to-[#15803D]"
                              >
                                Add Revenue
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="grid lg:grid-cols-2 gap-4">
                      <div ref={guestsSectionRef} className="bg-white border border-[#E2E8F0] rounded-[24px] p-5 shadow-sm">
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
                        <h3 className="font-semibold text-[#0F172A] mb-3">Revenue & Expense Entries</h3>
                        {(isLoadingEventExpenses || isLoadingEventRevenues) ? (
                          <div className="space-y-2 animate-pulse">{[1, 2, 3].map((i) => <div key={i} className="h-12 rounded-xl bg-[#F1F5F9]" />)}</div>
                        ) : (
                          <div className="space-y-2 max-h-[360px] overflow-auto pr-1">
                            {eventRevenues.map((item) => (
                              <div key={item.id} className="border border-[#E2E8F0] rounded-xl px-3 py-2.5 flex items-center justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="text-sm font-semibold text-[#0F172A] truncate">{item.description}</p>
                                  <p className="text-[11px] text-[#64748B]">{revenueSourceLabel(item.source)}</p>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-sm font-semibold text-[#15803D] whitespace-nowrap">+ {formatMoney(item.amount)}</span>
                                  <button onClick={() => deleteRevenueMutation.mutate(item.id)} className="p-1 rounded-md hover:bg-red-50 text-[#94A3B8] hover:text-[#EF4444]"><X className="w-3.5 h-3.5" /></button>
                                </div>
                              </div>
                            ))}
                            {eventExpenses.map((item) => (
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
                            {eventExpenses.length === 0 && eventRevenues.length === 0 && (
                              <p className="text-sm text-[#64748B]">No entries yet.</p>
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
                      className="px-5 py-3 rounded-2xl text-sm font-semibold text-white bg-gradient-to-r from-[#1E4DB7] to-[#7C3AED] disabled:opacity-50 inline-flex items-center gap-2"
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
    </PageWrapper>
  );
};

export default OrganizerDashboardPage;
