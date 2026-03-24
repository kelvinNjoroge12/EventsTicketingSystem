import React, { useMemo, useState } from 'react';
import {
  DollarSign,
  Receipt,
  TrendingUp,
  Wallet,
  Calendar,
  Plus,
  ArrowUpRight,
  ArrowDownRight,
  Trash2,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { EXPENSE_CATEGORIES, REVENUE_SOURCES } from './dashboardUtils';

const formatMoney = (value) => `KES ${(Number(value) || 0).toLocaleString()}`;

const StatCard = ({ title, value, icon: Icon, subtitle, accent }) => (
  <Card className="border border-[#E2E8F0] shadow-none h-full">
    <CardContent className="px-3 py-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="space-y-0.5 min-w-0">
          <p className="text-[11px] text-gray-500 uppercase tracking-wide">{title}</p>
          <p className="text-sm lg:text-base font-bold text-[#0F172A] whitespace-nowrap">{value}</p>
          {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
        </div>
        <div className={cn('w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0', accent || 'bg-[#02338D]')}>
          <Icon className="w-3.5 h-3.5 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const FinanceOverview = ({
  events,
  stats,
  expenseBreakdown,
  revenueSeries,
  expenses,
  revenues,
  isLoadingStats,
  isLoadingExpenses,
  isLoadingRevenues,
  onOpenExpense,
  onOpenRevenue,
  onDeleteExpense,
  onDeleteRevenue,
}) => {
  const [entryView, setEntryView] = useState('all');

  const eventMap = useMemo(() => {
    const map = new Map();
    events.forEach((evt) => {
      map.set(String(evt.id), evt.name);
    });
    return map;
  }, [events]);

  const resolveEventName = (id) => eventMap.get(String(id)) || 'Event';
  const isLoadingEntries = isLoadingExpenses || isLoadingRevenues;

  const sortedExpenses = useMemo(() => {
    return [...expenses].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  }, [expenses]);

  const sortedRevenues = useMemo(() => {
    return [...revenues].sort((a, b) => new Date(b.date || b.created_at) - new Date(a.date || a.created_at));
  }, [revenues]);

  const revenueSeriesData = revenueSeries && revenueSeries.length > 0
    ? revenueSeries
    : [{ name: '0', revenue: 0 }];

  const expensesByCategory = expenseBreakdown || [];
  const totalExpenseAmount = expensesByCategory.reduce((sum, item) => sum + Number(item.amount || 0), 0);

  const statsCards = [
    {
      title: 'Total Revenue',
      value: isLoadingStats ? '...' : formatMoney(stats.totalRevenue ?? 0),
      icon: DollarSign,
      accent: 'bg-[#16A34A]',
    },
    {
      title: 'Ticket Revenue',
      value: isLoadingStats ? '...' : formatMoney(stats.ticketRevenue ?? 0),
      icon: TrendingUp,
      accent: 'bg-[#02338D]',
    },
    {
      title: 'Manual Revenue',
      value: isLoadingStats ? '...' : formatMoney(stats.manualRevenue ?? 0),
      icon: ArrowUpRight,
      accent: 'bg-[#0EA5E9]',
    },
    {
      title: 'Total Expenses',
      value: isLoadingStats ? '...' : formatMoney(stats.totalExpenses ?? 0),
      icon: Receipt,
      accent: 'bg-[#B91C1C]',
    },
    {
      title: 'Net Profit',
      value: isLoadingStats ? '...' : formatMoney(stats.netProfit ?? 0),
      icon: Wallet,
      accent: 'bg-[#C58B1A]',
    },
    {
      title: 'Total Events',
      value: isLoadingStats ? '...' : String(stats.totalEvents ?? 0),
      icon: Calendar,
      accent: 'bg-[#7C3AED]',
    },
  ];

  const expenseCategoryLabel = (category) => {
    const found = EXPENSE_CATEGORIES.find((item) => item.id === category);
    return found?.label || category || 'Other';
  };

  const expenseCategoryColor = (category) => {
    const found = EXPENSE_CATEGORIES.find((item) => item.id === category);
    return found?.color || '#94A3B8';
  };

  const revenueSourceLabel = (source) => {
    const found = REVENUE_SOURCES.find((item) => item.backend === source || item.id === source);
    return found?.label || source || 'Revenue';
  };

  return (
    <div className="space-y-3 lg:space-y-4">
      <Card className="border border-[#E2E8F0] shadow-none">
        <CardContent className="px-2.5 py-1.5">
          <div className="flex items-center justify-end gap-1.5">
            <Button variant="outline" onClick={onOpenExpense} className="h-8 px-2.5 text-[11px]">
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Expense
          </Button>
            <Button className="h-8 px-2.5 bg-[#C58B1A] hover:bg-[#A56F14] text-white text-[11px]" onClick={onOpenRevenue}>
            <Plus className="w-3.5 h-3.5 mr-1.5" />
            Add Revenue
          </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
        {statsCards.map((stat) => (
          <StatCard key={stat.title} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-3">
        <Card className="xl:col-span-3">
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm lg:text-base font-bold text-[#0F172A]">Revenue Trend</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <div className="h-44 lg:h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueSeriesData}>
                  <defs>
                    <linearGradient id="financeRevenue" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C58B1A" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#C58B1A" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" stroke="#999" fontSize={12} />
                  <YAxis stroke="#999" fontSize={12} />
                  <Tooltip formatter={(value) => formatMoney(value)} />
                  <Area type="monotone" dataKey="revenue" stroke="#C58B1A" strokeWidth={2} fillOpacity={1} fill="url(#financeRevenue)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 px-4 pt-3">
            <CardTitle className="text-sm lg:text-base font-bold text-[#0F172A]">Expense Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 px-4 pb-3">
            {expensesByCategory.length > 0 ? expensesByCategory.map((item) => {
              const percent = totalExpenseAmount > 0 ? Math.round((Number(item.amount || 0) / totalExpenseAmount) * 100) : 0;
              return (
                <div key={item.category} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-gray-600">{expenseCategoryLabel(item.category)}</span>
                    <span className="font-semibold text-[#0F172A]">{formatMoney(item.amount)}</span>
                  </div>
                  <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${percent}%`, backgroundColor: expenseCategoryColor(item.category) }}
                    />
                  </div>
                </div>
              );
            }) : (
              <p className="text-sm text-gray-500">No expenses recorded yet.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Entries</CardTitle>
            <p className="text-sm text-gray-500">All revenue and expense activity.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: 'all', label: 'All' },
              { id: 'revenues', label: 'Revenue' },
              { id: 'expenses', label: 'Expenses' },
            ].map((option) => (
              <button
                key={option.id}
                onClick={() => setEntryView(option.id)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium border transition-all',
                  entryView === option.id
                    ? 'bg-[#02338D] text-white border-[#02338D]'
                    : 'bg-white text-gray-500 border-[#E2E8F0] hover:border-[#C58B1A]/40'
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent>
          {isLoadingEntries ? (
            <p className="text-sm text-gray-500">Loading entries...</p>
          ) : (
            <div className="space-y-3">
              {(entryView === 'all' || entryView === 'revenues') && sortedRevenues.map((item) => (
                <div key={`rev-${item.id}`} className="flex items-center justify-between border border-[#E2E8F0] rounded-xl p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ArrowUpRight className="w-4 h-4 text-green-600" />
                      <p className="font-semibold text-[#0F172A] text-sm">{revenueSourceLabel(item.source)}</p>
                      <Badge className="text-xs bg-green-100 text-green-700" variant="outline">Revenue</Badge>
                    </div>
                    <p className="text-xs text-gray-500">{resolveEventName(item.event)} • {item.date || item.created_at || ''}</p>
                    {item.description && <p className="text-xs text-gray-400 mt-1">{item.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-green-600 whitespace-nowrap">+ {formatMoney(item.amount)}</span>
                    <button onClick={() => onDeleteRevenue(item.id)} className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {(entryView === 'all' || entryView === 'expenses') && sortedExpenses.map((item) => (
                <div key={`exp-${item.id}`} className="flex items-center justify-between border border-[#E2E8F0] rounded-xl p-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <ArrowDownRight className="w-4 h-4 text-red-600" />
                      <p className="font-semibold text-[#0F172A] text-sm">{expenseCategoryLabel(item.category)}</p>
                      <Badge className="text-xs bg-red-100 text-red-700" variant="outline">Expense</Badge>
                    </div>
                    <p className="text-xs text-gray-500">{resolveEventName(item.event)} • {item.date || item.created_at || ''}</p>
                    {item.description && <p className="text-xs text-gray-400 mt-1">{item.description}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-red-600 whitespace-nowrap">- {formatMoney(item.amount)}</span>
                    <button onClick={() => onDeleteExpense(item.id)} className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}

              {sortedExpenses.length === 0 && sortedRevenues.length === 0 && (
                <p className="text-sm text-gray-500">No entries recorded yet.</p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FinanceOverview;
