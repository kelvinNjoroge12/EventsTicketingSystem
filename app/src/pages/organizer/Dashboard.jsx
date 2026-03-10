import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Users,
  CheckCircle,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowRight,
  MapPin,
  Clock,
  Receipt,
  Wallet,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

const formatMoney = (value) => `KES ${(Number(value) || 0).toLocaleString()}`;

const StatCard = ({ title, value, change, changeType, icon: Icon, delay }) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Card
      className={cn(
        'overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-lg group',
        animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 lg:space-y-2">
            <p className="text-xs lg:text-sm text-gray-500">{title}</p>
            <h3 className="text-xl lg:text-2xl font-bold text-[#0F172A]">{value}</h3>
            <div
              className={cn(
                'flex items-center gap-1 text-xs font-medium',
                changeType === 'positive' ? 'text-green-600' : 'text-red-600'
              )}
            >
              {changeType === 'positive' ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
              <span>{change}</span>
              <span className="text-gray-400 ml-1 hidden sm:inline">vs last month</span>
            </div>
          </div>
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-[#1E4DB7] to-[#7C3AED] flex items-center justify-center group-hover:scale-110 transition-transform">
            <Icon className="w-5 h-5 lg:w-6 lg:h-6 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case 'live':
      return 'bg-green-500 text-white';
    case 'upcoming':
      return 'bg-[#C58B1A]/20 text-[#1E4DB7]';
    case 'completed':
      return 'bg-gray-500 text-white';
    case 'draft':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-gray-500 text-white';
  }
};

const buildCategoryData = (events) => {
  if (!events || events.length === 0) return [];
  const counts = events.reduce((acc, event) => {
    const key = event.category || 'Other';
    acc[key] = (acc[key] || 0) + 1;
    return acc;
  }, {});
  const entries = Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);
  const total = events.length;
  const colors = ['#1E4DB7', '#7C3AED', '#C58B1A', '#0F4FA8', '#B91C1C'];

  const data = entries.map(([name, count], index) => ({
    name,
    value: Math.round((count / total) * 100),
    color: colors[index % colors.length],
  }));

  const used = entries.reduce((sum, [, count]) => sum + count, 0);
  if (used < total) {
    data.push({
      name: 'Other',
      value: Math.max(1, Math.round(((total - used) / total) * 100)),
      color: '#94A3B8',
    });
  }
  return data;
};

const emptyRevenueSeries = [
  { name: 'Mon', revenue: 0 },
  { name: 'Tue', revenue: 0 },
  { name: 'Wed', revenue: 0 },
  { name: 'Thu', revenue: 0 },
  { name: 'Fri', revenue: 0 },
  { name: 'Sat', revenue: 0 },
  { name: 'Sun', revenue: 0 },
];

const OrganizerDashboardOverview = ({ events, stats, onEventClick, onViewAll, isLoadingStats, revenueSeries }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const categoryData = useMemo(() => buildCategoryData(events), [events]);
  const recentEvents = events.slice(0, 4);

  const statsCards = [
    {
      title: 'Total Events',
      value: isLoadingStats ? '...' : String(stats.totalEvents ?? 0),
      change: '+12%',
      changeType: 'positive',
      icon: Calendar,
    },
    {
      title: 'Total Guests',
      value: isLoadingStats ? '...' : Number(stats.totalAttendees ?? 0).toLocaleString(),
      change: '+8%',
      changeType: 'positive',
      icon: Users,
    },
    {
      title: 'Total Check-ins',
      value: isLoadingStats ? '...' : Number(stats.totalCheckins ?? 0).toLocaleString(),
      change: '+15%',
      changeType: 'positive',
      icon: CheckCircle,
    },
    {
      title: 'Revenue',
      value: isLoadingStats ? '...' : formatMoney(stats.totalRevenue ?? 0),
      change: '+23%',
      changeType: 'positive',
      icon: DollarSign,
    },
    {
      title: 'Expenses',
      value: isLoadingStats ? '...' : formatMoney(stats.totalExpenses ?? 0),
      change: '+5%',
      changeType: 'negative',
      icon: Receipt,
    },
    {
      title: 'Net Profit',
      value: isLoadingStats ? '...' : formatMoney(stats.netProfit ?? 0),
      change: '+11%',
      changeType: 'positive',
      icon: Wallet,
    },
  ];

  const chartData = revenueSeries && revenueSeries.length > 0 ? revenueSeries : emptyRevenueSeries;

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#1E4DB7] to-[#7C3AED] p-6 lg:p-8 text-white">
        <div className="relative z-10">
          <h2 className="text-xl lg:text-2xl font-bold mb-1">Welcome back!</h2>
          <p className="text-white/70 text-sm lg:text-base">Here is what is happening with your events today.</p>
        </div>
        <div className="absolute top-0 right-0 w-48 lg:w-64 h-48 lg:h-64 bg-[#C58B1A]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/2 w-24 lg:w-32 h-24 lg:h-32 bg-white/5 rounded-full translate-y-1/2" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        {statsCards.map((stat, index) => (
          <StatCard key={stat.title} {...stat} delay={index * 100} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Revenue Overview</CardTitle>
            <div className="flex gap-1 lg:gap-2">
              <Button variant="outline" size="sm" className="text-xs h-7 lg:h-8">Week</Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs bg-[#C58B1A] text-white border-[#C58B1A] h-7 lg:h-8"
              >
                Month
              </Button>
              <Button variant="outline" size="sm" className="text-xs h-7 lg:h-8">Year</Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-48 lg:h-64">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#C58B1A" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#C58B1A" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis dataKey="name" stroke="#999" fontSize={12} />
                    <YAxis stroke="#999" fontSize={12} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#fff',
                        border: '1px solid #e0e0e0',
                        borderRadius: '8px',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                      }}
                      formatter={(value) => formatMoney(value)}
                    />
                    <Area
                      type="monotone"
                      dataKey="revenue"
                      stroke="#C58B1A"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Events by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-40 lg:h-48">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={4} dataKey="value">
                      {categoryData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="mt-2 lg:mt-4 space-y-1 lg:space-y-2">
              {categoryData.map((cat) => (
                <div key={cat.name} className="flex items-center justify-between text-xs lg:text-sm">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                    <span className="text-gray-600">{cat.name}</span>
                  </div>
                  <span className="font-medium text-[#0F172A]">{cat.value}%</span>
                </div>
              ))}
              {categoryData.length === 0 && (
                <p className="text-sm text-gray-500">No categories yet.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Recent Events</CardTitle>
          <Button
            variant="ghost"
            className="text-[#1E4DB7] hover:text-[#C58B1A] group text-xs lg:text-sm h-8 lg:h-9"
            onClick={onViewAll}
          >
            View All
            <ArrowRight className="w-3 h-3 lg:w-4 lg:h-4 ml-1 group-hover:translate-x-1 transition-transform" />
          </Button>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500">Event</th>
                  <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500 hidden sm:table-cell">Date</th>
                  <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Location</th>
                  <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500">Status</th>
                  <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500 hidden sm:table-cell">Tickets</th>
                  <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.map((event) => (
                  <tr
                    key={event.id}
                    className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors group cursor-pointer"
                    onClick={() => onEventClick(event)}
                  >
                    <td className="py-2 lg:py-4 px-3 lg:px-4">
                      <div className="flex items-center gap-2 lg:gap-3">
                        {event.image ? (
                          <img
                            src={event.image}
                            alt={event.name}
                            className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg bg-[#1E4DB7]/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-[#1E4DB7]" />
                          </div>
                        )}
                        <span className="font-medium text-[#0F172A] text-sm lg:text-base group-hover:text-[#C58B1A] transition-colors line-clamp-1">
                          {event.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 lg:py-4 px-3 lg:px-4 hidden sm:table-cell">
                      <div className="flex flex-col">
                        <span className="text-xs lg:text-sm text-gray-700">{event.date}</span>
                        <span className="text-xs text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {event.time || '—'}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 lg:py-4 px-3 lg:px-4 hidden md:table-cell">
                      <span className="text-xs lg:text-sm text-gray-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        {event.location || 'Online'}
                      </span>
                    </td>
                    <td className="py-2 lg:py-4 px-3 lg:px-4">
                      <Badge className={cn('capitalize text-xs', getStatusColor(event.status))}>{event.status}</Badge>
                    </td>
                    <td className="py-2 lg:py-4 px-3 lg:px-4 hidden sm:table-cell">
                      <div className="flex items-center gap-2">
                        <span className="text-xs lg:text-sm font-medium text-[#0F172A]">
                          {event.ticketsSold}/{event.totalTickets || 0}
                        </span>
                        <div className="w-12 lg:w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-[#C58B1A] rounded-full"
                            style={{
                              width: event.totalTickets ? `${(event.ticketsSold / event.totalTickets) * 100}%` : '0%',
                            }}
                          />
                        </div>
                      </div>
                    </td>
                    <td className="py-2 lg:py-4 px-3 lg:px-4">
                      <span className="text-xs lg:text-sm font-medium text-[#0F172A]">
                        {formatMoney(event.revenue)}
                      </span>
                    </td>
                  </tr>
                ))}
                {recentEvents.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-sm text-gray-500">
                      No events yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizerDashboardOverview;
