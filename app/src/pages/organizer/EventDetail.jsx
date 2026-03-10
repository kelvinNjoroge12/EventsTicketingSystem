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

const formatMoney = (value) => `KES ${(Number(value) || 0).toLocaleString()}`;

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
const OrganizerEventDetail = ({
  event,
  eventDetail,
  eventStats,
  attendees,
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
  const [showPromoModal, setShowPromoModal] = useState(false);
  const [promoForm, setPromoForm] = useState({
    code: '',
    discount_type: 'percent',
    discount_value: '',
    usage_limit: '',
    expiry: '',
    is_active: true
  });

  const { data: promoCodesData, isLoading: isPromoCodesLoading } = useQuery({
    queryKey: ['promo_codes', detail?.slug],
    queryFn: async () => {
      const response = await api.get(`/api/events/${detail?.slug}/promo-codes/`);
      return Array.isArray(response?.results) ? response.results : (Array.isArray(response) ? response : []);
    },
    enabled: !!detail?.slug,
  });

  const createPromoMutation = useMutation({
    mutationFn: async (payload) => api.post(`/api/events/${detail?.slug}/promo-codes/`, payload),
    onSuccess: () => {
      toast.success('Promo code created successfully.');
      setShowPromoModal(false);
      setPromoForm({
        code: '',
        discount_type: 'percent',
        discount_value: '',
        usage_limit: '',
        expiry: '',
        is_active: true
      });
      queryClient.invalidateQueries({ queryKey: ['promo_codes', detail?.slug] });
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to create promo code.');
    }
  });

  const deletePromoMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/events/${detail?.slug}/promo-codes/${id}/`),
    onSuccess: () => {
      toast.success('Promo code deleted.');
      queryClient.invalidateQueries({ queryKey: ['promo_codes', detail?.slug] });
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to delete promo code.');
    }
  });

  const togglePromoMutation = useMutation({
    mutationFn: async ({ id, is_active }) => api.patch(`/api/events/${detail?.slug}/promo-codes/${id}/`, { is_active }),
    onSuccess: () => {
      toast.success('Promo code status updated.');
      queryClient.invalidateQueries({ queryKey: ['promo_codes', detail?.slug] });
    },
    onError: (err) => {
      toast.error(err?.message || 'Failed to update promo code.');
    }
  });

  const handleCreatePromo = () => {
    if (!promoForm.code || !promoForm.discount_value) {
      toast.error('Code and discount value are required.');
      return;
    }
    const payload = {
      code: promoForm.code.toUpperCase().replace(/\s+/g, ''),
      discount_type: promoForm.discount_type,
      discount_value: Number(promoForm.discount_value),
      is_active: promoForm.is_active,
    };
    if (promoForm.usage_limit) payload.usage_limit = Number(promoForm.usage_limit);
    if (promoForm.expiry) payload.expiry = new Date(promoForm.expiry).toISOString();

    createPromoMutation.mutate(payload);
  };

  // ── Ticket Management ──
  const [showTicketModal, setShowTicketModal] = useState(false);
  const [editingTicket, setEditingTicket] = useState(null);
  const [ticketForm, setTicketForm] = useState({
    name: '', ticket_class: 'paid', price: '', quantity: '', description: '', is_active: true
  });

  const { data: managedTickets = [], isLoading: isManagedTicketsLoading } = useQuery({
    queryKey: ['managed_tickets', detail?.slug],
    queryFn: async () => {
      const res = await api.get(`/api/events/${detail?.slug}/tickets/`);
      return Array.isArray(res?.results) ? res.results : (Array.isArray(res) ? res : []);
    },
    enabled: !!detail?.slug,
  });

  const createTicketMutation = useMutation({
    mutationFn: async (payload) => api.post(`/api/events/${detail?.slug}/tickets/create/`, payload),
    onSuccess: () => {
      toast.success('Ticket tier created.');
      setShowTicketModal(false);
      setTicketForm({ name: '', ticket_class: 'paid', price: '', quantity: '', description: '', is_active: true });
      queryClient.invalidateQueries({ queryKey: ['managed_tickets', detail?.slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to create ticket tier.')
  });

  const updateTicketMutation = useMutation({
    mutationFn: async ({ id, ...payload }) => api.patch(`/api/events/${detail?.slug}/tickets/${id}/`, payload),
    onSuccess: () => {
      toast.success('Ticket tier updated.');
      setShowTicketModal(false);
      setEditingTicket(null);
      setTicketForm({ name: '', ticket_class: 'paid', price: '', quantity: '', description: '', is_active: true });
      queryClient.invalidateQueries({ queryKey: ['managed_tickets', detail?.slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to update ticket tier.')
  });

  const toggleTicketMutation = useMutation({
    mutationFn: async ({ id, is_active }) => api.patch(`/api/events/${detail?.slug}/tickets/${id}/`, { is_active }),
    onSuccess: () => {
      toast.success('Ticket sales status updated.');
      queryClient.invalidateQueries({ queryKey: ['managed_tickets', detail?.slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to toggle ticket.')
  });

  const deleteTicketMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/events/${detail?.slug}/tickets/${id}/`),
    onSuccess: () => {
      toast.success('Ticket tier deleted.');
      queryClient.invalidateQueries({ queryKey: ['managed_tickets', detail?.slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to delete ticket tier.')
  });

  const openEditTicket = (ticket) => {
    setEditingTicket(ticket);
    setTicketForm({
      name: ticket.name || '',
      ticket_class: ticket.ticket_class || 'paid',
      price: ticket.price ?? '',
      quantity: ticket.quantity ?? '',
      description: ticket.description || '',
      is_active: ticket.is_active ?? true
    });
    setShowTicketModal(true);
  };

  const handleSaveTicket = () => {
    if (!ticketForm.name || !ticketForm.quantity) {
      toast.error('Name and quantity are required.');
      return;
    }
    const payload = {
      name: ticketForm.name,
      ticket_class: ticketForm.ticket_class,
      price: Number(ticketForm.price || 0),
      quantity: Number(ticketForm.quantity),
      description: ticketForm.description,
      is_active: ticketForm.is_active,
    };
    if (editingTicket) {
      updateTicketMutation.mutate({ id: editingTicket.id, ...payload });
    } else {
      createTicketMutation.mutate(payload);
    }
  };

  const [showSpeakerModal, setShowSpeakerModal] = useState(false);
  const [speakerForm, setSpeakerForm] = useState({
    name: '', title: '', organization: '', bio: '', twitter: '', linkedin: '', is_mc: false, sort_order: 0
  });

  const [showSponsorModal, setShowSponsorModal] = useState(false);
  const [sponsorForm, setSponsorForm] = useState({
    name: '', website: '', tier: 'partner', sort_order: 0
  });

  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [scheduleForm, setScheduleForm] = useState({
    title: '', description: '', start_time: '', end_time: '', day: 1, session_type: '', location: '', speaker: '', sort_order: 0
  });

  const { data: speakersData = [], isLoading: isSpeakersLoading } = useQuery({
    queryKey: ['speakers', detail?.slug],
    queryFn: async () => {
      const res = await api.get(`/api/events/${detail?.slug}/speakers/`);
      return Array.isArray(res?.results) ? res.results : (Array.isArray(res) ? res : []);
    },
    enabled: !!detail?.slug,
  });

  const { data: sponsorsData = [], isLoading: isSponsorsLoading } = useQuery({
    queryKey: ['sponsors', detail?.slug],
    queryFn: async () => {
      const res = await api.get(`/api/events/${detail?.slug}/sponsors/`);
      return Array.isArray(res?.results) ? res.results : (Array.isArray(res) ? res : []);
    },
    enabled: !!detail?.slug,
  });

  const { data: scheduleData = [], isLoading: isScheduleLoading } = useQuery({
    queryKey: ['schedule', detail?.slug],
    queryFn: async () => {
      const res = await api.get(`/api/events/${detail?.slug}/schedule/`);
      return Array.isArray(res?.results) ? res.results : (Array.isArray(res) ? res : []);
    },
    enabled: !!detail?.slug,
  });

  const createSpeakerMutation = useMutation({
    mutationFn: async (payload) => api.post(`/api/events/${detail?.slug}/speakers/`, payload),
    onSuccess: () => {
      toast.success('Speaker added.');
      setShowSpeakerModal(false);
      setSpeakerForm({ name: '', title: '', organization: '', bio: '', twitter: '', linkedin: '', is_mc: false, sort_order: 0 });
      queryClient.invalidateQueries({ queryKey: ['speakers', detail?.slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to add speaker.')
  });

  const deleteSpeakerMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/events/${detail?.slug}/speakers/${id}/`),
    onSuccess: () => {
      toast.success('Speaker removed.');
      queryClient.invalidateQueries({ queryKey: ['speakers', detail?.slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to remove speaker.')
  });

  const createSponsorMutation = useMutation({
    mutationFn: async (payload) => api.post(`/api/events/${detail?.slug}/sponsors/`, payload),
    onSuccess: () => {
      toast.success('Sponsor added.');
      setShowSponsorModal(false);
      setSponsorForm({ name: '', website: '', tier: 'partner', sort_order: 0 });
      queryClient.invalidateQueries({ queryKey: ['sponsors', detail?.slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to add sponsor.')
  });

  const deleteSponsorMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/events/${detail?.slug}/sponsors/${id}/`),
    onSuccess: () => {
      toast.success('Sponsor removed.');
      queryClient.invalidateQueries({ queryKey: ['sponsors', detail?.slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to remove sponsor.')
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (payload) => api.post(`/api/events/${detail?.slug}/schedule/`, payload),
    onSuccess: () => {
      toast.success('Schedule item added.');
      setShowScheduleModal(false);
      setScheduleForm({ title: '', description: '', start_time: '', end_time: '', day: 1, session_type: '', location: '', speaker: '', sort_order: 0 });
      queryClient.invalidateQueries({ queryKey: ['schedule', detail?.slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to add schedule item.')
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/events/${detail?.slug}/schedule/${id}/`),
    onSuccess: () => {
      toast.success('Schedule item removed.');
      queryClient.invalidateQueries({ queryKey: ['schedule', detail?.slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to remove schedule item.')
  });

  const [quickEdit, setQuickEdit] = useState(() => ({
    title: detail?.title || detail?.name || '',
    description: detail?.description || '',
    date: detail?.startDate || detail?.date || '',
    time: detail?.startTime || detail?.time || '',
    location: detail?.venueName || detail?.location || '',
    address: detail?.address || '',
    theme_color: detail?.themeColor || detail?.theme_color || '#1E4DB7',
    accent_color: detail?.accentColor || detail?.accent_color || '#7C3AED',
  }));

  const { data: waitlistUsers = [], isLoading: isWaitlistLoading } = useQuery({
    queryKey: ['waitlist', detail?.slug],
    queryFn: async () => {
      const res = await api.get(`/api/events/${detail?.slug}/waitlist/`);
      return Array.isArray(res?.results) ? res.results : (Array.isArray(res) ? res : []);
    },
    enabled: !!detail?.slug,
  });

  const notifyWaitlistMutation = useMutation({
    mutationFn: async (id) => api.post(`/api/events/${detail?.slug}/waitlist/${id}/notify/`),
    onSuccess: () => {
      toast.success('Waitlist entry notified successfully.');
      queryClient.invalidateQueries({ queryKey: ['waitlist', detail?.slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to notify entry.')
  });

  const deleteWaitlistMutation = useMutation({
    mutationFn: async (id) => api.delete(`/api/events/${detail?.slug}/waitlist/${id}/`),
    onSuccess: () => {
      toast.success('Waitlist entry removed.');
      queryClient.invalidateQueries({ queryKey: ['waitlist', detail?.slug] });
    },
    onError: (err) => toast.error(err?.message || 'Failed to remove entry.')
  });

  useEffect(() => {
    if (!detail) return;
    setQuickEdit({
      title: detail.title || detail.name || '',
      description: detail.description || '',
      date: detail.startDate || detail.date || '',
      time: detail.startTime || detail.time || '',
      location: detail.venueName || detail.location || '',
      address: detail.address || '',
      theme_color: detail.themeColor || detail.theme_color || '#1E4DB7',
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
    color: ticket.name.toLowerCase().includes('vip') ? '#C58B1A' : '#1E4DB7',
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

  const checkedInCount = attendees.filter((attendee) => {
    if (attendee.checked_in_at) return true;
    if (attendee.status === 'used') return true;
    return Array.isArray(attendee.tickets) && attendee.tickets.some((ticket) => ticket.status === 'used');
  }).length;
  const totalAttendees = attendees.length;
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
              <div className="w-full h-full bg-gradient-to-br from-[#1E4DB7] to-[#7C3AED]" />
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
                  <div className="w-8 h-8 lg:w-10 lg:h-10 rounded-lg bg-[#1E4DB7] flex items-center justify-center">
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
                  className="h-full bg-gradient-to-r from-[#1E4DB7] to-[#C58B1A] rounded-full transition-all duration-500"
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
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Waitlist</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Guests waiting for tickets to become available.</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-xs">
                  {waitlistUsers.length} queued
                </Badge>
                {!waitlistEnabled && (
                  <Badge className="bg-gray-100 text-gray-500 text-xs" variant="outline">
                    Disabled
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {!waitlistEnabled ? (
                <div className="p-6 text-sm text-gray-500">
                  Waitlist is currently disabled for this event. Enable it in the event settings to start collecting guests.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500">Guest</th>
                        <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500 hidden md:table-cell">Phone</th>
                        <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500">Position</th>
                        <th className="text-left py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500">Status</th>
                        <th className="text-right py-2 lg:py-3 px-3 lg:px-4 text-xs font-medium text-gray-500">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {isWaitlistLoading ? (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-sm text-gray-500">Loading waitlist...</td>
                        </tr>
                      ) : waitlistUsers.length > 0 ? (
                        waitlistUsers.map((entry) => (
                          <tr key={entry.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                            <td className="py-2 lg:py-3 px-3 lg:px-4">
                              <div>
                                <p className="font-medium text-[#0F172A] text-sm">{entry.name}</p>
                                <p className="text-xs text-gray-500 flex items-center gap-1">
                                  <Mail className="w-3 h-3" />
                                  {entry.email}
                                </p>
                              </div>
                            </td>
                            <td className="py-2 lg:py-3 px-3 lg:px-4 text-xs text-gray-500 hidden md:table-cell">
                              {entry.phone || '-'}
                            </td>
                            <td className="py-2 lg:py-3 px-3 lg:px-4">
                              <Badge variant="outline" className="text-xs">{entry.position}</Badge>
                            </td>
                            <td className="py-2 lg:py-3 px-3 lg:px-4">
                              <Badge className={cn(
                                'text-xs',
                                entry.status === 'notified' && 'bg-[#C58B1A]/20 text-[#C58B1A]',
                                entry.status === 'converted' && 'bg-green-100 text-green-700',
                                (!entry.status || entry.status === 'waiting') && 'bg-gray-100 text-gray-600'
                              )} variant="outline">
                                {entry.status || 'waiting'}
                              </Badge>
                            </td>
                            <td className="py-2 lg:py-3 px-3 lg:px-4 text-right">
                              <div className="inline-flex items-center gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => notifyWaitlistMutation.mutate(entry.id)}
                                  disabled={notifyWaitlistMutation.isPending}
                                  className="text-xs"
                                >
                                  Notify
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteWaitlistMutation.mutate(entry.id)}
                                  disabled={deleteWaitlistMutation.isPending}
                                  className="text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-6 text-center text-sm text-gray-500">No one is on the waitlist yet.</td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
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
                            <Cell key={`cell-${index}`} fill={index === 0 ? '#C58B1A' : '#1E4DB7'} />
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
                          style={{ backgroundColor: index === 0 ? '#C58B1A' : '#1E4DB7' }}
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
                  { label: 'Total Guests', value: eventStats?.totalAttendees || totalAttendees, icon: Users, color: '#1E4DB7' },
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
                  { label: 'Net Profit', value: formatMoney(eventStats?.netProfit || 0), color: '#1E4DB7' },
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
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${entryView === option.id ? 'bg-[#1E4DB7] text-white border-[#1E4DB7]' : 'border-[#E2E8F0] text-gray-600'
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
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Promo Codes</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Manage discount codes for your ticket buyers.</p>
              </div>
              <Button className="bg-[#1E4DB7] hover:bg-[#163B90] text-white text-xs lg:text-sm" onClick={() => setShowPromoModal(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Create Promo Code
              </Button>
            </CardHeader>
            <CardContent>
              {isPromoCodesLoading ? (
                <p className="text-sm text-gray-500">Loading promo codes...</p>
              ) : promoCodesData && promoCodesData.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-gray-100">
                        <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">Code</th>
                        <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">Discount</th>
                        <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">Usage</th>
                        <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase">Status</th>
                        <th className="py-3 px-4 text-xs font-medium text-gray-500 uppercase text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {promoCodesData.map((promo) => (
                        <tr key={promo.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2">
                              <Tag className="w-4 h-4 text-[#C58B1A]" />
                              <span className="font-bold text-[#0F172A]">{promo.code}</span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-sm font-medium text-[#0F172A]">
                            {promo.discount_type === 'percent' ? `${promo.discount_value}%` : formatMoney(promo.discount_value)}
                          </td>
                          <td className="py-3 px-4 text-sm text-gray-500">
                            {promo.times_used} {promo.usage_limit ? `/ ${promo.usage_limit}` : 'uses'}
                          </td>
                          <td className="py-3 px-4">
                            <Badge className={promo.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'} variant="outline">
                              {promo.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </td>
                          <td className="py-3 px-4 text-right flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              title={promo.is_active ? "Deactivate" : "Activate"}
                              onClick={() => togglePromoMutation.mutate({ id: promo.id, is_active: !promo.is_active })}
                              className="text-gray-400 hover:text-[#1E4DB7]"
                            >
                              <Power className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => deletePromoMutation.mutate(promo.id)}
                              className="text-gray-400 hover:text-red-500"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Tag className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-[#0F172A] font-medium text-sm">No promo codes</p>
                  <p className="text-gray-500 text-xs mt-1">Create discount codes to boost ticket sales.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="tickets" className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Ticket Tiers</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Manage pricing, quantities, and sales status for each tier.</p>
              </div>
              <Button className="bg-[#1E4DB7] hover:bg-[#163B90] text-white text-xs lg:text-sm" onClick={() => { setEditingTicket(null); setTicketForm({ name: '', ticket_class: 'paid', price: '', quantity: '', description: '', is_active: true }); setShowTicketModal(true); }}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Ticket Tier
              </Button>
            </CardHeader>
            <CardContent>
              {isManagedTicketsLoading ? (
                <p className="text-sm text-gray-500">Loading tickets...</p>
              ) : managedTickets && managedTickets.length > 0 ? (
                <div className="space-y-3">
                  {managedTickets.map(ticket => {
                    const soldPct = ticket.quantity ? Math.round((ticket.quantity_sold / ticket.quantity) * 100) : 0;
                    return (
                      <div key={ticket.id} className="border border-gray-100 rounded-xl p-4 hover:shadow-md transition-shadow">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <Ticket className="w-4 h-4 text-[#C58B1A]" />
                              <h4 className="font-bold text-[#0F172A]">{ticket.name}</h4>
                              <Badge className={ticket.is_active ? 'bg-green-100 text-green-700 text-[10px]' : 'bg-gray-100 text-gray-500 text-[10px]'} variant="outline">
                                {ticket.is_active ? 'On Sale' : 'Paused'}
                              </Badge>
                              {ticket.is_sold_out && <Badge className="bg-red-100 text-red-700 text-[10px]" variant="outline">Sold Out</Badge>}
                            </div>
                            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500 mt-1">
                              <span>Class: <strong className="text-[#0F172A] capitalize">{ticket.ticket_class}</strong></span>
                              <span>Price: <strong className="text-[#0F172A]">{formatMoney(ticket.price)}</strong></span>
                              <span>Sold: <strong className="text-[#0F172A]">{ticket.quantity_sold || 0}</strong> / {ticket.quantity}</span>
                              <span>Available: <strong className="text-[#0F172A]">{ticket.quantity_available ?? (ticket.quantity - (ticket.quantity_sold || 0))}</strong></span>
                            </div>
                            <div className="w-full max-w-xs h-1.5 bg-gray-200 rounded-full overflow-hidden mt-2">
                              <div className="h-full bg-[#C58B1A] rounded-full transition-all" style={{ width: `${soldPct}%` }} />
                            </div>
                          </div>
                          <div className="flex items-center gap-1 flex-shrink-0">
                            <Button variant="ghost" size="icon" title="Edit" onClick={() => openEditTicket(ticket)} className="text-gray-400 hover:text-[#1E4DB7]">
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="icon" title={ticket.is_active ? 'Pause Sales' : 'Resume Sales'} onClick={() => toggleTicketMutation.mutate({ id: ticket.id, is_active: !ticket.is_active })} className="text-gray-400 hover:text-[#C58B1A]">
                              {ticket.is_active ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                            </Button>
                            <Button variant="ghost" size="icon" title="Delete" onClick={() => deleteTicketMutation.mutate(ticket.id)} className="text-gray-400 hover:text-red-500">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-[#0F172A] font-medium text-sm">No ticket tiers yet</p>
                  <p className="text-gray-500 text-xs mt-1">Create your first ticket tier to start selling.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="attendees" className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Speakers / Lineup</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Manage speakers and hosts for your event.</p>
              </div>
              <Button className="bg-[#1E4DB7] hover:bg-[#163B90] text-white text-xs lg:text-sm" onClick={() => setShowSpeakerModal(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Speaker
              </Button>
            </CardHeader>
            <CardContent>
              {isSpeakersLoading ? (
                <p className="text-sm text-gray-500">Loading speakers...</p>
              ) : speakersData && speakersData.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {speakersData.map(speaker => (
                    <div key={speaker.id} className="border border-gray-100 rounded-xl p-4 flex gap-4 relative group hover:shadow-md transition-shadow">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteSpeakerMutation.mutate(speaker.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 flex-shrink-0">
                        {speaker.avatar_url ? (
                          <img src={speaker.avatar_url} alt={speaker.name} className="w-full h-full object-cover" />
                        ) : (
                          <Mic className="w-6 h-6 m-3 text-gray-400" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0F172A]">{speaker.name}</h4>
                        <p className="text-xs text-gray-500">{speaker.title} {speaker.organization ? `@ ${speaker.organization}` : ''}</p>
                        {speaker.is_mc && <Badge className="mt-1 bg-purple-100 text-purple-700 text-[10px]" variant="outline">Host / MC</Badge>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Mic className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-[#0F172A] font-medium text-sm">No speakers added</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule" className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Event Schedule</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Manage event agenda and sessions.</p>
              </div>
              <Button className="bg-[#1E4DB7] hover:bg-[#163B90] text-white text-xs lg:text-sm" onClick={() => setShowScheduleModal(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Session
              </Button>
            </CardHeader>
            <CardContent>
              {isScheduleLoading ? (
                <p className="text-sm text-gray-500">Loading schedule...</p>
              ) : scheduleData && scheduleData.length > 0 ? (
                <div className="space-y-4">
                  {scheduleData.map(session => (
                    <div key={session.id} className="flex gap-4 p-4 border border-gray-100 rounded-xl relative group hover:shadow-md transition-shadow">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteScheduleMutation.mutate(session.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                      <div className="w-20 flex-shrink-0 text-center flex flex-col items-center justify-center bg-gray-50 rounded-lg p-2">
                        <p className="text-sm font-bold text-[#0F172A]">{session.start_time.substring(0, 5)}</p>
                        {session.end_time && <p className="text-xs text-gray-500">to {session.end_time.substring(0, 5)}</p>}
                      </div>
                      <div>
                        <h4 className="font-bold text-[#0F172A]">{session.title}</h4>
                        {session.speaker_name && <p className="text-sm text-[#1E4DB7]">Speaker: {session.speaker_name}</p>}
                        {session.location && <p className="text-xs text-gray-500 mt-1 flex items-center gap-1"><MapPin className="w-3 h-3" /> {session.location}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <CalendarRange className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-[#0F172A] font-medium text-sm">No schedule items added</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="sponsors" className="space-y-4 lg:space-y-6">
          <Card>
            <CardHeader className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base lg:text-lg font-bold text-[#0F172A]">Event Sponsors</CardTitle>
                <p className="text-sm text-gray-500 mt-1">Manage sponsors and partners.</p>
              </div>
              <Button className="bg-[#1E4DB7] hover:bg-[#163B90] text-white text-xs lg:text-sm" onClick={() => setShowSponsorModal(true)}>
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                Add Sponsor
              </Button>
            </CardHeader>
            <CardContent>
              {isSponsorsLoading ? (
                <p className="text-sm text-gray-500">Loading sponsors...</p>
              ) : sponsorsData && sponsorsData.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {sponsorsData.map(sponsor => (
                    <div key={sponsor.id} className="border border-gray-100 rounded-xl p-4 text-center relative group hover:shadow-md transition-shadow">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="absolute top-1 right-1 h-6 w-6 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={() => deleteSponsorMutation.mutate(sponsor.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                      <div className="h-16 flex items-center justify-center mb-3">
                        {sponsor.logo_url ? (
                          <img src={sponsor.logo_url} alt={sponsor.name} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 font-bold">{sponsor.name.charAt(0)}</div>
                        )}
                      </div>
                      <h4 className="font-bold text-[#0F172A] text-sm truncate">{sponsor.name}</h4>
                      <Badge className="mt-2 text-[10px] capitalize" variant="outline">{sponsor.tier}</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-gray-50 rounded-lg">
                  <Award className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                  <p className="text-[#0F172A] font-medium text-sm">No sponsors added</p>
                </div>
              )}
            </CardContent>
          </Card>
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
                <Button className="bg-[#1E4DB7] hover:bg-[#163B90]" onClick={handleQuickSave} disabled={savingQuickEdit}>
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
                <Palette className="w-5 h-5 text-[#1E4DB7]" />
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
                <Button className="bg-[#1E4DB7] hover:bg-[#163B90]" onClick={handleQuickSave} disabled={savingQuickEdit}>
                  {savingQuickEdit ? 'Saving...' : 'Save Theme'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {showPromoModal && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4"
          onClick={() => setShowPromoModal(false)}
        >
          <div
            className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="bg-[#1E4DB7] px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-semibold">Create Promo Code</h3>
              <button onClick={() => setShowPromoModal(false)} className="p-1 rounded-full hover:bg-white/20">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-xs mb-1.5 text-gray-500 block">Code Name *</Label>
                <Input
                  value={promoForm.code}
                  onChange={(e) => setPromoForm((prev) => ({ ...prev, code: e.target.value.toUpperCase() }))}
                  placeholder="e.g. EARLYBIRD20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs mb-1.5 text-gray-500 block">Discount Type</Label>
                  <select
                    value={promoForm.discount_type}
                    onChange={(e) => setPromoForm((prev) => ({ ...prev, discount_type: e.target.value }))}
                    className="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 text-gray-500 block">Discount Value *</Label>
                  <Input
                    type="number"
                    value={promoForm.discount_value}
                    onChange={(e) => setPromoForm((prev) => ({ ...prev, discount_value: e.target.value }))}
                    placeholder="e.g. 20"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs mb-1.5 text-gray-500 block">Usage Limit (Optional)</Label>
                  <Input
                    type="number"
                    value={promoForm.usage_limit}
                    onChange={(e) => setPromoForm((prev) => ({ ...prev, usage_limit: e.target.value }))}
                    placeholder="e.g. 50"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-1.5 text-gray-500 block">Expiry Date (Optional)</Label>
                  <Input
                    type="date"
                    value={promoForm.expiry}
                    onChange={(e) => setPromoForm((prev) => ({ ...prev, expiry: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="promo-active"
                  checked={promoForm.is_active}
                  onChange={(e) => setPromoForm((prev) => ({ ...prev, is_active: e.target.checked }))}
                  className="rounded text-[#1E4DB7] focus:ring-[#1E4DB7]"
                />
                <Label htmlFor="promo-active" className="text-sm cursor-pointer">Activate immediately</Label>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <Button variant="outline" onClick={() => setShowPromoModal(false)}>Cancel</Button>
                <Button className="bg-[#C58B1A] hover:bg-[#A56F14] text-white" onClick={handleCreatePromo} disabled={createPromoMutation.isPending}>
                  {createPromoMutation.isPending ? 'Saving...' : 'Create Code'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showTicketModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => { setShowTicketModal(false); setEditingTicket(null); }}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-[#1E4DB7] px-6 py-4 text-white flex items-center justify-between">
              <h3 className="font-semibold">{editingTicket ? 'Edit Ticket Tier' : 'New Ticket Tier'}</h3>
              <button onClick={() => { setShowTicketModal(false); setEditingTicket(null); }} className="p-1 rounded-full hover:bg-white/20">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label className="text-xs mb-1.5 text-gray-500 block">Tier Name *</Label>
                <Input value={ticketForm.name} onChange={e => setTicketForm(p => ({ ...p, name: e.target.value }))} placeholder="e.g. VIP, Early Bird" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs mb-1.5 text-gray-500 block">Ticket Class</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={ticketForm.ticket_class} onChange={e => setTicketForm(p => ({ ...p, ticket_class: e.target.value }))}>
                    <option value="free">Free</option>
                    <option value="paid">Paid</option>
                    <option value="vip">VIP</option>
                    <option value="early_bird">Early Bird</option>
                    <option value="donation">Donation</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs mb-1.5 text-gray-500 block">Price (KES)</Label>
                  <Input type="number" value={ticketForm.price} onChange={e => setTicketForm(p => ({ ...p, price: e.target.value }))} placeholder="0" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs mb-1.5 text-gray-500 block">Quantity *</Label>
                  <Input type="number" value={ticketForm.quantity} onChange={e => setTicketForm(p => ({ ...p, quantity: e.target.value }))} placeholder="100" />
                </div>
                <div className="flex items-end pb-1">
                  <div className="flex items-center gap-2">
                    <input type="checkbox" id="ticket-active" checked={ticketForm.is_active} onChange={e => setTicketForm(p => ({ ...p, is_active: e.target.checked }))} className="rounded text-[#1E4DB7]" />
                    <Label htmlFor="ticket-active" className="text-sm cursor-pointer">Active</Label>
                  </div>
                </div>
              </div>
              <div>
                <Label className="text-xs mb-1.5 text-gray-500 block">Description (Optional)</Label>
                <textarea className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm resize-none focus:outline-none focus:ring-2 focus:ring-[#C58B1A]/20 focus:border-[#C58B1A]" rows={2} value={ticketForm.description} onChange={e => setTicketForm(p => ({ ...p, description: e.target.value }))} placeholder="What's included in this tier..." />
              </div>
              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end gap-3">
                <Button variant="outline" onClick={() => { setShowTicketModal(false); setEditingTicket(null); }}>Cancel</Button>
                <Button className="bg-[#C58B1A] hover:bg-[#A56F14] text-white" onClick={handleSaveTicket} disabled={createTicketMutation.isPending || updateTicketMutation.isPending}>
                  {(createTicketMutation.isPending || updateTicketMutation.isPending) ? 'Saving...' : (editingTicket ? 'Save Changes' : 'Create Tier')}
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSpeakerModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSpeakerModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-[#1E4DB7] px-6 py-4 text-white flex justify-between">
              <h3 className="font-semibold">Add Speaker</h3>
              <button onClick={() => setShowSpeakerModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Name *</Label>
                <Input value={speakerForm.name} onChange={e => setSpeakerForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Title/Role</Label>
                  <Input value={speakerForm.title} onChange={e => setSpeakerForm(p => ({ ...p, title: e.target.value }))} />
                </div>
                <div>
                  <Label>Organization</Label>
                  <Input value={speakerForm.organization} onChange={e => setSpeakerForm(p => ({ ...p, organization: e.target.value }))} />
                </div>
              </div>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="is_mc" checked={speakerForm.is_mc} onChange={e => setSpeakerForm(p => ({ ...p, is_mc: e.target.checked }))} className="rounded text-[#1E4DB7]" />
                <Label htmlFor="is_mc" className="cursor-pointer">Is this speaker the Host / MC?</Label>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowSpeakerModal(false)}>Cancel</Button>
                <Button className="bg-[#C58B1A] hover:bg-[#A56F14] text-white" onClick={() => createSpeakerMutation.mutate(speakerForm)} disabled={createSpeakerMutation.isPending}>Add</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showSponsorModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowSponsorModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-[#1E4DB7] px-6 py-4 text-white flex justify-between">
              <h3 className="font-semibold">Add Sponsor</h3>
              <button onClick={() => setShowSponsorModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <Label>Sponsor Name *</Label>
                <Input value={sponsorForm.name} onChange={e => setSponsorForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Tier</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={sponsorForm.tier} onChange={e => setSponsorForm(p => ({ ...p, tier: e.target.value }))}>
                    <option value="platinum">Platinum</option>
                    <option value="gold">Gold</option>
                    <option value="silver">Silver</option>
                    <option value="bronze">Bronze</option>
                    <option value="partner">Partner</option>
                  </select>
                </div>
                <div>
                  <Label>Website</Label>
                  <Input value={sponsorForm.website} placeholder="https://" onChange={e => setSponsorForm(p => ({ ...p, website: e.target.value }))} />
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowSponsorModal(false)}>Cancel</Button>
                <Button className="bg-[#C58B1A] hover:bg-[#A56F14] text-white" onClick={() => createSponsorMutation.mutate(sponsorForm)} disabled={createSponsorMutation.isPending}>Add</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showScheduleModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={() => setShowScheduleModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="bg-[#1E4DB7] px-6 py-4 text-white flex justify-between">
              <h3 className="font-semibold">Add Schedule Item</h3>
              <button onClick={() => setShowScheduleModal(false)}><X className="w-4 h-4" /></button>
            </div>
            <div className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div>
                <Label>Session Title *</Label>
                <Input value={scheduleForm.title} onChange={e => setScheduleForm(p => ({ ...p, title: e.target.value }))} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Start Time *</Label>
                  <Input type="time" value={scheduleForm.start_time} onChange={e => setScheduleForm(p => ({ ...p, start_time: e.target.value }))} />
                </div>
                <div>
                  <Label>End Time</Label>
                  <Input type="time" value={scheduleForm.end_time} onChange={e => setScheduleForm(p => ({ ...p, end_time: e.target.value }))} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Location / Room</Label>
                  <Input value={scheduleForm.location} onChange={e => setScheduleForm(p => ({ ...p, location: e.target.value }))} />
                </div>
                <div>
                  <Label>Speaker (Optional)</Label>
                  <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm" value={scheduleForm.speaker} onChange={e => setScheduleForm(p => ({ ...p, speaker: e.target.value }))}>
                    <option value="">None</option>
                    {speakersData.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end gap-3 mt-4">
                <Button variant="outline" onClick={() => setShowScheduleModal(false)}>Cancel</Button>
                <Button className="bg-[#C58B1A] hover:bg-[#A56F14] text-white" onClick={() => {
                  const payload = { ...scheduleForm };
                  if (!payload.speaker) delete payload.speaker;
                  createScheduleMutation.mutate(payload);
                }} disabled={createScheduleMutation.isPending}>Add</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrganizerEventDetail;
