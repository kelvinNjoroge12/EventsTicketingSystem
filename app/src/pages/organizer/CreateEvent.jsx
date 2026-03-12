import React, { useEffect, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Check,
  Upload,
  Calendar,
  MapPin,
  DollarSign,
  Users,
  Clock,
  Info,
  ArrowLeft,
  Mic,
  Trash2,
  Award
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { api } from '@/lib/apiClient';
import { fetchCategories } from '@/lib/eventsApi';
import eventQueryKeys from '@/lib/eventQueryKeys';
import { useQuery } from '@tanstack/react-query';

const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const validateImageFile = (file) => {
  if (!file) return { ok: false, error: 'No file selected.' };
  if (!file.type?.startsWith('image/')) {
    return { ok: false, error: 'Only image files are allowed.' };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { ok: false, error: 'Image must be smaller than 10MB.' };
  }
  return { ok: true, error: '' };
};

const steps = [
  { id: 1, label: 'Event Details', icon: Info },
  { id: 2, label: 'Tickets', icon: DollarSign },
  { id: 3, label: 'Lineup', icon: Mic },
  { id: 4, label: 'Settings', icon: Users },
  { id: 5, label: 'Review', icon: Check },
];

const OrganizerCreateEvent = ({ onBack, onCreated }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categories, setCategories] = useState([]);
  const [coverImageFile, setCoverImageFile] = useState(null);
  const [coverPreview, setCoverPreview] = useState('');

  const [eventData, setEventData] = useState({
    name: '',
    description: '',
    category: '',
    date: '',
    time: '',
    endTime: '',
    location: '',
    address: '',
    isPublic: true,
    enableWaitlist: true,
    sendReminders: true,
  });

  const [ticketTypes, setTicketTypes] = useState([
    { id: '1', name: 'General Admission', price: 0, quantity: 100 },
  ]);

  const [speakers, setSpeakers] = useState([{ id: '1', name: '', title: '' }]);
  const [sponsors, setSponsors] = useState([{ id: '1', name: '', website: '' }]);

  const addSpeaker = () => setSpeakers((prev) => [...prev, { id: Date.now().toString(), name: '', title: '' }]);
  const updateSpeaker = (id, field, value) => setSpeakers((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  const removeSpeaker = (id) => setSpeakers((prev) => prev.filter((s) => s.id !== id));

  const addSponsor = () => setSponsors((prev) => [...prev, { id: Date.now().toString(), name: '', website: '' }]);
  const updateSponsor = (id, field, value) => setSponsors((prev) => prev.map((s) => (s.id === id ? { ...s, [field]: value } : s)));
  const removeSponsor = (id) => setSponsors((prev) => prev.filter((s) => s.id !== id));

  const { data: categoriesData = [] } = useQuery({
    queryKey: eventQueryKeys.categories(),
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setCategories(Array.isArray(categoriesData) ? categoriesData : []);
  }, [categoriesData]);

  const updateEventData = (field, value) => {
    setEventData((prev) => ({ ...prev, [field]: value }));
  };

  const addTicketType = () => {
    setTicketTypes((prev) => [...prev, { id: Date.now().toString(), name: '', price: 0, quantity: 0 }]);
  };

  const updateTicketType = (id, field, value) => {
    setTicketTypes((prev) => prev.map((ticket) => (ticket.id === id ? { ...ticket, [field]: value } : ticket)));
  };

  const removeTicketType = (id) => {
    setTicketTypes((prev) => prev.filter((ticket) => ticket.id !== id));
  };

  const handleNext = () => {
    if (currentStep < 5) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => prev - 1);
    } else if (onBack) {
      onBack();
    }
  };

  const isStepValid = () => {
    switch (currentStep) {
      case 1:
        return eventData.name && eventData.date && eventData.time && eventData.location && eventData.category;
      case 2:
        return ticketTypes.every((ticket) => ticket.name && ticket.quantity > 0);
      case 3:
        return speakers.every((s) => s.name.trim() !== '' || (s.name.trim() === '' && s.title.trim() === '')) &&
          sponsors.every((s) => s.name.trim() !== '' || (s.name.trim() === '' && s.website.trim() === ''));
      default:
        return true;
    }
  };

  const handleCoverImage = (file) => {
    const validation = validateImageFile(file);
    if (!validation.ok) {
      toast.error(validation.error);
      return;
    }
    setCoverImageFile(file);
    setCoverPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const payload = {
        title: eventData.name,
        description: eventData.description,
        category: eventData.category,
        event_type: eventData.isPublic ? 'public' : 'private',
        format: 'in_person',
        start_date: eventData.date,
        start_time: eventData.time,
        end_date: eventData.date,
        end_time: eventData.endTime || eventData.time,
        timezone: 'Africa/Nairobi',
        venue_name: eventData.location,
        venue_address: eventData.address || '',
        country: 'Kenya',
        refund_policy: 'no_refund',
        theme_color: '#1E4DB7',
        accent_color: '#7C3AED',
        send_reminders: eventData.sendReminders,
        enable_waitlist: eventData.enableWaitlist,
      };

      let createdEvent;
      if (coverImageFile) {
        const fd = new FormData();
        Object.entries(payload).forEach(([key, value]) => fd.append(key, value));
        fd.append('cover_image', coverImageFile);
        createdEvent = await api.postForm('/api/events/create/', fd);
      } else {
        createdEvent = await api.post('/api/events/create/', payload);
      }

      const ticketClassMap = {
        'Standard': 'paid',
        'VIP': 'vip',
        'Early Bird': 'early_bird',
        'Free': 'free',
        'Donation': 'donation',
      };

      if (ticketTypes.length > 0 && createdEvent?.slug) {
        const ticketPromises = ticketTypes.map((ticket) =>
          api.post(`/api/events/${createdEvent.slug}/tickets/create/`, {
            name: ticket.name,
            ticket_class: ticketClassMap[ticket.name] || 'paid',
            price: ticket.name === 'Free' ? 0 : Number(ticket.price || 0),
            quantity: Number(ticket.quantity || 0),
            description: '',
          }).catch(() => null)
        );
        await Promise.allSettled(ticketPromises);
      }

      if (speakers.some(s => s.name.trim()) && createdEvent?.slug) {
        const speakerPromises = speakers.filter(s => s.name.trim()).map(s =>
          api.post(`/api/events/${createdEvent.slug}/speakers/`, {
            name: s.name, title: s.title, organization: '', bio: '', twitter: '', linkedin: '', is_mc: false, sort_order: 0
          }).catch(() => null)
        );
        await Promise.allSettled(speakerPromises);
      }

      if (sponsors.some(s => s.name.trim()) && createdEvent?.slug) {
        const sponsorPromises = sponsors.filter(s => s.name.trim()).map(s =>
          api.post(`/api/events/${createdEvent.slug}/sponsors/`, {
            name: s.name, website: s.website, tier: 'partner', sort_order: 0
          }).catch(() => null)
        );
        await Promise.allSettled(sponsorPromises);
      }

      toast.success('Event created successfully!');
      if (onCreated) onCreated(createdEvent);
    } catch (err) {
      toast.error(err?.message || 'Failed to create event');
    } finally {
      setIsSubmitting(false);
    }
  };
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-4 lg:space-y-6 animate-slide-in-right">
            <label className="border-2 border-dashed border-gray-200 rounded-xl p-6 lg:p-8 text-center hover:border-[#C58B1A] hover:bg-[#C58B1A]/5 transition-colors cursor-pointer block">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => handleCoverImage(e.target.files?.[0])}
              />
              {coverPreview ? (
                <img src={coverPreview} alt="Event cover" className="w-full h-40 object-cover rounded-lg" />
              ) : (
                <>
                  <Upload className="w-10 h-10 lg:w-12 lg:h-12 text-gray-400 mx-auto mb-3 lg:mb-4" />
                  <p className="text-gray-600 font-medium text-sm lg:text-base mb-1">Upload event image</p>
                  <p className="text-xs lg:text-sm text-gray-400">Drag and drop or click to browse</p>
                  <p className="text-xs text-gray-400 mt-2">Recommended: 1200x600px, JPG or PNG</p>
                </>
              )}
            </label>

            <div className="space-y-2">
              <Label htmlFor="name">Event Name *</Label>
              <Input
                id="name"
                placeholder="Enter event name"
                value={eventData.name}
                onChange={(e) => updateEventData('name', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Describe your event..."
                rows={4}
                value={eventData.description}
                onChange={(e) => updateEventData('description', e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={eventData.category} onValueChange={(value) => updateEventData('category', value)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.length === 0 && <SelectItem value="">No categories</SelectItem>}
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
              <div className="space-y-2">
                <Label htmlFor="date">Date *</Label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="date"
                    type="date"
                    className="pl-10"
                    value={eventData.date}
                    onChange={(e) => updateEventData('date', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="time">Start Time *</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="time"
                    type="time"
                    className="pl-10"
                    value={eventData.time}
                    onChange={(e) => updateEventData('time', e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="endTime">End Time</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="endTime"
                    type="time"
                    className="pl-10"
                    value={eventData.endTime}
                    onChange={(e) => updateEventData('endTime', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="location">Venue Name *</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  id="location"
                  placeholder="Enter venue name"
                  className="pl-10"
                  value={eventData.location}
                  onChange={(e) => updateEventData('location', e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Enter full address"
                rows={2}
                value={eventData.address}
                onChange={(e) => updateEventData('address', e.target.value)}
              />
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-4 lg:space-y-6 animate-slide-in-right">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-[#0F172A] text-sm lg:text-base">Ticket Types</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addTicketType}
                className="border-[#C58B1A] text-[#C58B1A] hover:bg-[#C58B1A] hover:text-white text-xs lg:text-sm"
              >
                + Add Ticket Type
              </Button>
            </div>

            {ticketTypes.map((ticket) => (
              <Card key={ticket.id} className="relative">
                <CardContent className="p-3 lg:p-4 space-y-3 lg:space-y-4">
                  {ticketTypes.length > 1 && (
                    <button
                      onClick={() => removeTicketType(ticket.id)}
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 text-lg"
                    >
                      x
                    </button>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 lg:gap-4">
                    <div className="space-y-2">
                      <Label className="text-sm">Ticket Name *</Label>
                      <Input
                        placeholder="e.g., VIP, General"
                        value={ticket.name}
                        onChange={(e) => updateTicketType(ticket.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Price (KES)</Label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="number"
                          placeholder="0"
                          className="pl-10"
                          value={ticket.price}
                          onChange={(e) => updateTicketType(ticket.id, 'price', parseFloat(e.target.value) || 0)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-sm">Quantity *</Label>
                      <div className="relative">
                        <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <Input
                          type="number"
                          placeholder="100"
                          className="pl-10"
                          value={ticket.quantity}
                          onChange={(e) => updateTicketType(ticket.id, 'quantity', parseInt(e.target.value, 10) || 0)}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            <Card className="bg-gray-50">
              <CardContent className="p-3 lg:p-4">
                <div className="flex items-center justify-between">
                  <span className="text-gray-600 text-sm lg:text-base">Total Capacity</span>
                  <span className="text-lg lg:text-xl font-bold text-[#0F172A]">
                    {ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0)} guests
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 3:
        return (
          <div className="space-y-4 lg:space-y-6 animate-slide-in-right">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm lg:text-base">Speakers / Lineup</CardTitle>
                <Button variant="outline" size="sm" onClick={addSpeaker}>
                  <Mic className="w-4 h-4 mr-2" /> Add Speaker
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 lg:space-y-4">
                {speakers.map((speaker, index) => (
                  <div key={speaker.id} className="flex flex-col md:flex-row gap-3 border border-gray-100 p-4 rounded-xl relative group">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeSpeaker(speaker.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="flex-1 space-y-2">
                      <Label className="text-sm">Speaker Name</Label>
                      <Input
                        placeholder="e.g. John Doe"
                        value={speaker.name}
                        onChange={(e) => updateSpeaker(speaker.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-sm">Title / Role</Label>
                      <Input
                        placeholder="e.g. Software Engineer"
                        value={speaker.title}
                        onChange={(e) => updateSpeaker(speaker.id, 'title', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm lg:text-base">Event Sponsors</CardTitle>
                <Button variant="outline" size="sm" onClick={addSponsor}>
                  <Award className="w-4 h-4 mr-2" /> Add Sponsor
                </Button>
              </CardHeader>
              <CardContent className="space-y-3 lg:space-y-4">
                {sponsors.map((sponsor, index) => (
                  <div key={sponsor.id} className="flex flex-col md:flex-row gap-3 border border-gray-100 p-4 rounded-xl relative group">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeSponsor(sponsor.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                    <div className="flex-1 space-y-2">
                      <Label className="text-sm">Sponsor Name</Label>
                      <Input
                        placeholder="e.g. TechCorp"
                        value={sponsor.name}
                        onChange={(e) => updateSponsor(sponsor.id, 'name', e.target.value)}
                      />
                    </div>
                    <div className="flex-1 space-y-2">
                      <Label className="text-sm">Website URL</Label>
                      <Input
                        placeholder="https://"
                        value={sponsor.website}
                        onChange={(e) => updateSponsor(sponsor.id, 'website', e.target.value)}
                      />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        );

      case 4:
        return (
          <div className="space-y-4 lg:space-y-6 animate-slide-in-right">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm lg:text-base">Privacy Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 lg:space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#0F172A] text-sm lg:text-base">Public Event</p>
                    <p className="text-xs lg:text-sm text-gray-500">Anyone can find and register for this event</p>
                  </div>
                  <Switch
                    checked={eventData.isPublic}
                    onCheckedChange={(checked) => updateEventData('isPublic', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm lg:text-base">Registration Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 lg:space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#0F172A] text-sm lg:text-base">Enable Waitlist</p>
                    <p className="text-xs lg:text-sm text-gray-500">Allow guests to join waitlist when sold out</p>
                  </div>
                  <Switch
                    checked={eventData.enableWaitlist}
                    onCheckedChange={(checked) => updateEventData('enableWaitlist', checked)}
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm lg:text-base">Notification Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 lg:space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-[#0F172A] text-sm lg:text-base">Send Reminders</p>
                    <p className="text-xs lg:text-sm text-gray-500">Automatically send reminder emails before event</p>
                  </div>
                  <Switch
                    checked={eventData.sendReminders}
                    onCheckedChange={(checked) => updateEventData('sendReminders', checked)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        );

      case 5:
        return (
          <div className="space-y-4 lg:space-y-6 animate-slide-in-right">
            <Card className="overflow-hidden">
              <div className="h-24 lg:h-32 bg-gradient-to-br from-[#1E4DB7] to-[#7C3AED]" />
              <CardContent className="p-4 lg:p-6">
                <div className="-mt-10 lg:-mt-16 mb-3 lg:mb-4">
                  <div className="w-16 h-16 lg:w-24 lg:h-24 rounded-xl bg-gray-200 border-2 lg:border-4 border-white flex items-center justify-center">
                    <Calendar className="w-6 h-6 lg:w-10 lg:h-10 text-gray-400" />
                  </div>
                </div>
                <h2 className="text-lg lg:text-xl font-bold text-[#0F172A] mb-1">{eventData.name || 'Untitled Event'}</h2>
                <p className="text-gray-500 text-sm line-clamp-2">{eventData.description || 'No description provided'}</p>

                <div className="grid grid-cols-2 gap-3 lg:gap-4 mt-4 text-xs lg:text-sm">
                  <div>
                    <span className="text-gray-400">Date</span>
                    <p className="font-medium text-[#0F172A]">{eventData.date || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Time</span>
                    <p className="font-medium text-[#0F172A]">{eventData.time || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Location</span>
                    <p className="font-medium text-[#0F172A]">{eventData.location || 'Not set'}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Category</span>
                    <p className="font-medium text-[#0F172A] capitalize">{eventData.category || 'Not set'}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm lg:text-base">Ticket Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {ticketTypes.map((ticket) => (
                    <div key={ticket.id} className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
                      <span className="text-gray-600 text-sm">{ticket.name}</span>
                      <div className="flex items-center gap-3 lg:gap-4">
                        <Badge variant="outline" className="text-xs">{ticket.quantity} tickets</Badge>
                        <span className="font-medium text-[#0F172A] text-sm">
                          {ticket.price === 0 ? 'Free' : `KES ${ticket.price}`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 lg:mt-4 pt-3 lg:pt-4 border-t border-gray-100 flex items-center justify-between">
                  <span className="font-medium text-[#0F172A] text-sm lg:text-base">Total Capacity</span>
                  <span className="text-lg lg:text-xl font-bold text-[#0F172A]">
                    {ticketTypes.reduce((sum, ticket) => sum + ticket.quantity, 0)} guests
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm lg:text-base">Settings Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-xs lg:text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Visibility</span>
                    <Badge className={eventData.isPublic ? 'bg-green-500 text-xs' : 'bg-gray-500 text-xs'}>
                      {eventData.isPublic ? 'Public' : 'Private'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Waitlist</span>
                    <Badge className={eventData.enableWaitlist ? 'bg-green-500 text-xs' : 'bg-gray-500 text-xs'}>
                      {eventData.enableWaitlist ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-gray-600">Reminders</span>
                    <Badge className={eventData.sendReminders ? 'bg-green-500 text-xs' : 'bg-gray-500 text-xs'}>
                      {eventData.sendReminders ? 'Enabled' : 'Disabled'}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6">
        <Button variant="ghost" size="icon" onClick={handleBack}>
          <ArrowLeft className="w-5 h-5" />
        </Button>
        <div>
          <h2 className="text-xl lg:text-2xl font-bold text-[#0F172A]">Create Event</h2>
          <p className="text-gray-500 text-sm">Fill in the details to create your event</p>
        </div>
      </div>

      <div className="mb-6 lg:mb-8">
        <div className="flex items-center justify-between">
          {steps.map((step, index) => {
            const Icon = step.icon;
            const isActive = step.id === currentStep;
            const isCompleted = step.id < currentStep;

            return (
              <div key={step.id} className="flex items-center flex-1">
                <div className="flex flex-col items-center">
                  <div
                    className={cn(
                      'w-8 h-8 lg:w-10 lg:h-10 rounded-full flex items-center justify-center transition-all duration-300',
                      isActive && 'bg-[#C58B1A] text-white ring-2 lg:ring-4 ring-[#C58B1A]/20',
                      isCompleted && 'bg-green-500 text-white',
                      !isActive && !isCompleted && 'bg-gray-100 text-gray-400'
                    )}
                  >
                    {isCompleted ? <Check className="w-4 h-4 lg:w-5 lg:h-5" /> : <Icon className="w-4 h-4 lg:w-5 lg:h-5" />}
                  </div>
                  <span
                    className={cn(
                      'text-xs mt-1 lg:mt-2 font-medium text-center',
                      isActive && 'text-[#0F172A]',
                      isCompleted && 'text-green-600',
                      !isActive && !isCompleted && 'text-gray-400'
                    )}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'flex-1 h-0.5 lg:h-1 mx-1 lg:mx-2 rounded-full transition-all duration-300',
                      isCompleted ? 'bg-green-500' : 'bg-gray-200'
                    )}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <Card>
        <CardContent className="p-4 lg:p-6">{renderStepContent()}</CardContent>
      </Card>

      <div className="flex justify-between mt-4 lg:mt-6">
        <Button variant="outline" onClick={handleBack} disabled={isSubmitting} className="text-xs lg:text-sm">
          <ChevronLeft className="w-4 h-4 mr-1.5" />
          {currentStep === 1 ? 'Cancel' : 'Back'}
        </Button>

        {currentStep < 5 ? (
          <Button onClick={handleNext} disabled={!isStepValid()} className="bg-[#1E4DB7] hover:bg-[#163B90] text-xs lg:text-sm">
            Next
            <ChevronRight className="w-4 h-4 ml-1.5" />
          </Button>
        ) : (
          <Button onClick={handleSubmit} disabled={isSubmitting} className="bg-[#C58B1A] text-white hover:bg-[#A56F14] text-xs lg:text-sm">
            {isSubmitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                Creating...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-1.5" />
                Create Event
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};

export default OrganizerCreateEvent;
