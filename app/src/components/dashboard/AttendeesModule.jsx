import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  BookOpen,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Filter,
  GraduationCap,
  Search,
  Users,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { api } from '@/lib/apiClient';

const PAGE_SIZE = 25;
const CURRENT_YEAR = new Date().getFullYear();

const toArray = (value) => (Array.isArray(value) ? value : []);

const formatDateTime = (value) => {
  if (!value) return 'N/A';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'N/A';
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const formatDate = (value) => {
  if (!value) return 'Date not set';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Date not set';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
};

const attendanceBadgeClass = (status) =>
  status === 'checked_in'
    ? 'bg-green-100 text-green-700 border-green-200'
    : 'bg-amber-100 text-amber-700 border-amber-200';

const ticketStatusBadgeClass = (status) => {
  if (status === 'used') return 'bg-emerald-100 text-emerald-700 border-emerald-200';
  if (status === 'valid') return 'bg-blue-100 text-blue-700 border-blue-200';
  if (status === 'expired') return 'bg-gray-100 text-gray-700 border-gray-200';
  if (status === 'cancelled' || status === 'refunded') return 'bg-red-100 text-red-700 border-red-200';
  return 'bg-slate-100 text-slate-700 border-slate-200';
};

const OrganizerAttendeesModule = ({ events = [] }) => {
  const [filters, setFilters] = useState({
    page: 1,
    q: '',
    eventId: '',
    year: String(CURRENT_YEAR),
    courseId: '',
    schoolId: '',
    graduationYear: '',
    relationship: '',
    attendanceStatus: '',
    ticketStatus: '',
  });
  const [expandedAttendeeId, setExpandedAttendeeId] = useState(null);

  const attendeesParams = useMemo(() => {
    const params = new URLSearchParams();
    params.set('page', String(filters.page));
    params.set('page_size', String(PAGE_SIZE));
    if (filters.q.trim()) params.set('q', filters.q.trim());
    if (filters.eventId) params.set('event_id', filters.eventId);
    if (filters.year) params.set('year', filters.year);
    if (filters.courseId) params.set('course_id', filters.courseId);
    if (filters.schoolId) params.set('school_id', filters.schoolId);
    if (filters.graduationYear) params.set('graduation_year', filters.graduationYear);
    if (filters.relationship) params.set('relationship', filters.relationship);
    if (filters.attendanceStatus) params.set('attendance_status', filters.attendanceStatus);
    if (filters.ticketStatus) params.set('ticket_status', filters.ticketStatus);
    return params.toString();
  }, [filters]);

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['organizer_attendees_module', filters],
    queryFn: () => api.get(`/api/finances/attendees/?${attendeesParams}`),
    staleTime: 60 * 1000,
    placeholderData: (previous) => previous,
  });

  const attendees = toArray(data?.results);
  const totalCount = Number(data?.count || 0);
  const totalPages = Math.max(1, Number(data?.total_pages || 1));
  const filterOptions = data?.filters || {};

  useEffect(() => {
    if (filters.page <= totalPages) return;
    setFilters((prev) => ({ ...prev, page: totalPages }));
  }, [filters.page, totalPages]);

  const yearOptions = useMemo(() => {
    const backendYears = toArray(filterOptions.years).map((item) => Number(item)).filter(Number.isFinite);
    if (backendYears.length > 0) return backendYears;
    const localYears = events
      .map((eventItem) => Number(eventItem.year))
      .filter(Number.isFinite)
      .sort((a, b) => b - a);
    return localYears.length > 0 ? [...new Set(localYears)] : [CURRENT_YEAR];
  }, [events, filterOptions.years]);

  const eventOptions = useMemo(() => {
    const backendEvents = toArray(filterOptions.events);
    if (backendEvents.length > 0) return backendEvents;
    return events.map((eventItem) => ({
      id: eventItem.id,
      title: eventItem.name || eventItem.title || 'Event',
      year: eventItem.year || null,
    }));
  }, [events, filterOptions.events]);

  const courseOptions = useMemo(
    () =>
      toArray(filterOptions.courses).map((item) => ({
        id: item.id || item.course_id,
        name: item.name || item.course__name || 'Course',
      })),
    [filterOptions.courses]
  );

  const schoolOptions = useMemo(
    () =>
      toArray(filterOptions.schools).map((item) => ({
        id: item.id || item.school_id,
        name: item.name || item.school__name || 'School',
      })),
    [filterOptions.schools]
  );

  const graduationYearOptions = useMemo(
    () => toArray(filterOptions.graduation_years).map((item) => Number(item)).filter(Number.isFinite),
    [filterOptions.graduation_years]
  );

  const relationshipOptions = useMemo(
    () =>
      toArray(filterOptions.relationships).map((item) => ({
        value: item.value,
        label: item.label || item.value || 'Relationship',
      })),
    [filterOptions.relationships]
  );

  const attendanceOptions = useMemo(() => {
    const backend = toArray(filterOptions.attendance_statuses).map((item) => ({
      value: item.value,
      label: item.label || item.value,
    }));
    if (backend.length > 0) return backend;
    return [
      { value: 'checked_in', label: 'Checked In' },
      { value: 'not_checked_in', label: 'Not Checked In' },
    ];
  }, [filterOptions.attendance_statuses]);

  const ticketStatusOptions = useMemo(() => {
    const backend = toArray(filterOptions.ticket_statuses).map((item) => ({
      value: item.value,
      label: item.label || item.value,
    }));
    if (backend.length > 0) return backend;
    return [
      { value: 'valid', label: 'Valid' },
      { value: 'used', label: 'Used' },
      { value: 'expired', label: 'Expired' },
      { value: 'cancelled', label: 'Cancelled' },
      { value: 'refunded', label: 'Refunded' },
    ];
  }, [filterOptions.ticket_statuses]);

  const updateFilter = (field, value) => {
    setExpandedAttendeeId(null);
    setFilters((prev) => ({ ...prev, [field]: value, page: 1 }));
  };

  const startRow = totalCount === 0 ? 0 : (filters.page - 1) * PAGE_SIZE + 1;
  const endRow = Math.min(filters.page * PAGE_SIZE, totalCount);

  return (
    <div className="space-y-4 lg:space-y-6">
      <Card className="border border-[#E2E8F0]">
        <CardContent className="p-4 lg:p-5 flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-1">
            <h2 className="text-lg lg:text-xl font-bold text-[#0F172A] flex items-center gap-2">
              <Users className="w-5 h-5 text-[#02338D]" />
              Attendees Directory
            </h2>
            <p className="text-sm text-gray-500">
              Persistent attendee records for analytics. This module is read-only and does not allow deleting attendee data.
            </p>
          </div>
          <div className="text-xs text-gray-500 bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg px-3 py-2">
            {isFetching ? 'Refreshing...' : `${totalCount.toLocaleString()} total attendees`}
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#E2E8F0]">
        <CardHeader className="pb-3">
          <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A] flex items-center gap-2">
            <Filter className="w-4 h-4 text-[#02338D]" />
            Attendee Filters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={filters.q}
              onChange={(event) => updateFilter('q', event.target.value)}
              placeholder="Search by name, email, phone, order, admission, course, or school..."
              className="pl-10"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-2.5">
            <select
              value={filters.year}
              onChange={(event) => updateFilter('year', event.target.value)}
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All Event Years</option>
              {yearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select
              value={filters.eventId}
              onChange={(event) => updateFilter('eventId', event.target.value)}
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All Events</option>
              {eventOptions.map((eventItem) => (
                <option key={eventItem.id} value={eventItem.id}>
                  {eventItem.title}
                  {eventItem.year ? ` (${eventItem.year})` : ''}
                </option>
              ))}
            </select>

            <select
              value={filters.courseId}
              onChange={(event) => updateFilter('courseId', event.target.value)}
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All Courses</option>
              {courseOptions.map((course) => (
                <option key={course.id} value={course.id}>
                  {course.name}
                </option>
              ))}
            </select>

            <select
              value={filters.schoolId}
              onChange={(event) => updateFilter('schoolId', event.target.value)}
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All Schools</option>
              {schoolOptions.map((school) => (
                <option key={school.id} value={school.id}>
                  {school.name}
                </option>
              ))}
            </select>

            <select
              value={filters.graduationYear}
              onChange={(event) => updateFilter('graduationYear', event.target.value)}
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All Graduation Years</option>
              {graduationYearOptions.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <select
              value={filters.relationship}
              onChange={(event) => updateFilter('relationship', event.target.value)}
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All Relationships</option>
              {relationshipOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={filters.attendanceStatus}
              onChange={(event) => updateFilter('attendanceStatus', event.target.value)}
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All Attendance</option>
              {attendanceOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>

            <select
              value={filters.ticketStatus}
              onChange={(event) => updateFilter('ticketStatus', event.target.value)}
              className="w-full border border-[#E2E8F0] rounded-lg px-3 py-2 text-sm bg-white"
            >
              <option value="">All Ticket Status</option>
              {ticketStatusOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-[#E2E8F0]">
        <CardHeader className="pb-2">
          <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Attendee Records</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="py-10 text-center text-sm text-gray-500">Loading attendees...</div>
          ) : attendees.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">No attendees found for the selected filters.</div>
          ) : (
            <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
              <table className="w-full min-w-[980px]">
                <thead className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
                  <tr>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Attendee</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Relationship</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Academic</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Event</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Attendance</th>
                    <th className="text-left px-3 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Custom Questions</th>
                  </tr>
                </thead>
                <tbody>
                  {attendees.map((attendee) => {
                    const customAnswers = toArray(attendee.custom_answers);
                    const expanded = expandedAttendeeId === attendee.id;
                    return (
                      <React.Fragment key={attendee.id}>
                        <tr className="border-b border-[#F1F5F9] hover:bg-[#F8FAFC]/70">
                          <td className="px-3 py-3 align-top">
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-[#0F172A]">{attendee.attendee_name || 'Unnamed attendee'}</p>
                              <p className="text-xs text-gray-600">{attendee.attendee_email || 'No email'}</p>
                              <p className="text-xs text-gray-500">{attendee.attendee_phone || 'No phone'}</p>
                              <p className="text-[11px] text-gray-400">Order: {attendee.order_number || 'N/A'}</p>
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="space-y-1">
                              <Badge variant="outline" className="text-xs">
                                {attendee.relationship_label || attendee.category_label || 'Uncategorized'}
                              </Badge>
                              <p className="text-[11px] text-gray-500">{attendee.category_label || 'No category label'}</p>
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="space-y-1 text-xs text-gray-600">
                              <p className="flex items-center gap-1">
                                <BookOpen className="w-3.5 h-3.5 text-[#02338D]" />
                                {attendee.course_name || 'No course'}
                              </p>
                              <p className="flex items-center gap-1">
                                <Building2 className="w-3.5 h-3.5 text-[#7C3AED]" />
                                {attendee.school_name || 'No school'}
                              </p>
                              <p className="flex items-center gap-1">
                                <GraduationCap className="w-3.5 h-3.5 text-[#C58B1A]" />
                                {attendee.graduation_year || 'No graduation year'}
                              </p>
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="space-y-1">
                              <p className="text-sm text-[#0F172A] line-clamp-2">{attendee.event_title || 'Unknown event'}</p>
                              <p className="text-xs text-gray-500 flex items-center gap-1">
                                <CalendarDays className="w-3.5 h-3.5 text-[#02338D]" />
                                {formatDate(attendee.event_start_date)}
                              </p>
                              <p className="text-[11px] text-gray-400">Purchased: {formatDateTime(attendee.order_created_at)}</p>
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="space-y-1">
                              <Badge
                                variant="outline"
                                className={cn('text-xs border', attendanceBadgeClass(attendee.attendance_status))}
                              >
                                {attendee.attendance_status === 'checked_in' ? 'Checked In' : 'Not Checked In'}
                              </Badge>
                              <Badge
                                variant="outline"
                                className={cn('text-xs border capitalize', ticketStatusBadgeClass(attendee.ticket_status || attendee.status))}
                              >
                                {attendee.ticket_status || attendee.status || 'unknown'}
                              </Badge>
                            </div>
                          </td>
                          <td className="px-3 py-3 align-top">
                            <div className="space-y-2">
                              <p className="text-xs text-gray-600">{customAnswers.length} answered</p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs"
                                onClick={() => setExpandedAttendeeId((prev) => (prev === attendee.id ? null : attendee.id))}
                              >
                                {expanded ? 'Hide Details' : 'View Details'}
                              </Button>
                            </div>
                          </td>
                        </tr>

                        {expanded && (
                          <tr className="bg-[#F8FAFC] border-b border-[#F1F5F9]">
                            <td className="px-3 py-3" colSpan={6}>
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                <div className="border border-[#E2E8F0] rounded-lg p-3 bg-white">
                                  <p className="text-xs font-semibold text-[#0F172A] mb-2">Additional Fields</p>
                                  <div className="space-y-1.5 text-xs text-gray-600">
                                    <p>Admission Number: {attendee.admission_number || 'N/A'}</p>
                                    <p>Student Email: {attendee.student_email || 'N/A'}</p>
                                    <p>Location: {attendee.location_text || 'N/A'}</p>
                                    <p>City: {attendee.location_city || 'N/A'}</p>
                                    <p>Country: {attendee.location_country || 'N/A'}</p>
                                    <p>Payment Method: {attendee.payment_method || 'N/A'}</p>
                                    <p>Order Total: {attendee.order_total || '0.00'}</p>
                                  </div>
                                </div>
                                <div className="border border-[#E2E8F0] rounded-lg p-3 bg-white">
                                  <p className="text-xs font-semibold text-[#0F172A] mb-2">Custom Questions</p>
                                  {customAnswers.length > 0 ? (
                                    <div className="space-y-1.5 text-xs text-gray-600">
                                      {customAnswers.map((answer, index) => (
                                        <div key={`${attendee.id}-answer-${index}`} className="border border-[#F1F5F9] rounded-md p-2">
                                          <p className="font-medium text-[#0F172A]">{answer.question || 'Custom question'}</p>
                                          <p className="text-gray-500">{answer.value || 'No response'}</p>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-500">No custom questions answered.</p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-sm">
            <p className="text-gray-500">
              Showing {startRow.toLocaleString()}-{endRow.toLocaleString()} of {totalCount.toLocaleString()}
            </p>
            <div className="flex items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={filters.page <= 1 || isLoading}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page - 1 }))}
              >
                <ChevronLeft className="w-4 h-4 mr-1" />
                Previous
              </Button>
              <span className="text-xs text-gray-600">
                Page {filters.page} of {totalPages}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={filters.page >= totalPages || isLoading}
                onClick={() => setFilters((prev) => ({ ...prev, page: prev.page + 1 }))}
              >
                Next
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default OrganizerAttendeesModule;

