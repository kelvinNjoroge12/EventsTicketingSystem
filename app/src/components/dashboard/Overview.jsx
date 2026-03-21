import React, { useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  Users,
  CheckCircle,
  ArrowRight,
  MapPin,
  Clock,
  GraduationCap,
  Ticket,
  Award,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  CartesianGrid,
  XAxis,
  YAxis,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';

const StatCard = ({ title, value, icon: Icon, delay, subtitle }) => {
  const [animated, setAnimated] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimated(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <Card
      className={cn(
        'overflow-hidden border border-[#E2E8F0] transition-all duration-500 hover:-translate-y-0.5 hover:shadow-md group',
        animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      )}
    >
      <CardContent className="p-2 lg:p-2.5">
        <div className="flex items-center justify-between gap-2 lg:gap-3">
          <div className="space-y-0 w-full">
            <p className="text-[10px] lg:text-[11px] font-medium text-gray-500">{title}</p>
            <h3 className="text-sm lg:text-base font-semibold text-[#0F172A] leading-tight text-center">{value}</h3>
            {subtitle && <p className="text-[10px] text-gray-400">{subtitle}</p>}
          </div>
          <div className="w-7 h-7 lg:w-8 lg:h-8 rounded-lg bg-gradient-to-br from-[#02338D] to-[#7C3AED] flex items-center justify-center shrink-0">
            <Icon className="w-3.5 h-3.5 lg:w-4 lg:h-4 text-white" />
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
      return 'bg-[#C58B1A]/20 text-[#02338D]';
    case 'completed':
      return 'bg-gray-500 text-white';
    case 'draft':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-gray-500 text-white';
  }
};

const buildEngagementSeries = (payload, category) => {
  if (!payload || typeof payload !== 'object') return [];
  const categories = payload.categories || {};
  const series = categories[category] || categories.all || payload.series || [];
  if (!Array.isArray(series)) return [];
  return series.map((item) => ({
    name: item.label || item.name || item.month || '',
    current: Number(item.current ?? item.current_year ?? item.value ?? 0),
    previous: Number(item.previous ?? item.previous_year ?? 0),
  }));
};

const OrganizerDashboardOverview = ({
  events,
  analytics,
  isLoading,
  filters,
  filterOptions,
  onFilterChange,
  onEventClick,
  onViewAll,
}) => {
  const [mounted, setMounted] = useState(false);
  const [engagementCategory, setEngagementCategory] = useState('all');

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = analytics?.kpis || {};
  const options = filterOptions || {};
  const engagementPayload = analytics?.engagement_over_time || {};
  const engagementSeries = useMemo(
    () => buildEngagementSeries(engagementPayload, engagementCategory),
    [engagementPayload, engagementCategory]
  );
  const engagementHasData = engagementSeries.some((item) => (item.current || 0) > 0 || (item.previous || 0) > 0);
  const currentYearLabel = engagementPayload.current_year || new Date().getFullYear();
  const previousYearLabel = engagementPayload.previous_year || currentYearLabel - 1;

  const engagedSchools = analytics?.most_engaged_schools || analytics?.top_schools || [];
  const schoolSeries = useMemo(() => {
    if (!Array.isArray(engagedSchools)) return [];
    return engagedSchools.map((item) => ({
      name: item.school || item.name || item.label || 'School',
      count: Number(item.count ?? item.total ?? 0),
    }));
  }, [engagedSchools]);

  const filteredEvents = useMemo(() => {
    let list = events;
    if (filters?.eventId) {
      list = list.filter((eventItem) =>
        String(eventItem.id) === String(filters.eventId) ||
        String(eventItem.slug) === String(filters.eventId)
      );
    }
    if (filters?.location) {
      const query = String(filters.location).toLowerCase();
      list = list.filter((eventItem) =>
        String(eventItem.location || '').toLowerCase().includes(query)
      );
    }
    return list;
  }, [events, filters?.eventId, filters?.location]);

  const recentEvents = filteredEvents.slice(0, 4);

  const formatNumber = (value) => Number(value || 0).toLocaleString();

  const statsCards = [
    {
      title: 'Total Events',
      value: isLoading ? '...' : formatNumber(stats.total_events ?? stats.totalEvents ?? 0),
      icon: Calendar,
    },
    {
      title: 'Total Attendees',
      value: isLoading ? '...' : formatNumber(stats.total_attendees ?? stats.totalAttendees ?? 0),
      icon: Users,
    },
    {
      title: 'Total Alumni',
      value: isLoading ? '...' : formatNumber(stats.total_alumni ?? stats.totalAlumni ?? 0),
      icon: Award,
    },
    {
      title: 'Total Students',
      value: isLoading ? '...' : formatNumber(stats.total_students ?? stats.totalStudents ?? 0),
      icon: GraduationCap,
    },
    {
      title: 'Total Guests',
      value: isLoading ? '...' : formatNumber(stats.total_guests ?? stats.totalGuests ?? 0),
      icon: Ticket,
    },
    {
      title: 'Check-in Rate',
      value: isLoading ? '...' : `${stats.checkin_percent ?? stats.checkinPercent ?? 0}%`,
      icon: CheckCircle,
    },
  ];

  const handleFilter = (field) => (event) => {
    if (!onFilterChange) return;
    onFilterChange(field, event.target.value);
  };

  return (
    <div className="space-y-2">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#02338D] to-[#7C3AED] px-4 py-2 lg:px-6 text-white flex items-center min-h-[52px]">
        <div className="relative z-10 w-full flex items-baseline justify-between">
          <div className="flex items-baseline gap-2">
            <h2 className="text-sm lg:text-base font-semibold">Welcome back!</h2>
            <p className="text-white/80 text-[10px] lg:text-xs">Here is a snapshot of your attendee analytics.</p>
          </div>
        </div>
        <div className="absolute top-0 right-0 w-32 h-32 bg-[#C58B1A]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-2xl p-1.5 lg:p-2">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-1.5 lg:gap-2">
          <select
            value={filters?.eventId || ''}
            onChange={handleFilter('eventId')}
            className="w-full px-3 py-1.5 lg:py-2 border border-[#E2E8F0] rounded-full text-[11px] lg:text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-[#02338D] outline-none hover:bg-white transition-colors cursor-pointer"
          >
            <option value="">All Events</option>
            {events.map((eventItem) => (
              <option key={eventItem.id} value={eventItem.id}>{eventItem.name}</option>
            ))}
          </select>

          <select
            value={filters?.graduationYear || ''}
            onChange={handleFilter('graduationYear')}
            className="w-full px-3 py-1.5 lg:py-2 border border-[#E2E8F0] rounded-full text-[11px] lg:text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-[#02338D] outline-none hover:bg-white transition-colors cursor-pointer"
          >
            <option value="">All Years</option>
            {(options.graduation_years || []).map((year) => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>

          <select
            value={filters?.courseId || ''}
            onChange={handleFilter('courseId')}
            className="w-full px-3 py-1.5 lg:py-2 border border-[#E2E8F0] rounded-full text-[11px] lg:text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-[#02338D] outline-none hover:bg-white transition-colors cursor-pointer"
          >
            <option value="">All Courses</option>
            {(options.courses || []).map((course) => (
              <option key={course.course_id || course.id} value={course.course_id || course.id}>
                {course.course__name || course.name || 'Course'}
              </option>
            ))}
          </select>

          <select
            value={filters?.location || ''}
            onChange={handleFilter('location')}
            className="w-full px-3 py-1.5 lg:py-2 border border-[#E2E8F0] rounded-full text-[11px] lg:text-xs bg-gray-50/50 focus:bg-white focus:ring-1 focus:ring-[#02338D] outline-none hover:bg-white transition-colors cursor-pointer"
          >
            <option value="">All Locations</option>
            {(options.locations || []).map((loc) => (
              <option key={loc.label} value={loc.label}>{loc.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2">
        {statsCards.map((stat, index) => (
          <StatCard
            key={stat.title}
            {...stat}
            delay={index * 100}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5 lg:gap-3">
        <Card className="lg:col-span-2 border border-[#E2E8F0]">
          <CardHeader className="pb-1.5">
            <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
              <CardTitle className="text-sm lg:text-base font-semibold text-[#0F172A]">
                Engagement Over Time
              </CardTitle>
              <div className="flex items-center gap-1">
                {['all', 'alumni', 'student', 'guest'].map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setEngagementCategory(item)}
                    className={cn(
                      'px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors',
                      engagementCategory === item
                        ? 'bg-[#02338D] text-white border-[#02338D]'
                        : 'bg-white text-gray-500 border-[#E2E8F0] hover:text-[#0F172A]'
                    )}
                  >
                    {item === 'all' ? 'All' : item.charAt(0).toUpperCase() + item.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-1.5">
            <div className="h-36 lg:h-40">
              {mounted && engagementSeries.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={engagementSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={11} />
                    <YAxis stroke="#94A3B8" fontSize={11} />
                    <Tooltip />
                    <Legend formatter={(value) => (value === 'current' ? `${currentYearLabel}` : `${previousYearLabel}`)} />
                    <Line type="monotone" dataKey="current" stroke="#02338D" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="previous" stroke="#C58B1A" strokeWidth={2} strokeDasharray="5 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              )}
              {(!mounted || !engagementHasData) && (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                  No engagement data yet.
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-[#E2E8F0]">
          <CardHeader className="pb-1.5">
            <CardTitle className="text-sm lg:text-base font-semibold text-[#0F172A]">
              Most Engaged Schools
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-1.5">
            <div className="h-36 lg:h-40">
              {mounted && schoolSeries.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={schoolSeries} layout="vertical" margin={{ left: 16, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                    <XAxis type="number" stroke="#94A3B8" fontSize={11} />
                    <YAxis type="category" dataKey="name" width={110} stroke="#94A3B8" fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="count" fill="#7C3AED" radius={[4, 4, 4, 4]} />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-gray-500">
                  No school data yet.
                </div>
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
            className="text-[#02338D] hover:text-[#C58B1A] group text-xs lg:text-sm h-8 lg:h-9"
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
                  <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500 hidden sm:table-cell">Attendees</th>
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
                          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-lg bg-[#02338D]/10 flex items-center justify-center">
                            <Calendar className="w-5 h-5 text-[#02338D]" />
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
                          {event.time || '-'}
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
                          {event.ticketsSold || 0}
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
                  </tr>
                ))}
                {recentEvents.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-sm text-gray-500">
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
