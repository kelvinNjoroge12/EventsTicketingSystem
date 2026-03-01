import React, { useState, useEffect, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Plus, Settings, Users, Calendar, Activity, ArrowRight, Eye, AlertCircle,
    TrendingUp, DollarSign, BarChart3, Ticket, CheckCircle2, Clock,
    Edit3, ExternalLink, ChevronDown, ChevronUp, X, PieChart,
    Wallet, Receipt, Mic2, Tent, Monitor, Truck, MoreHorizontal,
    UserCheck, UserX, Search, Filter, Download,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import PageWrapper from '../components/layout/PageWrapper';
import CustomButton from '../components/ui/CustomButton';
import CustomAvatar from '../components/ui/CustomAvatar';
import { api } from '../lib/apiClient';

// ─── Mini Donut Chart ─────────────────────────────────────────
const MiniDonut = ({ percentage = 0, size = 60, strokeWidth = 6, color = '#1E4DB7' }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (percentage / 100) * circumference;
    return (
        <svg width={size} height={size} className="transform -rotate-90">
            <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="#E2E8F0" strokeWidth={strokeWidth} />
            <motion.circle
                cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={strokeWidth}
                strokeLinecap="round"
                initial={{ strokeDashoffset: circumference }}
                animate={{ strokeDashoffset: offset }}
                transition={{ duration: 1.2, ease: 'easeOut' }}
                style={{ strokeDasharray: circumference }}
            />
            <text x={size / 2} y={size / 2} textAnchor="middle" dominantBaseline="central"
                className="fill-[#0F172A] text-xs font-bold" transform={`rotate(90 ${size / 2} ${size / 2})`}>
                {percentage}%
            </text>
        </svg>
    );
};

// ─── Mini Bar Chart ───────────────────────────────────────────
const MiniBarChart = ({ data = [], color = '#1E4DB7' }) => {
    const max = Math.max(...data.map(d => d.value), 1);
    return (
        <div className="flex items-end gap-1 h-16">
            {data.map((d, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <motion.div
                        className="w-full rounded-t-sm min-h-[2px]"
                        style={{ backgroundColor: color }}
                        initial={{ height: 0 }}
                        animate={{ height: `${(d.value / max) * 100}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                    />
                    <span className="text-[8px] text-[#94A3B8]">{d.label}</span>
                </div>
            ))}
        </div>
    );
};

// ─── Sidebar Navigation ───────────────────────────────────────
const TABS = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'events', label: 'My Events', icon: Calendar },
    { id: 'attendees', label: 'Attendees', icon: Users },
    { id: 'finances', label: 'Finances', icon: Wallet },
];

// ─── Expense Categories ───────────────────────────────────────
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

const OrganizerDashboardPage = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [events, setEvents] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isStatsLoading, setIsStatsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedEventId, setSelectedEventId] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [showExpenseModal, setShowExpenseModal] = useState(false);

    // Real data states
    const [dashboardStats, setDashboardStats] = useState(null);
    const [expenses, setExpenses] = useState([]);
    const [attendees, setAttendees] = useState([]);

    // Load basic events list
    useEffect(() => {
        let mounted = true;
        if (!user || user.role !== 'organizer') return;

        api.get('/api/events/organizer/')
            .then(data => {
                if (mounted) setEvents(Array.isArray(data) ? data : data?.results || []);
            })
            .catch(err => console.error('Failed to load organizer events:', err))
            .finally(() => { if (mounted) setIsLoading(false); });

        return () => { mounted = false; };
    }, [user]);

    // Load Dashboard Stats, Expenses, and Attendees
    useEffect(() => {
        if (!user || user.role !== 'organizer') return;

        setIsStatsLoading(true);
        const eventParam = selectedEventId !== 'all' ? `?event_id=${selectedEventId}` : '';

        Promise.all([
            api.get(`/api/finances/dashboard-stats/${eventParam}`),
            api.get(`/api/finances/expenses/${eventParam}`),
            api.get(`/api/finances/attendees/${eventParam ? eventParam + '&' : '?'}q=${searchQuery}`)
        ])
            .then(([statsData, expensesData, attendeesData]) => {
                setDashboardStats(statsData);
                setExpenses(Array.isArray(expensesData) ? expensesData : expensesData.results || []);
                setAttendees(Array.isArray(attendeesData) ? attendeesData : attendeesData.results || []);
            })
            .catch(err => console.error('Failed to load dashboard data:', err))
            .finally(() => setIsStatsLoading(false));
    }, [user, selectedEventId, searchQuery, activeTab]);

    // ── Computed Stats from Backend ─────────────────────────────
    const stats = useMemo(() => {
        if (!dashboardStats) return {
            totalEvents: events.length,
            publishedEvents: 0,
            draftEvents: 0,
            totalAttendees: 0,
            totalCheckins: 0,
            checkinPercent: 0,
            totalRevenue: 0,
            totalExpenses: 0,
            netProfit: 0,
        };
        return dashboardStats.kpis;
    }, [dashboardStats, events]);

    // ── Filtered Events for the tab ─────────────────────────────
    const filteredEvents = useMemo(() => {
        if (!searchQuery) return events;
        return events.filter(e =>
            e.title?.toLowerCase().includes(searchQuery.toLowerCase())
        );
    }, [events, searchQuery]);

    // Combined breakdown including labels
    const expensesByCategory = useMemo(() => {
        if (!dashboardStats?.expenseBreakdown) return [];
        return dashboardStats.expenseBreakdown.map(item => ({
            ...item,
            ...EXPENSE_CATEGORIES.find(c => c.id === item.category)
        }));
    }, [dashboardStats]);

    // ── Monthly chart data (Still simulated for visual) ─────────
    const monthlyData = useMemo(() => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
        return months.map(label => ({
            label,
            value: Math.floor(Math.random() * 80) + 20,
        }));
    }, []);

    // ── Add Expense ─────────────────────────────────────────────
    const [newExpense, setNewExpense] = useState({
        description: '', amount: '', category: 'speakers', event: '',
    });

    const handleAddExpense = async () => {
        if (!newExpense.description || !newExpense.amount || !newExpense.event) return;
        try {
            await api.post('/api/finances/expenses/', {
                ...newExpense,
                amount: parseFloat(newExpense.amount)
            });
            // Refresh data
            const eventParam = selectedEventId !== 'all' ? `?event_id=${selectedEventId}` : '';
            const [statsData, expensesData] = await Promise.all([
                api.get(`/api/finances/dashboard-stats/${eventParam}`),
                api.get(`/api/finances/expenses/${eventParam}`)
            ]);
            setDashboardStats(statsData);
            setExpenses(Array.isArray(expensesData) ? expensesData : expensesData.results || []);

            setNewExpense({ description: '', amount: '', category: 'speakers', event: '' });
            setShowExpenseModal(false);
        } catch (err) {
            console.error('Failed to add expense:', err);
            alert('Failed to save expense. Please try again.');
        }
    };

    const handleDeleteExpense = async (id) => {
        if (!window.confirm('Are you sure you want to delete this expense?')) return;
        try {
            await api.delete(`/api/finances/expenses/${id}/`);
            setExpenses(prev => prev.filter(e => e.id !== id));
            // Refresh stats
            const eventParam = selectedEventId !== 'all' ? `?event_id=${selectedEventId}` : '';
            const statsData = await api.get(`/api/finances/dashboard-stats/${eventParam}`);
            setDashboardStats(statsData);
        } catch (err) {
            console.error('Failed to delete expense:', err);
        }
    };

    // ── Guard ───────────────────────────────────────────────────
    if (!user || user.role !== 'organizer') {
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

    const profile = user.organizer_profile || {};
    const greeting = new Date().getHours() < 12 ? 'Good Morning' : new Date().getHours() < 18 ? 'Good Afternoon' : 'Good Evening';

    return (
        <PageWrapper>
            {/* ── Dashboard Container ── */}
            <div className="min-h-screen bg-[#F8FAFC]">

                {/* ── Top Bar / Welcome ── */}
                <div className="bg-gradient-to-r from-[#0F172A] via-[#1E293B] to-[#0F172A] text-white">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#1E4DB7] to-[#7C3AED] flex items-center justify-center text-white text-xl font-bold shadow-lg">
                                    {(profile.organization_name || user.name || 'O')[0].toUpperCase()}
                                </div>
                                <div>
                                    <p className="text-white/60 text-sm">{greeting}</p>
                                    <h1 className="text-xl md:text-2xl font-bold">{profile.organization_name || user.name}</h1>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Link to="/create-event">
                                    <motion.button
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                        className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-[#1E4DB7] to-[#7C3AED] rounded-xl text-sm font-semibold shadow-lg shadow-blue-500/20"
                                    >
                                        <Plus className="w-4 h-4" />
                                        Create Event
                                    </motion.button>
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ── Tab Navigation ── */}
                <div className="bg-white border-b border-[#E2E8F0] sticky top-16 z-20">
                    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
                            {TABS.map(tab => (
                                <button
                                    key={tab.id}
                                    onClick={() => { setActiveTab(tab.id); setSearchQuery(''); }}
                                    className={`relative flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-[#1E4DB7]' : 'text-[#64748B] hover:text-[#0F172A]'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    {tab.label}
                                    {activeTab === tab.id && (
                                        <motion.div
                                            layoutId="dashTab"
                                            className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-[#1E4DB7]"
                                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                        />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* ── Main Content ── */}
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-8">
                    <AnimatePresence mode="wait">

                        {/* ═══════════════════ OVERVIEW TAB ═══════════════════ */}
                        {activeTab === 'overview' && (
                            <motion.div key="overview" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

                                {/* KPI Cards */}
                                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                                    {[
                                        { label: 'Total Events', value: stats.totalEvents || 0, icon: Calendar, color: '#1E4DB7', bg: 'from-blue-50 to-indigo-50', border: 'border-blue-100' },
                                        { label: 'Total Engaged', value: stats.totalAttendees || 0, icon: Users, color: '#16A34A', bg: 'from-green-50 to-emerald-50', border: 'border-green-100' },
                                        { label: 'Checked In', value: stats.totalCheckins || 0, icon: UserCheck, color: '#F59E0B', bg: 'from-amber-50 to-yellow-50', border: 'border-amber-100' },
                                        { label: 'Revenue', value: `KES ${(stats.totalRevenue / 1000).toFixed(1)}k`, icon: DollarSign, color: '#7C3AED', bg: 'from-purple-50 to-violet-50', border: 'border-purple-100', isText: true },
                                    ].map((kpi, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.08 }}
                                            className={`bg-gradient-to-br ${kpi.bg} border ${kpi.border} rounded-2xl p-4 md:p-5 hover:shadow-md transition-shadow`}
                                        >
                                            <div className="flex items-center justify-between mb-3">
                                                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${kpi.color}15` }}>
                                                    <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
                                                </div>
                                                <TrendingUp className="w-4 h-4 text-[#16A34A]" />
                                            </div>
                                            <p className="text-[10px] md:text-xs font-medium text-[#64748B] uppercase tracking-wider">{kpi.label}</p>
                                            <p className="text-xl md:text-2xl font-bold text-[#0F172A] mt-0.5">
                                                {kpi.isText ? kpi.value : kpi.value.toLocaleString()}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Charts Row */}
                                <div className="grid md:grid-cols-2 gap-4">
                                    {/* Registrations Chart */}
                                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-[#0F172A]">Registration Trend</h3>
                                            <span className="text-xs text-[#64748B]">Last 6 months</span>
                                        </div>
                                        <MiniBarChart data={monthlyData} color="#1E4DB7" />
                                    </div>

                                    {/* Check-in Donut */}
                                    <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-[#0F172A]">Check-in Rate</h3>
                                            <span className="text-xs text-[#16A34A] font-medium">+5% from last event</span>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <MiniDonut percentage={stats.checkinPercent} size={80} strokeWidth={8} color="#16A34A" />
                                            <div className="space-y-2 text-sm">
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-[#16A34A]" />
                                                    <span className="text-[#64748B]">Checked In</span>
                                                    <span className="font-semibold text-[#0F172A] ml-auto">{stats.totalCheckins}</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-3 h-3 rounded-full bg-[#E2E8F0]" />
                                                    <span className="text-[#64748B]">Pending</span>
                                                    <span className="font-semibold text-[#0F172A] ml-auto">{stats.totalAttendees - stats.totalCheckins}</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Actions */}
                                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
                                    <h3 className="font-semibold text-[#0F172A] mb-4">Quick Actions</h3>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {[
                                            { label: 'Create Event', icon: Plus, to: '/create-event', gradient: 'from-[#1E4DB7] to-[#7C3AED]' },
                                            { label: 'View My Events', action: () => setActiveTab('events'), icon: Calendar, gradient: 'from-[#059669] to-[#10B981]' },
                                            { label: 'Manage Attendees', action: () => setActiveTab('attendees'), icon: Users, gradient: 'from-[#F59E0B] to-[#F97316]' },
                                            { label: 'View Finances', action: () => setActiveTab('finances'), icon: Wallet, gradient: 'from-[#8B5CF6] to-[#EC4899]' },
                                        ].map((action, i) => (
                                            action.to ? (
                                                <Link key={i} to={action.to}>
                                                    <motion.div
                                                        whileHover={{ y: -2 }}
                                                        className={`bg-gradient-to-br ${action.gradient} text-white rounded-xl p-4 text-center cursor-pointer shadow-sm hover:shadow-md transition-shadow`}
                                                    >
                                                        <action.icon className="w-6 h-6 mx-auto mb-2" />
                                                        <span className="text-xs font-semibold">{action.label}</span>
                                                    </motion.div>
                                                </Link>
                                            ) : (
                                                <motion.div
                                                    key={i}
                                                    whileHover={{ y: -2 }}
                                                    onClick={action.action}
                                                    className={`bg-gradient-to-br ${action.gradient} text-white rounded-xl p-4 text-center cursor-pointer shadow-sm hover:shadow-md transition-shadow`}
                                                >
                                                    <action.icon className="w-6 h-6 mx-auto mb-2" />
                                                    <span className="text-xs font-semibold">{action.label}</span>
                                                </motion.div>
                                            )
                                        ))}
                                    </div>
                                </div>

                                {/* Recent Events Preview */}
                                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
                                    <div className="flex items-center justify-between mb-4">
                                        <h3 className="font-semibold text-[#0F172A]">Recent Events</h3>
                                        <button onClick={() => setActiveTab('events')} className="text-[#1E4DB7] text-xs font-medium hover:underline flex items-center gap-1">
                                            View All <ArrowRight className="w-3 h-3" />
                                        </button>
                                    </div>
                                    {isLoading ? (
                                        <div className="space-y-3 animate-pulse">
                                            {[1, 2, 3].map(i => <div key={i} className="h-16 bg-[#F1F5F9] rounded-xl" />)}
                                        </div>
                                    ) : events.length === 0 ? (
                                        <div className="text-center py-10 text-[#64748B]">
                                            <Calendar className="w-10 h-10 mx-auto mb-2 text-[#94A3B8]" />
                                            <p className="text-sm">No events yet. Create your first!</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-2">
                                            {events.slice(0, 4).map((event, i) => (
                                                <motion.div
                                                    key={event.id || i}
                                                    initial={{ opacity: 0, x: -10 }}
                                                    animate={{ opacity: 1, x: 0 }}
                                                    transition={{ delay: i * 0.05 }}
                                                    className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F8FAFC] transition-colors group"
                                                >
                                                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-[#1E4DB7] to-[#7C3AED] flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                                                        {new Date(event.start_date || event.date).getDate()}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                        <p className="font-medium text-[#0F172A] text-sm truncate">{event.title}</p>
                                                        <p className="text-[10px] text-[#64748B]">
                                                            {new Date(event.start_date || event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} · {event.attendee_count || 0} attendees
                                                        </p>
                                                    </div>
                                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${event.status === 'published' ? 'bg-green-100 text-green-700' :
                                                        event.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                                                            'bg-amber-100 text-amber-700'
                                                        }`}>
                                                        {event.status || 'draft'}
                                                    </span>
                                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <Link to={`/events/${event.slug}`} className="p-1.5 rounded-md hover:bg-[#EFF6FF] text-[#64748B] hover:text-[#1E4DB7]">
                                                            <Eye className="w-3.5 h-3.5" />
                                                        </Link>
                                                        <Link to={`/edit-event/${event.slug}`} className="p-1.5 rounded-md hover:bg-[#EFF6FF] text-[#64748B] hover:text-[#1E4DB7]">
                                                            <Edit3 className="w-3.5 h-3.5" />
                                                        </Link>
                                                    </div>
                                                </motion.div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}

                        {/* ═══════════════════ MY EVENTS TAB ═══════════════════ */}
                        {activeTab === 'events' && (
                            <motion.div key="events" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

                                {/* Search + Actions */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <div className="relative flex-1 w-full sm:max-w-sm">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                                        <input
                                            type="text"
                                            placeholder="Search events..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E4DB7]/20 focus:border-[#1E4DB7]"
                                        />
                                    </div>
                                    <Link to="/create-event">
                                        <CustomButton variant="primary" className="gap-2">
                                            <Plus className="w-4 h-4" /> New Event
                                        </CustomButton>
                                    </Link>
                                </div>

                                {/* Stats Mini */}
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { label: 'Published', value: stats.publishedEvents, color: '#16A34A' },
                                        { label: 'Drafts', value: stats.draftEvents, color: '#64748B' },
                                        { label: 'Total', value: stats.totalEvents, color: '#1E4DB7' },
                                    ].map((s, i) => (
                                        <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl p-3 text-center">
                                            <p className="text-2xl font-bold" style={{ color: s.color }}>{s.value}</p>
                                            <p className="text-[10px] text-[#64748B] uppercase tracking-wider font-medium">{s.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Event Cards */}
                                {isLoading ? (
                                    <div className="space-y-3 animate-pulse">
                                        {[1, 2, 3].map(i => <div key={i} className="h-24 bg-white border border-[#E2E8F0] rounded-2xl" />)}
                                    </div>
                                ) : filteredEvents.length === 0 ? (
                                    <div className="text-center py-16 bg-white border border-[#E2E8F0] rounded-2xl">
                                        <Calendar className="w-14 h-14 text-[#94A3B8] mx-auto mb-3" />
                                        <h3 className="text-lg font-bold text-[#0F172A] mb-1">No events found</h3>
                                        <p className="text-[#64748B] text-sm mb-4">Create your first event to get started.</p>
                                        <Link to="/create-event">
                                            <CustomButton variant="primary"><Plus className="w-4 h-4 mr-2" /> Create Event</CustomButton>
                                        </Link>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {filteredEvents.map((event, i) => (
                                            <motion.div
                                                key={event.id || i}
                                                initial={{ opacity: 0, y: 10 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                transition={{ delay: i * 0.04 }}
                                                className="bg-white border border-[#E2E8F0] rounded-2xl p-4 hover:shadow-md transition-all group"
                                            >
                                                <div className="flex items-start gap-4">
                                                    {/* Date Block */}
                                                    <div className="hidden sm:flex flex-col items-center justify-center w-14 h-14 rounded-xl bg-gradient-to-br from-[#1E4DB7] to-[#7C3AED] text-white flex-shrink-0">
                                                        <span className="text-xs font-medium opacity-80">
                                                            {new Date(event.start_date || event.date).toLocaleDateString('en-US', { month: 'short' })}
                                                        </span>
                                                        <span className="text-lg font-bold -mt-0.5">
                                                            {new Date(event.start_date || event.date).getDate()}
                                                        </span>
                                                    </div>

                                                    {/* Content */}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-start justify-between gap-2">
                                                            <div>
                                                                <h4 className="font-semibold text-[#0F172A] text-sm md:text-base truncate">{event.title}</h4>
                                                                <div className="flex items-center gap-3 mt-1 text-xs text-[#64748B]">
                                                                    <span className="flex items-center gap-1">
                                                                        <Calendar className="w-3 h-3" />
                                                                        {new Date(event.start_date || event.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                                                                    </span>
                                                                    <span className="flex items-center gap-1">
                                                                        <Users className="w-3 h-3" />
                                                                        {event.attendee_count || 0} attendees
                                                                    </span>
                                                                </div>
                                                            </div>
                                                            <span className={`px-2.5 py-1 text-[10px] font-bold rounded-full uppercase flex-shrink-0 ${event.status === 'published' ? 'bg-green-100 text-green-700' :
                                                                event.status === 'draft' ? 'bg-slate-100 text-slate-600' :
                                                                    event.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                                                                        'bg-amber-100 text-amber-700'
                                                                }`}>
                                                                {event.status || 'draft'}
                                                            </span>
                                                        </div>

                                                        {/* Action Bar */}
                                                        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-[#F1F5F9]">
                                                            <Link
                                                                to={`/events/${event.slug}`}
                                                                className="flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#1E4DB7] px-2.5 py-1.5 rounded-lg hover:bg-[#EFF6FF] transition-colors"
                                                            >
                                                                <Eye className="w-3.5 h-3.5" /> View
                                                            </Link>
                                                            <Link
                                                                to={`/edit-event/${event.slug}`}
                                                                className="flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#1E4DB7] px-2.5 py-1.5 rounded-lg hover:bg-[#EFF6FF] transition-colors"
                                                            >
                                                                <Edit3 className="w-3.5 h-3.5" /> Edit
                                                            </Link>
                                                            <button
                                                                onClick={() => { setSelectedEventId(String(event.id)); setActiveTab('attendees'); }}
                                                                className="flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#16A34A] px-2.5 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                                                            >
                                                                <Users className="w-3.5 h-3.5" /> Attendees
                                                            </button>
                                                            <button
                                                                onClick={() => { setSelectedEventId(String(event.id)); setActiveTab('finances'); }}
                                                                className="flex items-center gap-1.5 text-xs font-medium text-[#64748B] hover:text-[#7C3AED] px-2.5 py-1.5 rounded-lg hover:bg-purple-50 transition-colors"
                                                            >
                                                                <Wallet className="w-3.5 h-3.5" /> Finances
                                                            </button>
                                                        </div>
                                                    </div>
                                                </div>
                                            </motion.div>
                                        ))}
                                    </div>
                                )}
                            </motion.div>
                        )}

                        {/* ═══════════════════ ATTENDEES TAB ═══════════════════ */}
                        {activeTab === 'attendees' && (
                            <motion.div key="attendees" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

                                {/* Filters */}
                                <div className="flex flex-col sm:flex-row gap-3">
                                    <div className="relative flex-1">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                                        <input
                                            type="text"
                                            placeholder="Search attendees..."
                                            value={searchQuery}
                                            onChange={(e) => setSearchQuery(e.target.value)}
                                            className="w-full pl-9 pr-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E4DB7]/20"
                                        />
                                    </div>
                                    <select
                                        value={selectedEventId}
                                        onChange={(e) => setSelectedEventId(e.target.value)}
                                        className="px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E4DB7]/20"
                                    >
                                        <option value="all">All Events</option>
                                        {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                                    </select>
                                </div>

                                {/* Stats */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                    {[
                                        { label: 'Total Registered', value: attendees.length, icon: Users, color: '#1E4DB7' },
                                        { label: 'Checked In', value: attendees.filter(a => a.checked_in_at || a.status === 'used').length, icon: UserCheck, color: '#16A34A' },
                                        { label: 'Pending', value: attendees.filter(a => !a.checked_in_at && a.status !== 'used').length, icon: Clock, color: '#F59E0B' },
                                        { label: 'Check-in Rate', value: attendees.length > 0 ? `${Math.round(attendees.filter(a => a.checked_in_at || a.status === 'used').length / attendees.length * 100)}%` : '0%', icon: Activity, color: '#7C3AED', isText: true },
                                    ].map((s, i) => (
                                        <div key={i} className="bg-white border border-[#E2E8F0] rounded-xl p-3 md:p-4">
                                            <div className="flex items-center gap-2 mb-1">
                                                <s.icon className="w-4 h-4" style={{ color: s.color }} />
                                                <span className="text-[10px] md:text-xs text-[#64748B] font-medium uppercase tracking-wider">{s.label}</span>
                                            </div>
                                            <p className="text-lg md:text-xl font-bold text-[#0F172A]">
                                                {s.isText ? s.value : s.value.toLocaleString()}
                                            </p>
                                        </div>
                                    ))}
                                </div>

                                {/* Attendee List */}
                                <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead>
                                                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                                                    <th className="px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Attendee</th>
                                                    <th className="px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider hidden md:table-cell">Event</th>
                                                    <th className="px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Ticket</th>
                                                    <th className="px-4 py-3 text-xs font-semibold text-[#64748B] uppercase tracking-wider">Status</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-[#F1F5F9]">
                                                {attendees.length === 0 ? (
                                                    <tr><td colSpan={4} className="px-4 py-10 text-center text-[#94A3B8] text-sm">No attendees found.</td></tr>
                                                ) : attendees.slice(0, 50).map((attendee, i) => (
                                                    <tr key={attendee.id} className="hover:bg-[#F8FAFC] transition-colors">
                                                        <td className="px-4 py-3">
                                                            <div className="flex items-center gap-2.5">
                                                                <CustomAvatar name={attendee.attendee_name} size="sm" />
                                                                <div>
                                                                    <p className="font-medium text-[#0F172A] text-sm">{attendee.attendee_name}</p>
                                                                    <p className="text-[10px] text-[#94A3B8]">{attendee.attendee_email}</p>
                                                                </div>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-sm text-[#64748B] hidden md:table-cell truncate max-w-[200px]">{attendee.event_title}</td>
                                                        <td className="px-4 py-3">
                                                            <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-[#EFF6FF] text-[#1E4DB7]">{attendee.ticket_type_name}</span>
                                                        </td>
                                                        <td className="px-4 py-3">
                                                            {attendee.checked_in_at || attendee.status === 'used' ? (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-green-100 text-green-700">
                                                                    <CheckCircle2 className="w-3 h-3" /> Checked In
                                                                </span>
                                                            ) : (
                                                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700">
                                                                    <Clock className="w-3 h-3" /> Pending
                                                                </span>
                                                            )}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </motion.div>
                        )}

                        {/* ═══════════════════ FINANCES TAB ═══════════════════ */}
                        {activeTab === 'finances' && (
                            <motion.div key="finances" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-6">

                                {/* Event Selector */}
                                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                    <select
                                        value={selectedEventId}
                                        onChange={(e) => setSelectedEventId(e.target.value)}
                                        className="px-4 py-2.5 bg-white border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E4DB7]/20 w-full sm:w-auto sm:min-w-[250px]"
                                    >
                                        <option value="all">All Events (Combined)</option>
                                        {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                                    </select>
                                    <button
                                        onClick={() => setShowExpenseModal(true)}
                                        className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white rounded-xl text-sm font-semibold shadow-sm hover:shadow-md transition-shadow"
                                    >
                                        <Plus className="w-4 h-4" /> Add Expense
                                    </button>
                                </div>

                                {/* Finance KPI Cards */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    {[
                                        { label: 'Total Revenue', value: stats.totalRevenue, color: '#16A34A', icon: TrendingUp, prefix: 'KES ' },
                                        { label: 'Total Expenses', value: stats.totalExpenses, color: '#EF4444', icon: Receipt, prefix: 'KES ' },
                                        { label: 'Net Profit', value: stats.netProfit, color: '#1E4DB7', icon: DollarSign, prefix: 'KES ' },
                                    ].map((kpi, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            className="bg-white border border-[#E2E8F0] rounded-2xl p-5"
                                        >
                                            <div className="flex items-center gap-2 mb-2">
                                                <kpi.icon className="w-5 h-5" style={{ color: kpi.color }} />
                                                <span className="text-xs text-[#64748B] font-medium uppercase tracking-wider">{kpi.label}</span>
                                            </div>
                                            <p className="text-2xl font-bold" style={{ color: kpi.value >= 0 ? kpi.color : '#EF4444' }}>
                                                {kpi.prefix}{kpi.value.toLocaleString()}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>

                                {/* Expense Breakdown by Category */}
                                <div className="bg-white border border-[#E2E8F0] rounded-2xl p-5">
                                    <h3 className="font-semibold text-[#0F172A] mb-4">Cost Breakdown</h3>
                                    {expensesByCategory.length === 0 ? (
                                        <div className="text-center py-8 text-[#94A3B8]">
                                            <Receipt className="w-10 h-10 mx-auto mb-2" />
                                            <p className="text-sm">No expenses recorded yet.</p>
                                            <p className="text-xs mt-1">Click "Add Expense" to start tracking costs.</p>
                                        </div>
                                    ) : (
                                        <div className="space-y-3">
                                            {expensesByCategory.map((cat, i) => {
                                                const total = stats.totalExpenses || 1;
                                                const percent = Math.round((cat.amount / total) * 100);
                                                return (
                                                    <div key={cat.category} className="flex items-center gap-3">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${cat.color}15` }}>
                                                            {cat.icon && <cat.icon className="w-4 h-4" style={{ color: cat.color }} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center justify-between text-sm mb-1">
                                                                <span className="font-medium text-[#0F172A]">{cat.label || cat.category}</span>
                                                                <span className="font-semibold text-[#0F172A]">KES {cat.amount.toLocaleString()}</span>
                                                            </div>
                                                            <div className="w-full h-2 bg-[#F1F5F9] rounded-full overflow-hidden">
                                                                <motion.div
                                                                    className="h-full rounded-full"
                                                                    style={{ backgroundColor: cat.color }}
                                                                    initial={{ width: 0 }}
                                                                    animate={{ width: `${percent}%` }}
                                                                    transition={{ duration: 0.8 }}
                                                                />
                                                            </div>
                                                        </div>
                                                        <span className="text-xs text-[#64748B] font-medium w-10 text-right">{percent}%</span>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Expense History */}
                                <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden">
                                    <div className="px-5 py-4 border-b border-[#E2E8F0] flex items-center justify-between">
                                        <h3 className="font-semibold text-[#0F172A]">Expense History</h3>
                                        <span className="text-xs text-[#64748B]">{expenses.length} entries</span>
                                    </div>
                                    {expenses.length === 0 ? (
                                        <div className="p-8 text-center text-[#94A3B8] text-sm">No expenses recorded.</div>
                                    ) : (
                                        <div className="divide-y divide-[#F1F5F9]">
                                            {expenses.map((exp) => {
                                                const catInfo = EXPENSE_CATEGORIES.find(c => c.id === exp.category) || {};
                                                const eventInfo = events.find(e => String(e.id) === String(exp.event));
                                                return (
                                                    <div key={exp.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[#F8FAFC] transition-colors">
                                                        <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${catInfo.color || '#64748B'}15` }}>
                                                            {catInfo.icon ? <catInfo.icon className="w-4 h-4" style={{ color: catInfo.color }} /> : <Receipt className="w-4 h-4 text-[#64748B]" />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className="font-medium text-[#0F172A] text-sm">{exp.description}</p>
                                                            <p className="text-[10px] text-[#94A3B8]">
                                                                {catInfo.label || exp.category} · {eventInfo?.title || 'Unknown Event'} · {new Date(exp.date).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                        <span className="font-semibold text-[#EF4444] text-sm whitespace-nowrap">
                                                            -KES {exp.amount.toLocaleString()}
                                                        </span>
                                                        <button
                                                            onClick={() => handleDeleteExpense(exp.id)}
                                                            className="p-1 rounded-md hover:bg-red-50 text-[#94A3B8] hover:text-[#EF4444] transition-colors"
                                                        >
                                                            <X className="w-3.5 h-3.5" />
                                                        </button>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* ═══════════════════ ADD EXPENSE MODAL ═══════════════════ */}
            <AnimatePresence>
                {showExpenseModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
                        onClick={() => setShowExpenseModal(false)}
                    >
                        <motion.div
                            initial={{ scale: 0.9, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.9, y: 20 }}
                            onClick={(e) => e.stopPropagation()}
                            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
                        >
                            <div className="bg-gradient-to-r from-[#7C3AED] to-[#EC4899] px-6 py-4 text-white flex items-center justify-between">
                                <h3 className="font-semibold">Add Expense</h3>
                                <button onClick={() => setShowExpenseModal(false)} className="p-1 rounded-full hover:bg-white/20">
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                {/* Event select */}
                                <div>
                                    <label className="block text-xs font-medium text-[#64748B] mb-1.5">Event *</label>
                                    <select
                                        value={newExpense.event}
                                        onChange={(e) => setNewExpense(prev => ({ ...prev, event: e.target.value }))}
                                        className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                                    >
                                        <option value="">Select event...</option>
                                        {events.map(e => <option key={e.id} value={e.id}>{e.title}</option>)}
                                    </select>
                                </div>

                                {/* Category */}
                                <div>
                                    <label className="block text-xs font-medium text-[#64748B] mb-1.5">Category *</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {EXPENSE_CATEGORIES.map(cat => (
                                            <button
                                                key={cat.id}
                                                onClick={() => setNewExpense(prev => ({ ...prev, category: cat.id }))}
                                                className={`flex flex-col items-center gap-1 p-2 rounded-xl border-2 transition-all text-center ${newExpense.category === cat.id
                                                    ? 'border-[#7C3AED] bg-purple-50'
                                                    : 'border-[#E2E8F0] hover:border-[#CBD5E1]'
                                                    }`}
                                            >
                                                <cat.icon className="w-4 h-4" style={{ color: cat.color }} />
                                                <span className="text-[8px] font-medium text-[#64748B] leading-tight">{cat.label}</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-xs font-medium text-[#64748B] mb-1.5">Description *</label>
                                    <input
                                        type="text"
                                        value={newExpense.description}
                                        onChange={(e) => setNewExpense(prev => ({ ...prev, description: e.target.value }))}
                                        placeholder="e.g., DJ Equipment rental"
                                        className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                                    />
                                </div>

                                {/* Amount */}
                                <div>
                                    <label className="block text-xs font-medium text-[#64748B] mb-1.5">Amount (KES) *</label>
                                    <input
                                        type="number"
                                        value={newExpense.amount}
                                        onChange={(e) => setNewExpense(prev => ({ ...prev, amount: e.target.value }))}
                                        placeholder="0"
                                        className="w-full px-3 py-2.5 border border-[#E2E8F0] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[#7C3AED]/20"
                                    />
                                </div>

                                {/* Submit */}
                                <button
                                    onClick={handleAddExpense}
                                    disabled={!newExpense.description || !newExpense.amount || !newExpense.event}
                                    className="w-full py-3 bg-gradient-to-r from-[#7C3AED] to-[#EC4899] text-white rounded-xl font-semibold disabled:opacity-40 disabled:cursor-not-allowed hover:shadow-lg transition-shadow"
                                >
                                    Add Expense
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
