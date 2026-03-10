import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, AlertCircle, Calendar, MapPin, Clock, Users, Zap, Building2, Mic2 } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import StepNav from '../components/organizer/StepNav';
import OrganizerHeader from '../components/organizer/OrganizerHeader';
import FormStep from '../components/organizer/FormStep';
import CustomButton from '../components/ui/CustomButton';
import CustomAvatar from '../components/ui/CustomAvatar';
import Modal from '../components/ui/Modal';
import { api } from '../lib/apiClient';
import { fetchCategories, fetchEvent } from '../lib/eventsApi';
import {
  BasicInfoStep,
  DateLocationStep,
  DescriptionStep,
  SpeakersStep,
  ScheduleStep,
  SponsorsStep,
  TicketsStep
} from '../components/organizer/EventForm';

const CreateEventPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [completedSteps, setCompletedSteps] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState('');
  const [scheduledDate, setScheduledDate] = useState('');
  const [categories, setCategories] = useState([]);
  const [isLoading, setIsLoading] = useState(!!slug);
  const [initialSubresources, setInitialSubresources] = useState({
    tickets: [],
    speakers: [],
    sponsors: [],
    schedule: [],
    mcId: null,
  });
  const pageTitle = slug ? 'Edit Event' : 'Create Event';

  // Fetch categories and event if editing
  useEffect(() => {
    (async () => {
      try {
        const [cats, eventData] = await Promise.all([
          fetchCategories(),
          slug ? fetchEvent(slug) : Promise.resolve(null)
        ]);

        setCategories(cats);

          if (eventData) {
            const unmapRefundPolicy = (val) => ({ 'no_refund': 'No Refund', '48_hours': '48 Hours', '7_days': '7 Days', 'custom': 'Custom' }[val] || 'No Refund');

          // Map fetched event data to form data
            setFormData({
              title: eventData.title || '',
              category: eventData.rawCategory || '',
              tags: eventData.tags || [],
              eventType: 'public',
              format: eventData.format === 'in_person' ? 'In-Person' : eventData.format === 'online' ? 'Online' : 'Hybrid',
              themeColor: eventData.themeColor || '#1E4DB7',
              accentColor: eventData.accentColor || '#7C3AED',
              startDate: eventData.startDate || '',
              startTime: eventData.startTime || '',
              endDate: eventData.endDate || '',
              endTime: eventData.endTime || '',
              timezone: eventData.timezone || 'EAT',
              venueName: eventData.venueName || '',
              address: eventData.address || '',
              city: eventData.city || '',
              country: eventData.country || 'Kenya',
              streamingLink: eventData.streamingLink || '',
              description: eventData.description || '',
              coverImage: null,
              coverImagePreview: eventData.bannerImage || '',
              speakers: (eventData.speakers || []).map(s => ({
                id: s.id,
                name: s.name || '',
                title: s.title || '',
                organization: s.organization || '',
                bio: s.bio || '',
                photo: null,
                photoPreview: s.avatar || ''
              })),
              hasMC: !!eventData.mc,
              mcName: eventData.mc?.name || '',
              mcBio: eventData.mc?.bio || '',
              mcPhoto: null,
              mcPhotoPreview: eventData.mc?.avatar || '',
              schedule: (eventData.schedule || []).map(item => ({
                id: item.id,
                title: item.title || '',
                time: item.time || '',
                description: item.description || ''
              })),
              sponsors: (eventData.sponsors || []).map(s => ({
                id: s.id,
                name: s.name || '',
                website: s.website || '',
                tier: s.tier || '',
                logo: null,
                logoPreview: s.logo || ''
              })),
              tickets: eventData.tickets.length > 0
                ? eventData.tickets.map(t => ({
                  id: t.id,
                  type: t.type,
                  price: t.price,
                  quantity: t.quantity || 100,
                  description: t.description || ''
                }))
                : [{ type: 'Standard', price: 0, quantity: 100, description: '' }],
              refundPolicy: unmapRefundPolicy(eventData.refundPolicy),
              customRefundPolicy: eventData.customRefundPolicy || '',
              enableWaitlist: eventData.enableWaitlist ?? eventData.enable_waitlist ?? false,
              sendReminders: eventData.sendReminders ?? eventData.send_reminders ?? true,
            });
            setCompletedSteps([0, 1, 2, 3, 4, 5, 6]);
            setInitialSubresources({
              tickets: (eventData.tickets || []).map(t => t.id).filter(Boolean),
              speakers: (eventData.speakers || []).map(s => s.id).filter(Boolean),
              sponsors: (eventData.sponsors || []).map(s => s.id).filter(Boolean),
              schedule: (eventData.schedule || []).map(item => item.id).filter(Boolean),
              mcId: eventData.mc?.id || null,
            });
          }
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        setIsLoading(false);
      }
    })();
  }, [slug]);

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    tags: [],
    eventType: 'public',
    format: 'In-Person',
    themeColor: '#1E4DB7',
    accentColor: '#7C3AED',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    timezone: 'EAT',
    venueName: '',
    address: '',
    city: '',
    country: 'Kenya',
    streamingLink: '',
    description: '',
    coverImage: null,
    coverImagePreview: '',
    speakers: [],
    hasMC: false,
    mcName: '',
    mcBio: '',
    mcPhoto: null,
    mcPhotoPreview: '',
    schedule: [],
    sponsors: [],
    tickets: [{ type: 'Standard', price: 0, quantity: 100, description: '' }],
    refundPolicy: 'No Refund',
    customRefundPolicy: '',
    enableWaitlist: false,
    sendReminders: true,
  });

  const [errors, setErrors] = useState({});

  const steps = [
    { id: 'basic', number: 1, label: 'Basic Info' },
    { id: 'datetime', number: 2, label: 'Date & Location' },
    { id: 'description', number: 3, label: 'Description' },
    { id: 'speakers', number: 4, label: 'Speakers' },
    { id: 'schedule', number: 5, label: 'Schedule' },
    { id: 'sponsors', number: 6, label: 'Sponsors' },
    { id: 'tickets', number: 7, label: 'Tickets' },
    { id: 'review', number: 8, label: 'Review' },
  ];

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const validateStep = (step) => {
    const newErrors = {};
    if (step === 0) {
      if (!formData.title.trim()) newErrors.title = 'Event title is required';
      if (!formData.category) newErrors.category = 'Category is required';
    }
    if (step === 1) {
      if (!formData.startDate) newErrors.startDate = 'Start date is required';
      if (!formData.startTime) newErrors.startTime = 'Start time is required';
      if (!formData.endDate) newErrors.endDate = 'End date is required';
      if (!formData.endTime) newErrors.endTime = 'End time is required';
      if ((formData.format === 'In-Person' || formData.format === 'Hybrid') && !formData.venueName) {
        newErrors.venueName = 'Venue name is required';
      }
      if ((formData.format === 'In-Person' || formData.format === 'Hybrid') && !formData.address) {
        newErrors.address = 'Venue address is required';
      }
    }
    if (step === 6) {
      if (formData.tickets.length === 0) newErrors.tickets = 'At least one ticket type is required';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setDirection('forward');
      setCompletedSteps(prev => [...new Set([...prev, currentStep])]);
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    }
  };

  const handleBack = () => {
    setDirection('backward');
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const mapFormat = (fmt) => ({ 'In-Person': 'in_person', 'Online': 'online', 'Hybrid': 'hybrid' }[fmt] || 'in_person');
  const mapRefundPolicy = (policy) => ({ 'No Refund': 'no_refund', '48 Hours': '48_hours', '7 Days': '7_days', 'Custom': 'custom' }[policy] || 'no_refund');

  const ensureUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

  const parseStartTime = (value) => {
    if (!value) return '';
    const match = String(value).match(/\d{1,2}:\d{2}/);
    return match ? match[0] : '';
  };

  const buildPayload = (status = 'pending') => {
    const data = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      event_type: formData.eventType,
      format: mapFormat(formData.format),
      start_date: formData.startDate,
      start_time: formData.startTime,
      end_date: formData.endDate,
      end_time: formData.endTime,
      timezone: formData.timezone === 'EAT' ? 'Africa/Nairobi' : formData.timezone,
      venue_name: formData.venueName || '',
      venue_address: formData.address || '',
      city: formData.city || '',
      country: formData.country || 'Kenya',
      streaming_link: ensureUrl(formData.streamingLink),
      refund_policy: mapRefundPolicy(formData.refundPolicy),
      theme_color: formData.themeColor || '#1E4DB7',
      accent_color: formData.accentColor || '#7C3AED',
      enable_waitlist: Boolean(formData.enableWaitlist),
      send_reminders: Boolean(formData.sendReminders),
      ...(status === 'draft' && { status: 'draft' }),
    };

    const hasFiles = formData.coverImage || formData.mcPhoto ||
      formData.speakers.some(s => s.photo) ||
      formData.sponsors.some(s => s.logo);

    if (hasFiles) {
      const fd = new FormData();
      Object.keys(data).forEach(key => fd.append(key, data[key]));
      fd.append('stickers', JSON.stringify([]));

      if (formData.tags?.length > 0) formData.tags.forEach(tag => fd.append('tags', tag));
      if (formData.coverImage) fd.append('cover_image', formData.coverImage);

      return fd;
    }

    return { ...data, tags: formData.tags, stickers: [] };
  };

  const createEventAndTickets = async (payload) => {
    let event;
    if (slug) {
      event = payload instanceof FormData
        ? await api.patchForm(`/api/events/${slug}/edit/`, payload)
        : await api.patch(`/api/events/${slug}/edit/`, payload);
    } else {
      event = payload instanceof FormData
        ? await api.postForm('/api/events/create/', payload)
        : await api.post('/api/events/create/', payload);
    }

    const eventSlug = event.slug || slug;
    const ticketClassMap = {
      'Standard': 'paid',
      'VIP': 'vip',
      'Early Bird': 'early_bird',
      'Free': 'free',
      'Donation': 'donation',
    };

    const tasks = [];

    // Tickets (create or update)
    if (formData.tickets.length > 0) {
      formData.tickets.forEach((ticket) => {
        const payloadData = {
          name: ticket.type,
          ticket_class: ticketClassMap[ticket.type] || 'paid',
          price: ticket.type === 'Free' ? 0 : ticket.price,
          quantity: ticket.quantity,
          description: ticket.description || '',
        };
        if (ticket.id) {
          tasks.push(
            api.patch(`/api/events/${eventSlug}/tickets/${ticket.id}/`, payloadData)
              .catch(err => console.warn('Ticket update failed:', err))
          );
        } else {
          tasks.push(
            api.post(`/api/events/${eventSlug}/tickets/create/`, payloadData)
              .catch(err => console.warn('Ticket creation failed:', err))
          );
        }
      });
    }

    // Speakers (create or update)
    if (formData.speakers.length > 0) {
      formData.speakers.forEach((speaker, idx) => {
        if (!speaker.name) return;
        const hasPhoto = !!speaker.photo;
        if (speaker.id) {
          if (hasPhoto) {
            const fd = new FormData();
            fd.append('name', speaker.name);
            fd.append('title', speaker.title || '');
            fd.append('organization', speaker.organization || '');
            fd.append('bio', speaker.bio || '');
            fd.append('is_mc', 'false');
            fd.append('sort_order', String(idx));
            fd.append('avatar', speaker.photo);
            tasks.push(
              api.patchForm(`/api/events/${eventSlug}/speakers/${speaker.id}/`, fd)
                .catch(err => console.warn('Speaker update failed:', err))
            );
          } else {
            tasks.push(
              api.patch(`/api/events/${eventSlug}/speakers/${speaker.id}/`, {
                name: speaker.name,
                title: speaker.title || '',
                organization: speaker.organization || '',
                bio: speaker.bio || '',
                is_mc: false,
                sort_order: idx,
              }).catch(err => console.warn('Speaker update failed:', err))
            );
          }
        } else {
          const fd = new FormData();
          fd.append('name', speaker.name);
          fd.append('title', speaker.title || '');
          fd.append('organization', speaker.organization || '');
          fd.append('bio', speaker.bio || '');
          fd.append('is_mc', 'false');
          fd.append('sort_order', String(idx));
          if (speaker.photo) fd.append('avatar', speaker.photo);
          tasks.push(
            api.postForm(`/api/events/${eventSlug}/speakers/`, fd)
              .catch(err => console.warn('Speaker creation failed:', err))
          );
        }
      });
    }

    // MC (create or update)
    if (formData.hasMC && formData.mcName) {
      const hasPhoto = !!formData.mcPhoto;
      if (initialSubresources.mcId) {
        if (hasPhoto) {
          const mcFd = new FormData();
          mcFd.append('name', formData.mcName);
          mcFd.append('bio', formData.mcBio || '');
          mcFd.append('is_mc', 'true');
          mcFd.append('sort_order', '0');
          mcFd.append('avatar', formData.mcPhoto);
          tasks.push(
            api.patchForm(`/api/events/${eventSlug}/speakers/${initialSubresources.mcId}/`, mcFd)
              .catch(err => console.warn('MC update failed:', err))
          );
        } else {
          tasks.push(
            api.patch(`/api/events/${eventSlug}/speakers/${initialSubresources.mcId}/`, {
              name: formData.mcName,
              bio: formData.mcBio || '',
              is_mc: true,
              sort_order: 0,
            }).catch(err => console.warn('MC update failed:', err))
          );
        }
      } else {
        const mcFd = new FormData();
        mcFd.append('name', formData.mcName);
        mcFd.append('bio', formData.mcBio || '');
        mcFd.append('is_mc', 'true');
        mcFd.append('sort_order', '0');
        if (formData.mcPhoto) mcFd.append('avatar', formData.mcPhoto);
        tasks.push(
          api.postForm(`/api/events/${eventSlug}/speakers/`, mcFd)
            .catch(err => console.warn('MC creation failed:', err))
        );
      }
    }

    // Schedule items (create or update)
    if (formData.schedule.length > 0) {
      formData.schedule.forEach((item, idx) => {
        if (!item.title) return;
        const payloadData = {
          title: item.title,
          description: item.description || '',
          start_time: parseStartTime(item.time) || '00:00',
          sort_order: idx,
        };
        if (item.id) {
          tasks.push(
            api.patch(`/api/events/${eventSlug}/schedule/${item.id}/`, payloadData)
              .catch(err => console.warn('Schedule update failed:', err))
          );
        } else {
          tasks.push(
            api.post(`/api/events/${eventSlug}/schedule/`, payloadData)
              .catch(err => console.warn('Schedule creation failed:', err))
          );
        }
      });
    }

    // Sponsors (create or update)
    if (formData.sponsors.length > 0) {
      formData.sponsors.forEach((sponsor, idx) => {
        if (!sponsor.name) return;
        const hasLogo = !!sponsor.logo;
        const tierValue = (sponsor.tier || 'bronze').toLowerCase();
        if (sponsor.id) {
          if (hasLogo) {
            const fd = new FormData();
            fd.append('name', sponsor.name);
            fd.append('website', ensureUrl(sponsor.website));
            fd.append('tier', tierValue);
            fd.append('sort_order', String(idx));
            fd.append('logo', sponsor.logo);
            tasks.push(
              api.patchForm(`/api/events/${eventSlug}/sponsors/${sponsor.id}/`, fd)
                .catch(err => console.warn('Sponsor update failed:', err))
            );
          } else {
            tasks.push(
              api.patch(`/api/events/${eventSlug}/sponsors/${sponsor.id}/`, {
                name: sponsor.name,
                website: ensureUrl(sponsor.website),
                tier: tierValue,
                sort_order: idx,
              }).catch(err => console.warn('Sponsor update failed:', err))
            );
          }
        } else {
          const fd = new FormData();
          fd.append('name', sponsor.name);
          fd.append('website', ensureUrl(sponsor.website));
          fd.append('tier', tierValue);
          fd.append('sort_order', String(idx));
          if (sponsor.logo) fd.append('logo', sponsor.logo);
          tasks.push(
            api.postForm(`/api/events/${eventSlug}/sponsors/`, fd)
              .catch(err => console.warn('Sponsor creation failed:', err))
          );
        }
      });
    }

    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
    }

    return event;
  };

  const getErrorMessage = (err) =>
    err?.response?.detail || err?.response?.message || err?.message || 'Something went wrong. Please try again.';

  const handleSaveDraft = async () => {
    setIsPublishing(true);
    setPublishError('');
    try {
      const payload = buildPayload('draft');
      const event = await createEventAndTickets(payload);
      navigate(`/events/${event.slug}`);
    } catch (err) {
      setPublishError(getErrorMessage(err));
    } finally {
      setIsPublishing(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    setPublishError('');
    try {
      const payload = buildPayload();
      const event = await createEventAndTickets(payload);
      try {
        await api.patch(`/api/events/${event.slug}/publish/`);
        navigate(`/events/${event.slug}`);
      } catch (publishErr) {
        setPublishError(`Event saved as a draft. ${getErrorMessage(publishErr)}`);
      }
    } catch (err) {
      setPublishError(getErrorMessage(err));
    } finally {
      setIsPublishing(false);
    }
  };

  const handleSchedulePublish = async () => {
    if (!scheduledDate) return;
    setIsPublishing(true);
    setPublishError('');
    try {
      const payload = buildPayload();
      if (payload instanceof FormData) payload.append('scheduled_publish_at', scheduledDate);
      else payload.scheduled_publish_at = scheduledDate;
      const event = await createEventAndTickets(payload);
      setShowScheduleModal(false);
      navigate(`/events/${event.slug}`);
    } catch (err) {
      setPublishError(getErrorMessage(err));
    } finally {
      setIsPublishing(false);
    }
  };

  const renderStepContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <motion.div
            className="w-12 h-12 border-4 border-[#1E4DB7] border-t-transparent rounded-full mb-4"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
          />
          <p className="text-[#64748B]">Loading event data...</p>
        </div>
      );
    }

    switch (currentStep) {
      case 0: return <BasicInfoStep data={formData} onChange={handleChange} errors={errors} categories={categories} />;
      case 1: return <DateLocationStep data={formData} onChange={handleChange} errors={errors} />;
      case 2: return <DescriptionStep data={formData} onChange={handleChange} errors={errors} />;
      case 3: return <SpeakersStep data={formData} onChange={handleChange} />;
      case 4: return <ScheduleStep data={formData} onChange={handleChange} />;
      case 5: return <SponsorsStep data={formData} onChange={handleChange} />;
      case 6: return <TicketsStep data={formData} onChange={handleChange} errors={errors} />;
      case 7: return (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold text-[#0F172A]">Review & Preview</h2>
              <p className="text-[#64748B]">This is how your event will appear to attendees.</p>
            </div>
          </div>

          {/* REAL PREVIEW CARD */}
          <div className="bg-white rounded-3xl border border-[#E2E8F0] overflow-hidden shadow-sm">
            {/* Banner Preview */}
            <div className="relative h-48 md:h-64 overflow-hidden">
              <div className="absolute inset-0" style={{
                background: formData.coverImagePreview
                  ? `url(${formData.coverImagePreview}) center/cover no-repeat`
                  : `linear-gradient(135deg, ${formData.themeColor}, ${formData.accentColor})`
              }} />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent" />
              <div className="absolute bottom-6 left-6 right-6">
                <div className="flex gap-2 mb-3">
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/20">
                    {categories.find(c => c.id === formData.category)?.name || 'Category'}
                  </span>
                  <span className="px-3 py-1 rounded-full text-[10px] font-bold bg-white/20 backdrop-blur-md text-white border border-white/20">
                    {formData.format}
                  </span>
                </div>
                <h1 className="text-2xl md:text-3xl font-bold text-white">{formData.title || 'Untitled Event'}</h1>
              </div>
            </div>

            <div className="p-6 grid md:grid-cols-3 gap-8">
              {/* Left Column: Details */}
              <div className="md:col-span-2 space-y-8">
                <div>
                  <h3 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8] mb-4">About Event</h3>
                  <p className="text-[#475569] leading-relaxed whitespace-pre-line">
                    {formData.description || 'No description provided.'}
                  </p>
                </div>

                {/* Speakers Preview */}
                {formData.speakers.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8] mb-4 flex items-center gap-2">
                      <Users className="w-4 h-4" /> Speakers
                    </h3>
                    <div className="grid grid-cols-2 gap-4">
                      {formData.speakers.map((s, i) => (
                        <div key={i} className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                          <CustomAvatar src={s.photoPreview} name={s.name} size="sm" />
                          <div>
                            <p className="text-sm font-bold text-[#0F172A]">{s.name}</p>
                            <p className="text-[10px] text-[#64748B]">{s.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Schedule Preview */}
                {formData.schedule.length > 0 && (
                  <div>
                    <h3 className="text-sm font-bold uppercase tracking-wider text-[#94A3B8] mb-4 flex items-center gap-2">
                      <Clock className="w-4 h-4" /> Schedule
                    </h3>
                    <div className="space-y-3">
                      {formData.schedule.map((item, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <div className="w-1.5 h-1.5 rounded-full mt-2" style={{ backgroundColor: formData.themeColor }} />
                          <div>
                            <p className="text-xs font-bold" style={{ color: formData.themeColor }}>{item.time}</p>
                            <p className="text-sm font-medium text-[#0F172A]">{item.title}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column: Meta Info */}
              <div className="space-y-6">
                <div className="bg-[#F8FAFC] p-5 rounded-2xl border border-[#E2E8F0] space-y-4">
                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white shadow-sm border border-[#E2E8F0] text-[#1E4DB7]">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-tight">Date</p>
                      <p className="text-sm font-bold text-[#0F172A]">{formData.startDate || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white shadow-sm border border-[#E2E8F0] text-[#1E4DB7]">
                      <MapPin className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-tight">Location</p>
                      <p className="text-sm font-bold text-[#0F172A] truncate max-w-[150px]">
                        {formData.venueName || formData.format}
                      </p>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-[#E2E8F0]">
                    <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-tight mb-2">Tickets Starting From</p>
                    {formData.tickets.length > 0 ? (
                      <p className="text-xl font-black text-[#0F172A]">
                        KES {Math.min(...formData.tickets.map(t => t.price || 0)).toLocaleString()}
                      </p>
                    ) : (
                      <p className="text-sm text-[#64748B]">No tickets set</p>
                    )}
                  </div>
                </div>

                {formData.sponsors.length > 0 && (
                  <div className="bg-white p-5 rounded-2xl border border-[#E2E8F0]">
                    <h4 className="text-[10px] font-bold uppercase text-[#94A3B8] mb-3">Our Sponsors</h4>
                    <div className="flex flex-wrap gap-3">
                      {formData.sponsors.map((s, i) => (
                        <div key={i} className="w-10 h-10 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center p-1 overflow-hidden">
                          {s.logoPreview ? (
                            <img src={s.logoPreview} alt={s.name} className="w-full h-full object-contain" />
                          ) : (
                            <span className="text-[10px] font-bold text-[#1E4DB7]">{s.name?.charAt(0)}</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-4">
            <CustomButton variant="outline" onClick={handleSaveDraft} disabled={isPublishing} fullWidth>
              Save as Draft
            </CustomButton>
            <CustomButton variant="outline" onClick={() => setShowScheduleModal(true)} fullWidth>
              Schedule Publish
            </CustomButton>
          </div>

          {publishError && (() => {
            const isDraftSaved = publishError.startsWith('Event saved as a draft');
            return (
              <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
                className={`mt-4 p-4 rounded-lg flex items-start gap-3 border ${isDraftSaved ? 'bg-amber-50 border-amber-300' : 'bg-[#FEF2F2] border-[#F87171]'}`}
              >
                <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${isDraftSaved ? 'text-amber-600' : 'text-[#DC2626]'}`} />
                <p className={`text-sm ${isDraftSaved ? 'text-amber-700' : 'text-[#DC2626]'}`}>{publishError}</p>
              </motion.div>
            );
          })()}
        </div>
      );
      default: return null;
    }
  };

  return (
    <PageWrapper className="bg-[#F8FAFC]">
      <OrganizerHeader title={pageTitle} showMenu={false} useSidebarOffset={false} />

      <div className="pt-20">
        {/* Header */}
        <div className="bg-white border-b border-[#E2E8F0]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4 mb-6">
              <button onClick={() => navigate(-1)} className="p-2 rounded-lg hover:bg-[#F1F5F9] text-[#64748B]">
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <p className="text-xs uppercase tracking-wider text-[#94A3B8]">Step {currentStep + 1} of {steps.length}</p>
                <p className="text-sm text-[#64748B]">Complete your event details</p>
              </div>
              {/* Color preview dots */}
              <div className="ml-auto flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: formData.themeColor }} />
                <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: formData.accentColor }} />
              </div>
            </div>

            <StepNav steps={steps} currentStep={currentStep} completedSteps={completedSteps} />
          </div>
        </div>

        {/* Form Content */}
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatePresence mode="wait" custom={direction}>
            <FormStep key={currentStep} isActive={true} direction={direction}>
              {renderStepContent()}
            </FormStep>
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8 pt-8 border-t border-[#E2E8F0]">
            <CustomButton variant="ghost" onClick={handleBack} disabled={currentStep === 0} leftIcon={ChevronLeft}>
              Back
            </CustomButton>

            {currentStep < steps.length - 1 ? (
              <CustomButton variant="primary" onClick={handleNext} rightIcon={ChevronRight}>
                Next
              </CustomButton>
            ) : (
              <CustomButton variant="primary" onClick={handlePublish} isLoading={isPublishing} rightIcon={Check}>
                Publish Now
              </CustomButton>
            )}
          </div>
        </div>
      </div>

      {/* Schedule Modal */}
      <Modal isOpen={showScheduleModal} onClose={() => setShowScheduleModal(false)} title="Schedule Publish" size="sm">
        <div className="space-y-4">
          <p className="text-[#64748B]">Select a date and time to automatically publish your event.</p>
          <input
            type="datetime-local"
            value={scheduledDate}
            onChange={(e) => setScheduledDate(e.target.value)}
            className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E4DB7]"
          />
          <div className="flex gap-3">
            <CustomButton variant="outline" fullWidth onClick={() => setShowScheduleModal(false)}>Cancel</CustomButton>
            <CustomButton variant="primary" fullWidth onClick={handleSchedulePublish} isLoading={isPublishing}>Schedule</CustomButton>
          </div>
        </div>
      </Modal>
    </PageWrapper>
  );
};

export default CreateEventPage;
