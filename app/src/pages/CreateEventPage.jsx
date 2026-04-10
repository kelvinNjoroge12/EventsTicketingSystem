import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, Check, AlertCircle, Calendar, MapPin, Clock, Users, Zap, Building2, Mic2 } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import PageWrapper from '../components/layout/PageWrapper';
import StepNav from '../components/organizer/StepNav';
import OrganizerHeader from '../components/organizer/OrganizerHeader';
import FormStep from '../components/organizer/FormStep';
import CustomButton from '../components/ui/CustomButton';
import CustomAvatar from '../components/ui/CustomAvatar';
import Modal from '../components/ui/Modal';
import RichTextContent from '../components/ui/RichTextContent';
import { api } from '../lib/apiClient';
import { fetchCategories, fetchEditableEvent } from '../lib/eventsApi';
import eventQueryKeys from '../lib/eventQueryKeys';
import {
  createDefaultRegistrationCategories,
  mapRefundPolicy,
  mapApiPromoToEditorPromo,
  mapApiTicketToEditorTicket,
  mergeRegistrationCategories,
  TICKET_CLASS_BY_TYPE,
  unmapRefundPolicy,
} from '../lib/eventSetup';
import { normalizeTimeInput } from '../lib/timeInput';
import {
  BasicInfoStep,
  DateLocationStep,
  DescriptionStep,
  SpeakersStep,
  ScheduleStep,
  SponsorsStep,
  TicketsStep
} from '../components/organizer/EventForm';

const normalizeEventPayload = (payload, routeSlug = '') => {
  const candidates = [payload, payload?.event, payload?.data, payload?.data?.event, payload?.event?.data]
    .filter((value) => value && typeof value === 'object');
  const bestMatch = candidates.find((value) => value.slug || value.id) || candidates[0] || {};
  if (!bestMatch.slug && routeSlug) {
    return { ...bestMatch, slug: routeSlug };
  }
  return { ...bestMatch };
};

const getEventIdentifiers = (eventPayload, routeSlug = '') => {
  const event = normalizeEventPayload(eventPayload, routeSlug);
  const rawIdentifiers = [event.slug, routeSlug, event.id];
  return [...new Set(rawIdentifiers.filter((value) => typeof value === 'string' && value.trim().length > 0))];
};

