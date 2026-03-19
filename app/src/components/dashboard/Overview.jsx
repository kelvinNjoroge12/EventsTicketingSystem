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
  PieChart,
  Pie,
  Cell,
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
        'overflow-hidden transition-all duration-500 hover:-translate-y-1 hover:shadow-lg group',
        animated ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
      )}
    >
      <CardContent className="p-4 lg:p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-1 lg:space-y-2">
            <p className="text-xs lg:text-sm text-gray-500">{title}</p>
            <h3 className="text-xl lg:text-2xl font-bold text-[#0F172A]">{value}</h3>
            {subtitle && <p className="text-xs text-gray-400">{subtitle}</p>}
          </div>
          <div className="w-10 h-10 lg:w-12 lg:h-12 rounded-xl bg-gradient-to-br from-[#02338D] to-[#7C3AED] flex items-center justify-center group-hover:scale-110 transition-transform">
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
      return 'bg-[#C58B1A]/20 text-[#02338D]';
    case 'completed':
      return 'bg-gray-500 text-white';
    case 'draft':
      return 'bg-gray-200 text-gray-700';
    default:
      return 'bg-gray-500 text-white';
  }
};

const buildCategoryData = (breakdown = []) => {
  if (!Array.isArray(breakdown) || breakdown.length === 0) return [];
  const filtered = breakdown.filter((item) => Number(item.count || 0) > 0);
  if (filtered.length === 0) return [];
  const colors = {
    student: '#02338D',
    alumni: '#7C3AED',
    guest: '#C58B1A',
    uncategorized: '#94A3B8',
  };
  const total = filtered.reduce((sum, item) => sum + Number(item.count || 0), 0);
  if (total <= 0) return [];

  return filtered.map((item) => ({
    name: item.label || item.category || 'Unknown',
    value: Math.round((Number(item.count || 0) / total) * 100),
    color: colors[item.category] || '#0F4FA8',
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

  useEffect(() => {
    setMounted(true);
  }, []);

  const stats = analytics?.kpis || {};
  const alumniInsights = analytics?.alumni_insights || {};
  const breakdown = analytics?.category_breakdown || [];
  const options = filterOptions || {};

  const categoryData = useMemo(() => buildCategoryData(breakdown), [breakdown]);

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

  const alumniRegistration = alumniInsights.registration_vs_attendance || {};
  const alumniPercent = Number(alumniRegistration.percent || 0);
  const topClass = alumniInsights.most_engaged_class;
  const topYears = alumniInsights.top_graduation_years || [];
  const mostActiveAlumni = alumniInsights.most_active_alumni || [];

  const handleFilter = (field) => (event) => {
    if (!onFilterChange) return;
    onFilterChange(field, event.target.value);
  };

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#02338D] to-[#7C3AED] p-6 lg:p-8 text-white">
        <div className="relative z-10">
          <h2 className="text-xl lg:text-2xl font-bold mb-1">Welcome back!</h2>
          <p className="text-white/70 text-sm lg:text-base">Here is a snapshot of your attendee analytics.</p>
        </div>
        <div className="absolute top-0 right-0 w-48 lg:w-64 h-48 lg:h-64 bg-[#C58B1A]/10 rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-1/2 w-24 lg:w-32 h-24 lg:h-32 bg-white/5 rounded-full translate-y-1/2" />
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Analytics Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">My Event</label>
              <select
                value={filters?.eventId || ''}
                onChange={handleFilter('eventId')}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm bg-white"
              >
                <option value="">All Events</option>
                {events.map((eventItem) => (
                  <option key={eventItem.id} value={eventItem.id}>{eventItem.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Graduation Year</label>
              <select
                value={filters?.graduationYear || ''}
                onChange={handleFilter('graduationYear')}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm bg-white"
              >
                <option value="">All Years</option>
                {(options.graduation_years || []).map((year) => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Course</label>
              <select
                value={filters?.courseId || ''}
                onChange={handleFilter('courseId')}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm bg-white"
              >
                <option value="">All Courses</option>
                {(options.courses || []).map((course) => (
                  <option key={course.course_id || course.id} value={course.course_id || course.id}>
                    {course.course__name || course.name || 'Course'}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
              <select
                value={filters?.location || ''}
                onChange={handleFilter('location')}
                className="w-full px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm bg-white"
              >
                <option value="">All Locations</option>
                {(options.locations || []).map((loc) => (
                  <option key={loc.label} value={loc.label}>{loc.label}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3 lg:gap-6">
        {statsCards.map((stat, index) => (
          <StatCard
            key={stat.title}
            {...stat}
            delay={index * 100}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Attendees by Category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48 lg:h-64">
              {mounted && (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={categoryData} cx="50%" cy="50%" innerRadius={35} outerRadius={70} paddingAngle={4} dataKey="value">
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
                <p className="text-sm text-gray-500">No attendee data yet.</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Alumni Insights</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Events with alumni</span>
              <span className="font-semibold text-[#0F172A]">{formatNumber(alumniInsights.events_with_alumni || 0)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Most engaged class</span>
              <span className="font-semibold text-[#0F172A]">
                {topClass?.year ? `${topClass.year} (${formatNumber(topClass.count)})` : 'N/A'}
              </span>
            </div>
            <div className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">Registration vs attendance</span>
                <span className="font-semibold text-[#0F172A]">{alumniPercent}%</span>
              </div>
              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#C58B1A] rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, alumniPercent))}%` }}
                />
              </div>
              <div className="text-xs text-gray-400">
                {formatNumber(alumniRegistration.registered || 0)} registered, {formatNumber(alumniRegistration.checked_in || 0)} checked in
              </div>
            </div>
            {topYears.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Top graduation years</p>
                <div className="space-y-1">
                  {topYears.map((item) => (
                    <div key={item.year} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{item.year}</span>
                      <span className="font-medium text-[#0F172A]">{formatNumber(item.count)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {mostActiveAlumni.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-500 mb-1">Most active alumni</p>
                <div className="space-y-1">
                  {mostActiveAlumni.map((alumni) => (
                    <div key={alumni.email} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600 truncate max-w-[140px]">{alumni.email}</span>
                      <span className="font-medium text-[#0F172A]">{alumni.events} events</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
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
