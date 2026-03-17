import { Mic2, Tent, Monitor, Truck, TrendingUp, Receipt, MoreHorizontal, Ticket, DollarSign } from 'lucide-react';
import { mapEvent } from '../../lib/eventsApi';

export const EXPENSE_CATEGORIES = [
    { id: 'speakers', label: 'Speakers', icon: Mic2, color: '#7C3AED' },
    { id: 'mc', label: 'MC / Host', icon: Mic2, color: '#EC4899' },
    { id: 'venue', label: 'Venue / Tent', icon: Tent, color: '#C58B1A' },
    { id: 'equipment', label: 'Equipment Hire', icon: Monitor, color: '#06B6D4' },
    { id: 'transport', label: 'Transport / Logistics', icon: Truck, color: '#10B981' },
    { id: 'marketing', label: 'Marketing', icon: TrendingUp, color: '#EF4444' },
    { id: 'catering', label: 'Catering', icon: Receipt, color: '#F97316' },
    { id: 'other', label: 'Other', icon: MoreHorizontal, color: '#64748B' },
];

export const REVENUE_SOURCES = [
    { id: 'ticket_sales', backend: 'ticket_sales', label: 'Ticket Sales (Auto)', icon: Ticket, color: '#02338D', auto: true },
    { id: 'sponsorship', backend: 'sponsorship', label: 'Sponsorship', icon: TrendingUp, color: '#16A34A' },
    { id: 'vendor', backend: 'vendor', label: 'Vendor Booth', icon: Tent, color: '#0EA5E9' },
    { id: 'donation', backend: 'donation', label: 'Donation', icon: DollarSign, color: '#7C3AED' },
    { id: 'grant', backend: 'other', label: 'Grant', icon: Receipt, color: '#C58B1A' },
    { id: 'merchandise', backend: 'other', label: 'Merchandise', icon: Receipt, color: '#EC4899' },
    { id: 'custom', backend: 'other', label: 'Custom', icon: MoreHorizontal, color: '#64748B', custom: true },
];

export const EMPTY_STATS = {
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

export const apiList = (value) => (Array.isArray(value) ? value : value?.results || []);

export const parseDateValue = (value) => {
    if (!value) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date;
};

export const buildRevenueSeriesFromEntries = (entries, range) => {
    const now = new Date();
    const buckets = [];
    const values = new Map();

    const addValue = (label, amount) => {
        values.set(label, (values.get(label) || 0) + amount);
    };

    if (range === 'month') {
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const label = `${d.getDate()} ${d.toLocaleString('default', { month: 'short' })}`;
            buckets.push({ label, rawDate: d.toDateString() });
        }
        entries.forEach((entry) => {
            const dt = parseDateValue(entry.created_at || entry.date);
            if (!dt) return;
            if ((now - dt) / (1000 * 60 * 60 * 24) <= 30) {
                const label = `${dt.getDate()} ${dt.toLocaleString('default', { month: 'short' })}`;
                addValue(label, Number(entry.amount || entry.total || 0));
            }
        });
    } else if (range === 'year') {
        for (let i = 11; i >= 0; i--) {
            const d = new Date(now);
            d.setMonth(d.getMonth() - i);
            const label = d.toLocaleString('default', { month: 'short' });
            buckets.push({ label, rawMonth: d.getMonth(), rawYear: d.getFullYear() });
        }
        entries.forEach((entry) => {
            const dt = parseDateValue(entry.created_at || entry.date);
            if (!dt) return;
            const msAge = now - dt;
            if (msAge <= 365 * 24 * 60 * 60 * 1000) {
                const label = dt.toLocaleString('default', { month: 'short' });
                addValue(label, Number(entry.amount || entry.total || 0));
            }
        });
    } else if (range === 'week') {
        for (let i = 6; i >= 0; i--) {
            const d = new Date(now);
            d.setDate(d.getDate() - i);
            const label = d.toLocaleString('default', { weekday: 'short' });
            buckets.push({ label, rawDate: d.toDateString() });
        }
        entries.forEach((entry) => {
            const dt = parseDateValue(entry.created_at || entry.date);
            if (!dt) return;
            if ((now - dt) / (1000 * 60 * 60 * 24) <= 7) {
                const label = dt.toLocaleString('default', { weekday: 'short' });
                addValue(label, Number(entry.amount || entry.total || 0));
            }
        });
    }

    return buckets.map((b) => ({
        name: b.label,
        amount: values.get(b.label) || 0,
    }));
};

export const normalizeRevenueSeries = (data) => {
    const arr = apiList(data);
    return arr.map((item) => ({
        name: item.name || item.date || item.label || 'Unknown',
        amount: Number(item.amount || item.total || 0),
    }));
};

export const extractPercentValue = (value) => {
    if (value === undefined || value === null) return 0;
    if (typeof value === 'object' && value !== null) {
        if ('value' in value) return Number(value.value) || 0;
        if ('percentage' in value) return Number(value.percentage) || 0;
        if ('current' in value && 'previous' in value) {
            const curr = Number(value.current) || 0;
            const prev = Number(value.previous) || 0;
            return computePercentChange(curr, prev);
        }
    }
    return Number(value) || 0;
};

export const computePercentChange = (current, previous) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
};

export const buildStatChanges = (statsData) => {
    const trends = statsData?.trends || {};

    const buildChange = (deltaKey, currentKey, snakeKey) => {
        if (trends[deltaKey] !== undefined) return extractPercentValue(trends[deltaKey]);
        const current =
            statsData?.kpis?.[currentKey] ||
            statsData?.kpis?.[snakeKey] ||
            statsData?.[currentKey] ||
            statsData?.[snakeKey] ||
            0;
        const previous =
            statsData?.previous_kpis?.[currentKey] ||
            statsData?.previous_kpis?.[snakeKey] ||
            0;
        return computePercentChange(current, previous);
    };

    return {
        soldChange: buildChange('tickets_delta', 'totalAttendees', 'total_attendees'),
        revenueChange: buildChange('revenue_delta', 'totalRevenue', 'total_revenue'),
        expenseChange: buildChange('expenses_delta', 'totalExpenses', 'total_expenses'),
        profitChange: buildChange('profit_delta', 'netProfit', 'net_profit'),
    };
};

export const normalizeStats = (stats) => ({
    totalEvents: stats.totalEvents ?? stats.total_events ?? 0,
    publishedEvents: stats.publishedEvents ?? stats.published_events ?? 0,
    draftEvents: stats.draftEvents ?? stats.draft_events ?? 0,
    totalAttendees: stats.totalAttendees ?? stats.total_attendees ?? 0,
    totalCheckins: stats.totalCheckins ?? stats.total_checkins ?? 0,
    checkinPercent: stats.checkinPercent ?? stats.checkin_percent ?? 0,
    totalRevenue: stats.totalRevenue ?? stats.total_revenue ?? 0,
    totalExpenses: stats.totalExpenses ?? stats.total_expenses ?? 0,
    netProfit: stats.netProfit ?? stats.net_profit ?? 0,
});

export const normalizeEvent = (event) => {
    const mapped = mapEvent(event);
    return {
        ...mapped,
        // Ensure legacy dashboard keys are present if components read them directly
        categoryName: mapped.categoryName,
        date: mapped.formattedDate || mapped.date,
        ticketsSold: mapped.ticketsSold,
        revenue: mapped.revenue,
    };
};

