import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  Users,
  DollarSign,
  Edit,
  QrCode,
  TrendingUp,
  Download,
  Search,
  CheckCircle,
  Mail,
  X,
  Plus,
  Tag,
  Trash2,
  Power,
  Mic,
  CalendarRange,
  Award,
  Ticket,
  Pencil,
  ToggleLeft,
  ToggleRight,
  ClipboardList,
  Palette
} from 'lucide-react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';
import { api } from '@/lib/apiClient';
import { toast } from 'sonner';

import WaitlistTab from './tabs/WaitlistTab';
import TicketsTab from './tabs/TicketsTab';
import PromoCodesTab from './tabs/PromoCodesTab';
import SpeakersTab from './tabs/SpeakersTab';
import ScheduleTab from './tabs/ScheduleTab';
import SponsorsTab from './tabs/SponsorsTab';

const formatMoney = (value) => `KES ${(Number(value) || 0).toLocaleString()}`;

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
const OrganizerEventDetail = ({
  event,
  eventDetail,
  eventStats,
  attendees,
  attendeesTotal,
  attendeesLoading,
  onBack,
  onCheckIn,
  onEditEvent,
  onOpenExpense,
  onOpenRevenue,
  revenueBreakdown,
  entryView,
  setEntryView,
  eventExpenses,
  eventRevenues,
  isLoadingEventExpenses,
  isLoadingEventRevenues,
  onDeleteExpense,
  onDeleteRevenue,
  onRefreshEvent,
}) => {
  const detail = eventDetail || event;
  const [activeTab, setActiveTab] = useState('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [savingQuickEdit, setSavingQuickEdit] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const queryClient = useQueryClient();
  // Queries and Mutations for extracted tabs have been moved to their respective components.

  const [quickEdit, setQuickEdit] = useState(() => ({
    title: detail?.title || detail?.name || '',
    description: detail?.description || '',
    date: detail?.startDate || detail?.date || '',
    time: detail?.startTime || detail?.time || '',
    location: detail?.venueName || detail?.location || '',
    address: detail?.address || '',
    theme_color: detail?.themeColor || detail?.theme_color || '#02338D',
    accent_color: detail?.accentColor || detail?.accent_color || '#7C3AED',
  }));



  useEffect(() => {
    if (!detail) return;
    setQuickEdit({
      title: detail.title || detail.name || '',
      description: detail.description || '',
      date: detail.startDate || detail.date || '',
      time: detail.startTime || detail.time || '',
      location: detail.venueName || detail.location || '',
      address: detail.address || '',
      theme_color: detail.themeColor || detail.theme_color || '#02338D',
      accent_color: detail.accentColor || detail.accent_color || '#7C3AED',
    });
  }, [detail]);

  const tickets = detail?.tickets || detail?.ticketTypes || [];
  const ticketTypes = tickets.map((ticket) => {
    const quantity = ticket.quantity ?? ticket.totalTickets ?? 0;
    const remaining = ticket.remaining ?? 0;
    const sold = ticket.sold ?? Math.max(0, quantity - remaining);
    return {
      name: ticket.type || ticket.name || 'General',
      price: Number(ticket.price || 0),
      quantity,
      sold,
    };
  });

  const ticketSalesData = ticketTypes.map((ticket) => ({
    name: ticket.name,
    sold: ticket.sold,
    available: Math.max(0, ticket.quantity - ticket.sold),
  }));

  const revenueByTicketType = ticketTypes.map((ticket) => ({
    name: ticket.name,
    revenue: ticket.sold * ticket.price,
    color: ticket.name.toLowerCase().includes('vip') ? '#C58B1A' : '#02338D',
  }));

  const filteredAttendees = useMemo(() => {
    const q = searchQuery.toLowerCase();
    return attendees.filter((attendee) => {
      const name = attendee.attendee_name || attendee.name || '';
      const email = attendee.attendee_email || attendee.email || '';
      const id = attendee.order_number || attendee.id || '';
      return (
        name.toLowerCase().includes(q) ||
        email.toLowerCase().includes(q) ||
        String(id).toLowerCase().includes(q)
      );
    });
  }, [attendees, searchQuery]);

  const checkedInCount = (eventStats?.totalCheckins ?? attendees.filter((attendee) => {
    if (attendee.checked_in_at) return true;
    if (attendee.status === 'used') return true;
    return Array.isArray(attendee.tickets) && attendee.tickets.some((ticket) => ticket.status === 'used');
  }).length);
  const totalAttendees = attendeesTotal ?? eventStats?.totalAttendees ?? attendees.length;
  const checkInPercentage = totalAttendees > 0 ? Math.round((checkedInCount / totalAttendees) * 100) : 0;
  const waitlistEnabled = detail?.enable_waitlist ?? detail?.enableWaitlist ?? false;

  const status = detail?.status || detail?.eventStatus || 'draft';
  const eventTitle = detail?.title || detail?.name || 'Event Details';
  const eventCategory = detail?.category?.name || detail?.category || 'General';
  const eventDate = detail?.startDate || detail?.date || '';
  const eventTime = detail?.startTime || detail?.time || '';
  const eventEndTime = detail?.endTime || '';
  const eventLocation = detail?.venueName || detail?.location || '';
  const eventImage = detail?.bannerImage || detail?.coverImage || detail?.image;

  const updateQuickEditField = (field, value) => {
    setQuickEdit((prev) => ({ ...prev, [field]: value }));
  };

  const handleQuickSave = async () => {
    if (!detail?.slug) return;
    setSavingQuickEdit(true);
    try {
      await api.patch(`/api/events/${detail.slug}/edit/`, {
        title: quickEdit.title,
        description: quickEdit.description,
        start_date: quickEdit.date,
        start_time: quickEdit.time,
        venue_name: quickEdit.location,
        venue_address: quickEdit.address,
        theme_color: quickEdit.theme_color,
        accent_color: quickEdit.accent_color,
      });
      toast.success('Event updated');
      if (onRefreshEvent) onRefreshEvent();
    } catch (err) {
      toast.error(err?.message || 'Failed to update event');
    } finally {
      setSavingQuickEdit(false);
    }
  };

  const handleExport = async () => {
    if (!detail?.slug) return;
    setIsExporting(true);
    try {
      const { blob, filename } = await api.download(`/api/events/${detail.slug}/analytics/export/`);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename || `${detail.slug}-analytics.csv`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      toast.success('Export started.');
    } catch (err) {
      toast.error(err?.message || 'Failed to export analytics.');
    } finally {
      setIsExporting(false);
    }
  };

  const showRevenueEntries = entryView === 'all' || entryView === 'revenues';
  const showExpenseEntries = entryView === 'all' || entryView === 'expenses';

  return (
    <div className="space-y-4 lg:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 lg:gap-4">
        <Button variant="ghost" size="icon" onClick={onBack} className="self-start">
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-xl lg:text-2xl font-bold text-[#0F172A]">{eventTitle}</h2>
            <Badge className={cn('capitalize', getStatusColor(status))}>{status}</Badge>
          </div>
          <p className="text-sm text-gray-500">{eventCategory}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onEditEvent} className="text-xs lg:text-sm">
            <Edit className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1.5" />
            Full Editor
          </Button>
          <Button
            size="sm"
            onClick={onCheckIn}
            className="bg-[#C58B1A] text-white hover:bg-[#A56F14] text-xs lg:text-sm"
          >
            <QrCode className="w-3.5 h-3.5 lg:w-4 lg:h-4 mr-1.5" />
            Check-in
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="w-full justify-start overflow-x-auto">
          <TabsTrigger value="overview" className="text-xs lg:text-sm">Overview</TabsTrigger>
          <TabsTrigger value="tickets" className="text-xs lg:text-sm">Tickets</TabsTrigger>
          <TabsTrigger value="attendees" className="text-xs lg:text-sm">Attendees</TabsTrigger>
          <TabsTrigger value="waitlist" className="text-xs lg:text-sm">Waitlist</TabsTrigger>
          <TabsTrigger value="analytics" className="text-xs lg:text-sm">Analytics</TabsTrigger>
          <TabsTrigger value="promocodes" className="text-xs lg:text-sm">Promo Codes</TabsTrigger>
          <TabsTrigger value="speakers" className="text-xs lg:text-sm">Speakers</TabsTrigger>
          <TabsTrigger value="schedule" className="text-xs lg:text-sm">Schedule</TabsTrigger>
          <TabsTrigger value="sponsors" className="text-xs lg:text-sm">Sponsors</TabsTrigger>
          <TabsTrigger value="design" className="text-xs lg:text-sm">Design</TabsTrigger>
          <TabsTrigger value="edit" className="text-xs lg:text-sm">Edit Event</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 lg:space-y-6">
          <div className="relative h-48 lg:h-64 rounded-xl overflow-hidden">
            {eventImage ? (
              <img src={eventImage} alt={eventTitle} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-[#02338D] to-[#7C3AED]" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            <div className="absolute bottom-4 left-4 right-4 text-white">
              <p className="text-sm lg:text-base opacity-90 line-clamp-2">{detail?.description || 'No description provided.'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
            <Card>
              <CardContent className="p-3 lg:p-4">
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-[#02338D] flex items-center justify-center">
                    <Calendar className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Date</p>
                    <p className="font-medium text-[#0F172A] text-sm lg:text-base">{eventDate || 'Not set'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 lg:p-4">
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-[#C58B1A] flex items-center justify-center">
                    <Clock className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Time</p>
                    <p className="font-medium text-[#0F172A] text-sm lg:text-base">{eventTime} {eventEndTime ? `- ${eventEndTime}` : ''}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 lg:p-4">
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-[#7C3AED] flex items-center justify-center">
                    <MapPin className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Location</p>
                    <p className="font-medium text-[#0F172A] text-sm lg:text-base line-clamp-1">{eventLocation || 'Online'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-3 lg:p-4">
                <div className="flex items-center gap-2 lg:gap-3">
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-green-500 flex items-center justify-center">
                    <DollarSign className="w-4 h-4 lg:w-5 lg:h-5 text-white" />
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Revenue</p>
                    <p className="font-medium text-[#0F172A] text-sm lg:text-base">{formatMoney(eventStats?.totalRevenue || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Ticket Types</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {ticketTypes.length > 0 ? (
                  ticketTypes.map((ticket) => (
                    <div key={ticket.name} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-medium text-[#0F172A] text-sm lg:text-base">{ticket.name}</p>
                        <p className="text-xs text-gray-500">{ticket.sold} of {ticket.quantity} sold</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#0F172A] text-sm lg:text-base">KES {ticket.price}</p>
                        <div className="w-20 lg:w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden mt-1">
                          <div
                            className="h-full bg-[#C58B1A] rounded-full"
                            style={{ width: ticket.quantity ? `${(ticket.sold / ticket.quantity) * 100}%` : '0%' }}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">No ticket types available.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="attendees" className="space-y-4">
          <Card>
            <CardContent className="p-4 lg:p-6">
              <div className="flex items-center justify-between mb-3 lg:mb-4">
                <div>
                  <p className="text-xs lg:text-sm text-gray-500">Check-in Progress</p>
                  <h3 className="text-xl lg:text-2xl font-bold text-[#0F172A]">
                    {checkedInCount} <span className="text-gray-400">/ {totalAttendees}</span>
                  </h3>
                </div>
                <div className="w-12 h-12 lg:w-16 lg:h-16 rounded-full border-2 lg:border-4 border-[#C58B1A] flex items-center justify-center">
                  <span className="text-base lg:text-lg font-bold text-[#0F172A]">{checkInPercentage}%</span>
                </div>
              </div>
              <div className="h-2 lg:h-3 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#02338D] to-[#C58B1A] rounded-full transition-all duration-500"
                  style={{ width: `${checkInPercentage}%` }}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Attendees List</CardTitle>
                <div className="flex gap-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Search attendees..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10 w-full sm:w-48 lg:w-64"
                    />
                  </div>
                  <Button variant="outline" size="icon" onClick={handleExport} disabled={isExporting}>
                    <Download className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500">Attendee</th>
                      <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500 hidden sm:table-cell">Ticket</th>
                      <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500">Status</th>
                      <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Check-in Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendeesLoading ? (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-sm text-gray-500">Loading attendees...</td>
                      </tr>
                    ) : filteredAttendees.length > 0 ? (
                      filteredAttendees.map((attendee) => {
                        const checkedIn = attendee.checked_in_at || attendee.status === 'used' ||
                          (Array.isArray(attendee.tickets) && attendee.tickets.some((ticket) => ticket.status === 'used'));
                        const ticketType = attendee.ticket_type || attendee.tickets?.[0]?.ticket_type || 'General';
                        return (
                          <tr key={attendee.id || attendee.order_number} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-2 lg:py-3 px-3 lg:px-4">
                              <div>
                                <p className="font-medium text-[#0F172A] text-sm">{attendee.attendee_name || attendee.name}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {attendee.attendee_email || attendee.email}
                                </p>
                              </div>
                            </td>
                            <td className="py-2 lg:py-3 px-3 lg:px-4 hidden sm:table-cell">
                              <Badge variant="outline" className="text-xs">{ticketType}</Badge>
                            </td>
                            <td className="py-2 lg:py-3 px-3 lg:px-4">
                              {checkedIn ? (
                                <Badge className="bg-green-500 text-white text-xs">
                                  <CheckCircle className="w-3 h-3 mr-1" />
                                  Checked In
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="text-xs">Not Checked In</Badge>
                              )}
                            </td>
                            <td className="py-2 lg:py-3 px-3 lg:px-4 text-xs text-gray-500 hidden md:table-cell">
                              {attendee.checked_in_at || attendee.checkInTime || '-'}
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={4} className="py-6 text-center text-sm text-gray-500">No attendees found.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="waitlist" className="space-y-4 lg:space-y-6">
          <WaitlistTab slug={detail?.slug} waitlistEnabled={waitlistEnabled} />
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Revenue by Ticket Type</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-48 lg:h-64">
                {ticketTypes.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revenueByTicketType}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                      <XAxis dataKey="name" stroke="#999" fontSize={12} />
                      <YAxis stroke="#999" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#fff',
                          border: '1px solid #e0e0e0',
                          borderRadius: '8px',
                        }}
                        formatter={(value) => formatMoney(value)}
                      />
                      <Bar dataKey="revenue" fill="#C58B1A" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-full flex items-center justify-center text-sm text-gray-500">
                    No ticket revenue data yet.
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Ticket Sales</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-48">
                  {ticketSalesData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={ticketSalesData} cx="50%" cy="50%" innerRadius={40} outerRadius={70} paddingAngle={4} dataKey="sold">
                          {ticketSalesData.map((_, index) => (
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#C58B1A' : '#02338D'} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center text-sm text-gray-500">
                      No ticket sales yet.
                    </div>
                  )}
                </div>
                <div className="mt-2 space-y-1">
                  {ticketTypes.map((ticket, index) => (
                    <div key={ticket.name} className="flex items-center justify-between text-xs lg:text-sm">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 lg:w-3 lg:h-3 rounded-full"
                          style={{ backgroundColor: index === 0 ? '#C58B1A' : '#02338D' }}
                        />
                        <span className="text-gray-600">{ticket.name}</span>
                      </div>
                      <span className="font-medium text-[#0F172A]">{ticket.sold} sold</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Key Metrics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 lg:space-y-4">
                {[
                  { label: 'Total Guests', value: eventStats?.totalAttendees || totalAttendees, icon: Users, color: '#02338D' },
                  { label: 'Checked In', value: eventStats?.totalCheckins || checkedInCount, icon: CheckCircle, color: '#16A34A' },
                  { label: 'Revenue', value: formatMoney(eventStats?.totalRevenue || 0), icon: DollarSign, color: '#C58B1A', text: true },
                  { label: 'Net Profit', value: formatMoney(eventStats?.netProfit || 0), icon: TrendingUp, color: '#B91C1C', text: true },
                ].map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 lg:gap-3">
                      <metric.icon className="w-4 h-4 lg:w-5 lg:h-5" style={{ color: metric.color }} />
                      <span className="text-sm text-gray-600">{metric.label}</span>
                    </div>
                    <span className="font-bold text-[#0F172A] text-sm lg:text-base">
                      {metric.text ? metric.value : Number(metric.value || 0).toLocaleString()}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Financials</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Track expenses and revenue for this event.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={onOpenExpense} className="text-xs lg:text-sm">
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Expense
                </Button>
                <Button className="bg-[#C58B1A] hover:bg-[#A56F14] text-white text-xs lg:text-sm" onClick={onOpenRevenue}>
                  <Plus className="w-3.5 h-3.5 mr-1.5" />
                  Add Revenue
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {[
                  { label: 'Total Revenue', value: formatMoney(eventStats?.totalRevenue || 0), color: '#16A34A' },
                  { label: 'Total Expenses', value: formatMoney(eventStats?.totalExpenses || 0), color: '#B91C1C' },
                  { label: 'Net Profit', value: formatMoney(eventStats?.netProfit || 0), color: '#02338D' },
                ].map((item) => (
                  <div key={item.label} className="border border-[#E2E8F0] rounded-xl p-4">
                    <p className="text-xs uppercase tracking-wider text-gray-500 font-semibold">{item.label}</p>
                    <p className="text-lg font-bold mt-2" style={{ color: item.color }}>{item.value}</p>
                  </div>
                ))}
              </div>

              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'revenues', label: 'Revenue Sources' },
                  { id: 'expenses', label: 'Expenses' },
                ].map((option) => (
                  <button
                    key={option.id}
                    onClick={() => setEntryView(option.id)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${entryView === option.id ? 'bg-[#02338D] text-white border-[#02338D]' : 'border-[#E2E8F0] text-gray-600'
                      }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>

              {showRevenueEntries && revenueBreakdown.length > 0 && (
                <div className="grid md:grid-cols-3 gap-3">
                  {revenueBreakdown.map((item) => (
                    <div key={item.source} className="border border-[#E2E8F0] rounded-xl p-3">
                      <p className="text-xs text-gray-500 uppercase tracking-wider">{item.label}</p>
                      <p className="text-sm font-bold text-[#0F172A] mt-1">{formatMoney(item.amount)}</p>
                    </div>
                  ))}
                </div>
              )}

              {(isLoadingEventExpenses || isLoadingEventRevenues) ? (
                <p className="text-sm text-gray-500">Loading entries...</p>
              ) : (
                <div className="space-y-3">
                  {showRevenueEntries && eventRevenues.map((item) => (
                    <div key={`rev-${item.id}`} className="flex items-center justify-between border border-[#E2E8F0] rounded-xl p-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A] truncate">{item.description}</p>
                        <p className="text-[11px] text-gray-500">{item.source}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-green-600 whitespace-nowrap">+ {formatMoney(item.amount)}</span>
                        <button onClick={() => onDeleteRevenue(item.id)} className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {showExpenseEntries && eventExpenses.map((item) => (
                    <div key={`exp-${item.id}`} className="flex items-center justify-between border border-[#E2E8F0] rounded-xl p-3">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A] truncate">{item.description}</p>
                        <p className="text-[11px] text-gray-500">{item.category}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-red-600 whitespace-nowrap">- {formatMoney(item.amount)}</span>
                        <button onClick={() => onDeleteExpense(item.id)} className="p-1 rounded-md hover:bg-red-50 text-gray-400 hover:text-red-500">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {showRevenueEntries && showExpenseEntries && eventExpenses.length === 0 && eventRevenues.length === 0 && (
                    <p className="text-sm text-gray-500">No entries yet.</p>
                  )}
                  {showRevenueEntries && !showExpenseEntries && eventRevenues.length === 0 && (
                    <p className="text-sm text-gray-500">No revenue sources yet.</p>
                  )}
                  {!showRevenueEntries && showExpenseEntries && eventExpenses.length === 0 && (
                    <p className="text-sm text-gray-500">No expenses yet.</p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="promocodes" className="space-y-4 lg:space-y-6">
          <PromoCodesTab slug={detail?.slug} />
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4 lg:space-y-6">
          <TicketsTab slug={detail?.slug} />
        </TabsContent>

        <TabsContent value="speakers" className="space-y-4 lg:space-y-6">
          <SpeakersTab slug={detail?.slug} />
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4 lg:space-y-6">
          <ScheduleTab slug={detail?.slug} />
        </TabsContent>

        <TabsContent value="sponsors" className="space-y-4 lg:space-y-6">
          <SponsorsTab slug={detail?.slug} />
        </TabsContent>

        <TabsContent value="edit" className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Quick Edit</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Event Name</Label>
                <Input value={quickEdit.title} onChange={(e) => updateQuickEditField('title', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <textarea
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C58B1A]/20 focus:border-[#C58B1A] resize-none"
                  rows={4}
                  value={quickEdit.description}
                  onChange={(e) => updateQuickEditField('description', e.target.value)}
                />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={quickEdit.date} onChange={(e) => updateQuickEditField('date', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Input type="time" value={quickEdit.time} onChange={(e) => updateQuickEditField('time', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={quickEdit.location} onChange={(e) => updateQuickEditField('location', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Address</Label>
                <Input value={quickEdit.address} onChange={(e) => updateQuickEditField('address', e.target.value)} />
              </div>
              <div className="flex justify-end gap-3">
                <Button variant="outline" onClick={onEditEvent}>Open Full Editor</Button>
                <Button className="bg-[#02338D] hover:bg-[#022A78]" onClick={handleQuickSave} disabled={savingQuickEdit}>
                  {savingQuickEdit ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="design" className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base lg:text-lg font-bold text-[#0F172A]">
                <Palette className="w-5 h-5 text-[#02338D]" />
                Event Branding
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label>Theme Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      className="w-12 h-12 p-1 border-gray-200 cursor-pointer rounded-lg"
                      value={quickEdit.theme_color}
                      onChange={(e) => updateQuickEditField('theme_color', e.target.value)}
                    />
                    <Input
                      type="text"
                      className="flex-1 uppercase font-mono"
                      value={quickEdit.theme_color}
                      onChange={(e) => updateQuickEditField('theme_color', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Accent Color</Label>
                  <div className="flex items-center gap-3">
                    <Input
                      type="color"
                      className="w-12 h-12 p-1 border-gray-200 cursor-pointer rounded-lg"
                      value={quickEdit.accent_color}
                      onChange={(e) => updateQuickEditField('accent_color', e.target.value)}
                    />
                    <Input
                      type="text"
                      className="flex-1 uppercase font-mono"
                      value={quickEdit.accent_color}
                      onChange={(e) => updateQuickEditField('accent_color', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Branding Preview */}
              <div className="mt-8">
                <Label className="text-gray-500 mb-2 block">Live Preview</Label>
                <div className="p-6 rounded-xl border border-gray-200 bg-white shadow-sm max-w-md mx-auto relative overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-2" style={{ backgroundColor: quickEdit.theme_color }}></div>
                  <h4 className="font-bold text-lg mb-2" style={{ color: quickEdit.theme_color }}>Ticket Booth Preview</h4>
                  <p className="text-sm text-gray-600 mb-6">This is how your event's buttons and accents will appear to buyers.</p>

                  <div className="space-y-3">
                    <Button className="w-full text-white font-medium" style={{ backgroundColor: quickEdit.theme_color, border: 'none' }}>
                      Primary Action
                    </Button>
                    <Button variant="outline" className="w-full" style={{ color: quickEdit.theme_color, borderColor: quickEdit.theme_color }}>
                      Secondary Option
                    </Button>
                  </div>

                  <div className="mt-6">
                    <span className="text-xs font-semibold px-2 py-1 rounded-md text-white" style={{ backgroundColor: quickEdit.accent_color }}>
                      Featured Accent
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6 pt-6 border-t border-gray-100">
                <Button className="bg-[#02338D] hover:bg-[#022A78]" onClick={handleQuickSave} disabled={savingQuickEdit}>
                  {savingQuickEdit ? 'Saving...' : 'Save Theme'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>


    </div>
  );
};

export default OrganizerEventDetail;