const CreateEventPage = ({
  embedded = false,
  onExit = null,
  onRequestScrollTop = null,
} = {}) => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const isSubmittingRef = useRef(false);
  const queryClient = useQueryClient();
  const [currentStep, setCurrentStep] = useState(0);
  const [direction, setDirection] = useState('forward');
  const [completedSteps, setCompletedSteps] = useState([]);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [showSubmissionModal, setShowSubmissionModal] = useState(false);
  const [submittedEventSlug, setSubmittedEventSlug] = useState('');
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
    promoCodes: [],
    mcId: null,
  });
  const pageTitle = slug ? 'Edit Event' : 'Create Event';

  const { data: categoriesData = [] } = useQuery({
    queryKey: eventQueryKeys.categories(),
    queryFn: fetchCategories,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    setCategories(Array.isArray(categoriesData) ? categoriesData : []);
  }, [categoriesData]);

  // Fetch event if editing
  useEffect(() => {
    let mounted = true;
    if (!slug) {
      setIsLoading(false);
      return () => { mounted = false; };
    }
    (async () => {
      try {
        const eventData = await fetchEditableEvent(slug);
        if (!mounted) return;

        if (eventData) {
          let registrationCategories = createDefaultRegistrationCategories();
          try {
            const regData = await api.get(`/api/events/${eventData.slug || slug}/registration/setup/`);
            if (Array.isArray(regData?.categories) && regData.categories.length > 0) {
              registrationCategories = mergeRegistrationCategories(regData.categories);
            }
          } catch {
            registrationCategories = createDefaultRegistrationCategories();
          }

          // Map fetched event data to form data
          setFormData({
            title: eventData.title || '',
            category: eventData.rawCategory || '',
            tags: eventData.tags || [],
            eventType: 'public',
            format: eventData.format === 'in_person' ? 'In-Person' : eventData.format === 'online' ? 'Online' : 'Hybrid',
            themeColor: eventData.themeColor || '#02338D',
            accentColor: eventData.accentColor || '#7C3AED',
            startDate: eventData.startDate || '',
            startTime: normalizeTimeInput(eventData.startTime || eventData.start_time) || '',
            endDate: eventData.endDate || '',
            endTime: normalizeTimeInput(eventData.endTime || eventData.end_time) || '',
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
                startTime: normalizeTimeInput(item.start_time || item.time || '') || '',
                endTime: normalizeTimeInput(item.end_time || '') || '',
                location: item.location || '',
                speaker: item.speaker || '',
                description: item.description || ''
              })),
            sponsors: (eventData.sponsors || []).map(s => ({
              id: s.id,
              name: s.name || '',
              website: s.website || '',
              logo: null,
              logoPreview: s.logo || ''
            })),
            tickets: eventData.tickets.length > 0
              ? eventData.tickets.map((ticket) => mapApiTicketToEditorTicket(ticket))
              : [{ type: 'Standard', price: 0, quantity: 100, description: '', category: 'guest' }],
            promoCodes: (eventData.promoCodes || []).map((promo) => mapApiPromoToEditorPromo(promo)),
            registrationCategories,
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
            promoCodes: (eventData.promoCodes || []).map((promo) => promo.id).filter(Boolean),
            mcId: eventData.mc?.id || null,
          });
        }
      } catch (err) {
        console.error('Failed to load data', err);
      } finally {
        if (mounted) setIsLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, [slug]);

  const [formData, setFormData] = useState({
    title: '',
    category: '',
    tags: [],
    eventType: 'public',
    format: 'In-Person',
    themeColor: '#02338D',
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
    tickets: [{ type: 'Standard', price: 0, quantity: 100, description: '', category: 'guest' }],
    promoCodes: [],
    registrationCategories: createDefaultRegistrationCategories(),
    refundPolicy: 'No Refund',
    customRefundPolicy: '',
    enableWaitlist: false,
    sendReminders: true,
  });

  const [errors, setErrors] = useState({});

  const scrollToTop = useCallback(() => {
    if (typeof onRequestScrollTop === 'function') {
      onRequestScrollTop();
      return;
    }

    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 0, behavior: 'auto' });
    }

    if (typeof document !== 'undefined') {
      document.documentElement.scrollTop = 0;
      document.body.scrollTop = 0;
    }
  }, [onRequestScrollTop]);

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

  useEffect(() => {
    scrollToTop();
  }, [currentStep, scrollToTop]);

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
      const enabledCategories = (formData.registrationCategories || []).filter((cat) => cat.is_active);
      enabledCategories.forEach((cat) => {
        const hasTicket = formData.tickets.some((t) => t.category === cat.category);
        if (!hasTicket) {
          newErrors.tickets = `Add at least one ${cat.label || cat.category} ticket`;
        }
      });
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

  const handleHeaderBack = () => {
    if (typeof onExit === 'function') {
      onExit();
      return;
    }
    navigate(-1);
  };

  const mapFormat = (fmt) => ({ 'In-Person': 'in_person', 'Online': 'online', 'Hybrid': 'hybrid' }[fmt] || 'in_person');

  const ensureUrl = (url) => {
    if (!url) return '';
    if (url.startsWith('http://') || url.startsWith('https://')) return url;
    return `https://${url}`;
  };

  const humanizeValidationMessage = (field, rawMessage) => {
    const message = String(rawMessage || '').trim();
    if (!message) return '';

    if (/wrong format/i.test(message) || /hh:mm/i.test(message)) {
      if (field === 'end_time') return 'Please use a valid end time.';
      if (field === 'start_time') return 'Please use a valid start time.';
      return 'Please use a valid time.';
    }

    if (/required/i.test(message)) {
      if (field === 'start_time') return 'Please add a start time.';
      if (field === 'end_time') return 'Please add an end time.';
      if (field === 'start_date') return 'Please add a start date.';
      if (field === 'end_date') return 'Please add an end date.';
    }

    return message;
  };

  const getFirstApiErrorMessage = (value) => {
    if (Array.isArray(value)) return getFirstApiErrorMessage(value[0]);
    if (value && typeof value === 'object') {
      const nestedValue = Object.values(value)[0];
      return getFirstApiErrorMessage(nestedValue);
    }
    return String(value || '').trim();
  };

  const applyServerValidationErrors = (response) => {
    if (!response || typeof response !== 'object' || Array.isArray(response)) {
      return {};
    }

    const fieldMap = {
      title: 'title',
      category: 'category',
      start_date: 'startDate',
      start_time: 'startTime',
      end_date: 'endDate',
      end_time: 'endTime',
      venue_name: 'venueName',
      venue_address: 'address',
      city: 'city',
      country: 'country',
      streaming_link: 'streamingLink',
    };

    const nextErrors = {};
    Object.entries(fieldMap).forEach(([apiField, formField]) => {
      if (!(apiField in response)) return;
      const rawMessage = getFirstApiErrorMessage(response[apiField]);
      const humanizedMessage = humanizeValidationMessage(apiField, rawMessage);
      if (humanizedMessage) {
        nextErrors[formField] = humanizedMessage;
      }
    });

    if (Object.keys(nextErrors).length > 0) {
      setErrors((prev) => ({ ...prev, ...nextErrors }));
    }

    return nextErrors;
  };

  const buildPayload = (status = 'pending') => {
    const data = {
      title: formData.title,
      description: formData.description,
      category: formData.category,
      event_type: formData.eventType,
      format: mapFormat(formData.format),
      start_date: formData.startDate,
      start_time: normalizeTimeInput(formData.startTime),
      end_date: formData.endDate,
      end_time: normalizeTimeInput(formData.endTime),
      timezone: formData.timezone === 'EAT' ? 'Africa/Nairobi' : formData.timezone,
      venue_name: formData.venueName || '',
      venue_address: formData.address || '',
      city: formData.city || '',
      country: formData.country || 'Kenya',
      streaming_link: ensureUrl(formData.streamingLink),
      refund_policy: mapRefundPolicy(formData.refundPolicy),
      theme_color: formData.themeColor || '#02338D',
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

    event = normalizeEventPayload(event, slug);
    const eventSlug = event.slug || slug || event.id;
    if (!eventSlug) {
      throw new Error('Event saved, but no event identifier was returned. Please refresh and try again.');
    }

    const tasks = [];
    const normalizeSpeakerKey = (value) => String(value || '').trim().toLowerCase();
    const looksLikeUuid = (value) => /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(String(value || '').trim());
    const speakerIdByName = new Map();

    // Registration categories + questions
    let registrationMap = new Map();
    if (Array.isArray(formData.registrationCategories) && formData.registrationCategories.length > 0) {
      const categoriesPayload = formData.registrationCategories.map((cat, idx) => {
        const isStudent = cat.category === 'student';
        const isAlumni = cat.category === 'alumni';
        const label = isStudent ? 'Student' : isAlumni ? 'Alumni' : cat.label;

        return {
          id: cat.id,
          category: cat.category,
          label,
          is_active: Boolean(cat.is_active),
          sort_order: idx,
          require_student_email: isStudent ? true : Boolean(cat.require_student_email),
          require_admission_number: isStudent ? true : Boolean(cat.require_admission_number),
          ask_graduation_year: Boolean(cat.ask_graduation_year),
          ask_course: Boolean(cat.ask_course),
          ask_school: Boolean(cat.ask_school),
          ask_location: Boolean(cat.ask_location),
          questions: (cat.questions || [])
            .filter((q) => String(q.label || '').trim())
            .map((q, qIdx) => ({
              id: q.id,
              label: q.label,
              field_type: q.field_type,
              is_required: Boolean(q.is_required),
              options: Array.isArray(q.options) ? q.options : [],
              sort_order: qIdx,
            })),
        };
      });
      try {
        const regResp = await api.post(`/api/events/${eventSlug}/registration/setup/`, { categories: categoriesPayload });
        const saved = regResp?.categories || [];
        registrationMap = new Map(saved.map((c) => [c.category, c]));
      } catch (err) {
        console.warn('Registration setup failed:', err);
      }
    }

    // Tickets (create or update)
    if (formData.tickets.length > 0) {
      formData.tickets.forEach((ticket) => {
        const categoryType = ticket.category || 'guest';
        const categoryEntry = registrationMap.get(categoryType);
        const registrationCategoryId = categoryEntry?.id || ticket.registrationCategoryId || null;
        const payloadData = {
          name: ticket.type,
          ticket_class: TICKET_CLASS_BY_TYPE[ticket.type] || 'paid',
          price: ticket.type === 'Free' ? 0 : ticket.price,
          quantity: ticket.quantity,
          description: ticket.description || '',
          registration_category: registrationCategoryId,
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

    // Helper function for MC and Sponsors to dry up repetitive logic!
    const syncResource = (resource, endpoint, idKey, stringFields, fileFieldObj) => {
      const getPayloadData = () => {
        const data = {};
        Object.entries(stringFields).forEach(([k, v]) => { data[k] = v; });
        return data;
      };

      const { fileKey, fileVal } = fileFieldObj || {};
      const hasFile = !!fileVal;
      const resourceId = resource[idKey];

      if (resourceId) {
        if (hasFile) {
          const fd = new FormData();
          Object.entries(stringFields).forEach(([k, v]) => fd.append(k, v));
          fd.append(fileKey, fileVal);
          tasks.push(api.patchForm(`/api/events/${eventSlug}/${endpoint}/${resourceId}/`, fd).catch(err => console.warn(`${endpoint} update failed:`, err)));
        } else {
          tasks.push(api.patch(`/api/events/${eventSlug}/${endpoint}/${resourceId}/`, getPayloadData()).catch(err => console.warn(`${endpoint} update failed:`, err)));
        }
      } else {
        const fd = new FormData();
        Object.entries(stringFields).forEach(([k, v]) => fd.append(k, v));
        if (hasFile) fd.append(fileKey, fileVal);
        tasks.push(api.postForm(`/api/events/${eventSlug}/${endpoint}/`, fd).catch(err => console.warn(`${endpoint} create failed:`, err)));
      }
    };

    // Speakers
    if (formData.speakers.length > 0) {
      for (const [idx, speaker] of formData.speakers.entries()) {
        if (!speaker.name) continue;
        const payloadData = {
          name: speaker.name,
          title: speaker.title || '',
          organization: speaker.organization || '',
          bio: speaker.bio || '',
          is_mc: 'false',
          sort_order: String(idx),
        };

        try {
          let savedSpeaker;
          if (speaker.id) {
            if (speaker.photo) {
              const fd = new FormData();
              Object.entries(payloadData).forEach(([key, value]) => fd.append(key, value));
              fd.append('avatar', speaker.photo);
              savedSpeaker = await api.patchForm(`/api/events/${eventSlug}/speakers/${speaker.id}/`, fd);
            } else {
              savedSpeaker = await api.patch(`/api/events/${eventSlug}/speakers/${speaker.id}/`, payloadData);
            }
          } else {
            const fd = new FormData();
            Object.entries(payloadData).forEach(([key, value]) => fd.append(key, value));
            if (speaker.photo) fd.append('avatar', speaker.photo);
            savedSpeaker = await api.postForm(`/api/events/${eventSlug}/speakers/`, fd);
          }

          const normalizedName = normalizeSpeakerKey(savedSpeaker?.name || speaker.name);
          const savedSpeakerId = savedSpeaker?.id || speaker.id;
          if (normalizedName && savedSpeakerId) {
            speakerIdByName.set(normalizedName, savedSpeakerId);
          }
        } catch (err) {
          console.warn('Speakers sync failed:', err);
        }
      }
    }

    // MC
    if (formData.hasMC && formData.mcName) {
      try {
        const payloadData = { name: formData.mcName, bio: formData.mcBio || '', is_mc: 'true', sort_order: '0' };
        let savedMc;
        if (initialSubresources.mcId) {
          if (formData.mcPhoto) {
            const fd = new FormData();
            Object.entries(payloadData).forEach(([key, value]) => fd.append(key, value));
            fd.append('avatar', formData.mcPhoto);
            savedMc = await api.patchForm(`/api/events/${eventSlug}/speakers/${initialSubresources.mcId}/`, fd);
          } else {
            savedMc = await api.patch(`/api/events/${eventSlug}/speakers/${initialSubresources.mcId}/`, payloadData);
          }
        } else {
          const fd = new FormData();
          Object.entries(payloadData).forEach(([key, value]) => fd.append(key, value));
          if (formData.mcPhoto) fd.append('avatar', formData.mcPhoto);
          savedMc = await api.postForm(`/api/events/${eventSlug}/speakers/`, fd);
        }
        const normalizedName = normalizeSpeakerKey(savedMc?.name || formData.mcName);
        const savedMcId = savedMc?.id || initialSubresources.mcId;
        if (normalizedName && savedMcId) {
          speakerIdByName.set(normalizedName, savedMcId);
        }
      } catch (err) {
        console.warn('MC sync failed:', err);
      }
    }

    // Schedule items
    if (formData.schedule.length > 0) {
      formData.schedule.forEach((item, idx) => {
        if (!item.title) return;
        const normalizedSpeaker = normalizeSpeakerKey(item.speaker);
        const resolvedSpeakerId = looksLikeUuid(item.speaker)
          ? item.speaker
          : speakerIdByName.get(normalizedSpeaker) || null;
        const payloadData = {
          title: item.title,
          description: item.description || '',
          ...(resolvedSpeakerId ? { speaker: resolvedSpeakerId } : {}),
          start_time: normalizeTimeInput(item.startTime || item.time) || '00:00',
          end_time: normalizeTimeInput(item.endTime) || null,
          location: item.location || '',
          sort_order: idx,
        };
        if (item.id) {
          tasks.push(api.patch(`/api/events/${eventSlug}/schedule/${item.id}/`, payloadData).catch(err => console.warn('Schedule update failed:', err)));
        } else {
          tasks.push(api.post(`/api/events/${eventSlug}/schedule/`, payloadData).catch(err => console.warn('Schedule creation failed:', err)));
        }
      });
    }

    // Promo codes
    if (Array.isArray(formData.promoCodes) && formData.promoCodes.length > 0) {
      formData.promoCodes.forEach((promo) => {
        if (!promo.code || promo.discount_value === '' || promo.usage_limit === '' || !promo.expiry) return;
        const payloadData = {
          code: promo.code.toUpperCase().replace(/\s+/g, ''),
          discount_type: promo.discount_type || 'percent',
          discount_value: Number(promo.discount_value || 0),
          usage_limit: Number(promo.usage_limit || 0),
          expiry: new Date(promo.expiry).toISOString(),
          is_active: promo.is_active ?? true,
          minimum_order_amount: Number(promo.minimum_order_amount || 0),
          applicable_ticket_types: [],
        };

        if (promo.id) {
          tasks.push(api.patch(`/api/events/${eventSlug}/promo-codes/${promo.id}/`, payloadData).catch(err => console.warn('Promo code update failed:', err)));
        } else {
          tasks.push(api.post(`/api/events/${eventSlug}/promo-codes/`, payloadData).catch(err => console.warn('Promo code creation failed:', err)));
        }
      });
    }

    if (slug && Array.isArray(initialSubresources.promoCodes) && initialSubresources.promoCodes.length > 0) {
      const currentPromoIds = new Set((formData.promoCodes || []).map((promo) => promo.id).filter(Boolean));
      initialSubresources.promoCodes
        .filter((promoId) => !currentPromoIds.has(promoId))
        .forEach((promoId) => {
          tasks.push(api.delete(`/api/events/${eventSlug}/promo-codes/${promoId}/`).catch(err => console.warn('Promo code deletion failed:', err)));
        });
    }

    // Sponsors
    if (formData.sponsors.length > 0) {
      formData.sponsors.forEach((sponsor, idx) => {
        if (!sponsor.name) return;
        syncResource(
          sponsor, 'sponsors', 'id',
          { name: sponsor.name, website: ensureUrl(sponsor.website), sort_order: String(idx) },
          { fileKey: 'logo', fileVal: sponsor.logo }
        );
      });
    }

    if (tasks.length > 0) {
      await Promise.allSettled(tasks);
    }

    return event;
  };

  const submitEventForReview = async (eventPayload) => {
    const identifiers = getEventIdentifiers(eventPayload, slug);
    if (identifiers.length === 0) {
      throw new Error('Unable to submit for review because the event identifier is missing.');
    }

    let notFoundError = null;
    for (const identifier of identifiers) {
      try {
        return await api.patch(`/api/events/${identifier}/publish/`, {});
      } catch (err) {
        if (err?.status !== 404) {
          throw err;
        }
        notFoundError = err;
      }
    }

    throw notFoundError || new Error('Unable to submit this event for review right now.');
  };

  const getErrorMessage = (err) => {
    const response = err?.response;
    const validationErrors = applyServerValidationErrors(response);
    if (validationErrors.startTime) return validationErrors.startTime;
    if (validationErrors.endTime) return validationErrors.endTime;
    if (validationErrors.startDate) return validationErrors.startDate;
    if (validationErrors.endDate) return validationErrors.endDate;

    if (response && typeof response === 'object' && !Array.isArray(response)) {
      const [firstField, firstValue] = Object.entries(response)[0] || [];
      const firstMessage = getFirstApiErrorMessage(firstValue);
      const humanizedFirstMessage = humanizeValidationMessage(firstField, firstMessage);
      if (humanizedFirstMessage) return humanizedFirstMessage;
    }

    return err?.response?.detail || err?.response?.message || err?.message || 'Something went wrong. Please try again.';
  };

  const handleSaveDraft = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsPublishing(true);
    setPublishError('');
    try {
      const payload = buildPayload('draft');
      const event = await createEventAndTickets(payload);
      if (event?.slug) {
        queryClient.invalidateQueries({ queryKey: ['organizer_events'] });
        navigate(`/events/${event.slug}`);
      } else {
        queryClient.invalidateQueries({ queryKey: ['organizer_events'] });
        navigate('/organizer-dashboard?tab=events');
      }
    } catch (err) {
      setPublishError(getErrorMessage(err));
    } finally {
      setIsPublishing(false);
      isSubmittingRef.current = false;
    }
  };

  const handlePublish = async () => {
    if (isSubmittingRef.current) return;
    isSubmittingRef.current = true;
    setIsPublishing(true);
    setPublishError('');
    try {
      const payload = buildPayload();
      const event = await createEventAndTickets(payload);
      try {
        const submittedEvent = await submitEventForReview(event);
        const submitted = normalizeEventPayload(submittedEvent, event?.slug || slug);
        setSubmittedEventSlug(submitted?.slug || event?.slug || slug || '');
        queryClient.invalidateQueries({ queryKey: ['organizer_events'] });
        setShowSubmissionModal(true);
      } catch (publishErr) {
        const alreadyPending = String(event?.status || '').toLowerCase() === 'pending';
        if (alreadyPending && publishErr?.status === 404) {
          setSubmittedEventSlug(event?.slug || slug || '');
          queryClient.invalidateQueries({ queryKey: ['organizer_events'] });
          setShowSubmissionModal(true);
          return;
        }
        setPublishError(`Your event was saved as a draft. ${getErrorMessage(publishErr)}`);
      }
    } catch (err) {
      setPublishError(getErrorMessage(err));
    } finally {
      setIsPublishing(false);
      isSubmittingRef.current = false;
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
      if (event?.slug) {
        navigate(`/events/${event.slug}`);
      } else {
        navigate('/organizer-dashboard?tab=events');
      }
    } catch (err) {
      setPublishError(getErrorMessage(err));
    } finally {
      setIsPublishing(false);
      isSubmittingRef.current = false;
    }
  };

  const renderStepContent = () => {
    if (isLoading) {
      return (
        <div className="flex flex-col items-center justify-center py-20">
          <motion.div
            className="w-12 h-12 border-4 border-[#02338D] border-t-transparent rounded-full mb-4"
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
              <p className="text-[#64748B]">This is how your event will appear to attendees once it is approved.</p>
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
                  <RichTextContent
                    value={formData.description}
                    className="text-[#475569]"
                    emptyFallback={<p className="text-[#64748B]">No description provided.</p>}
                  />
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
                              <p className="text-xs font-bold" style={{ color: formData.themeColor }}>
                                {[item.startTime, item.endTime].filter(Boolean).join(' - ')}
                              </p>
                              <p className="text-sm font-medium text-[#0F172A]">{item.title}</p>
                              {item.location && <p className="text-[11px] text-[#64748B]">{item.location}</p>}
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
                    <div className="p-2 rounded-lg bg-white shadow-sm border border-[#E2E8F0] text-[#02338D]">
                      <Calendar className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="text-[10px] text-[#64748B] uppercase font-bold tracking-tight">Date</p>
                      <p className="text-sm font-bold text-[#0F172A]">{formData.startDate || 'Not set'}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <div className="p-2 rounded-lg bg-white shadow-sm border border-[#E2E8F0] text-[#02338D]">
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
                        <div key={i} className="w-10 h-10 rounded-full bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center p-1 overflow-hidden">
                          {s.logoPreview ? (
                            <img src={s.logoPreview} alt={s.name} className="w-full h-full rounded-full object-contain" />
                          ) : (
                            <span className="text-[10px] font-bold text-[#02338D]">{s.name?.charAt(0)}</span>
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

  const pageContent = (
    <div className={embedded ? '' : 'pt-20'}>
      <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
        <div className="border-b border-[#E2E8F0]">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={handleHeaderBack}
                className="h-11 w-11 rounded-full border border-[#E2E8F0] bg-white text-[#02338D] shadow-sm hover:bg-[#F8FAFC] transition-colors flex items-center justify-center"
                aria-label="Go back"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <div>
                <p className="text-xs uppercase tracking-wider text-[#94A3B8]">Step {currentStep + 1} of {steps.length}</p>
                <p className="text-sm text-[#64748B]">Complete your event details</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: formData.themeColor }} />
                <div className="w-4 h-4 rounded-full border-2 border-white shadow" style={{ backgroundColor: formData.accentColor }} />
              </div>
            </div>

            <StepNav steps={steps} currentStep={currentStep} completedSteps={completedSteps} />
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <AnimatePresence mode="wait" custom={direction}>
            <FormStep key={currentStep} isActive={true} direction={direction}>
              {renderStepContent()}
            </FormStep>
          </AnimatePresence>

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
                Submit for Review
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
            className="w-full px-4 py-2 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#02338D]"
          />
          <div className="flex gap-3">
            <CustomButton variant="outline" fullWidth onClick={() => setShowScheduleModal(false)}>Cancel</CustomButton>
            <CustomButton variant="primary" fullWidth onClick={handleSchedulePublish} isLoading={isPublishing}>Schedule</CustomButton>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={showSubmissionModal}
        onClose={() => {
          setShowSubmissionModal(false);
          navigate(submittedEventSlug ? `/events/${submittedEventSlug}` : '/organizer-dashboard?tab=events');
        }}
        title="Event Submitted"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm leading-6 text-[#475569]">
            Your event has been submitted for publication and you will be notified once it is approved.
          </p>
          <p className="text-sm leading-6 text-[#475569]">
            We have also sent the same confirmation to your email.
          </p>
          <div className="flex gap-3">
            <CustomButton
              variant="outline"
              fullWidth
              onClick={() => {
                setShowSubmissionModal(false);
                navigate('/organizer-dashboard?tab=events');
              }}
            >
              Go To My Events
            </CustomButton>
            <CustomButton
              variant="primary"
              fullWidth
              onClick={() => {
                setShowSubmissionModal(false);
                navigate(submittedEventSlug ? `/events/${submittedEventSlug}` : '/organizer-dashboard?tab=events');
              }}
            >
              View Event
            </CustomButton>
          </div>
        </div>
      </Modal>
    </div>
  );

  if (embedded) {
    return pageContent;
  }

  return (
    <PageWrapper className="bg-[#F8FAFC]">
      <OrganizerHeader title={pageTitle} showMenu={false} useSidebarOffset={false} />
      {pageContent}
    </PageWrapper>
  );
};

export default CreateEventPage;

