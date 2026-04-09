import { api } from "./apiClient";
import { enrichCategory, sortCategoriesLikeCatalog } from "../data/categories";

// Telemetry utility for capturing swallowed errors
export const logError = (context, error) => {
  console.error(`[Telemetry Error] ${context}:`, error);
  if (window.Sentry) {
    window.Sentry.captureException(error, { tags: { context } });
  }
};

// ── Helpers ─────────────────────────────────────────────────────────────────

/** Format raw backend time (e.g. "19:28:33.370496") → "7:28 PM" */
const formatTimeString = (raw) => {
  if (!raw || typeof raw !== 'string' || !raw.includes(':')) return raw || '';
  const [hStr, mStr] = raw.split(':');
  const h = parseInt(hStr, 10);
  const m = mStr ? mStr.padStart(2, '0').slice(0, 2) : '00';
  if (Number.isNaN(h)) return raw;
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 || 12;
  return `${h12}:${m} ${period}`;
};

// ── Mappers ────────────────────────────────────────────────────────────────

// Unified mapper for list item arrays and dashboard "normalizeEvent" usages.
export const mapEvent = (e) => {
  const isFree = e.is_free ?? e.isFree ?? false;
  const price = e.lowest_ticket_price ?? e.price ?? 0;

  const rawStartDate = e.start_date || e.date;

  // Format date helper
  let formattedDate = 'Date not set';
  if (rawStartDate) {
    const d = new Date(rawStartDate);
    if (!Number.isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
  }

  let timeState = e.time_state || null;
  const workflowStatus = e.status || (e.is_published ? 'published' : 'draft');
  let resolvedStatus = workflowStatus;
  if (!timeState && resolvedStatus !== 'draft' && resolvedStatus !== 'completed' && resolvedStatus !== 'cancelled') {
    const eventDate = new Date(rawStartDate || '');
    if (!Number.isNaN(eventDate.getTime())) {
      const today = new Date();
      if (eventDate < today && eventDate.toDateString() !== today.toDateString()) {
        timeState = 'past';
      } else if (eventDate.toDateString() === today.toDateString()) {
        timeState = 'today';
      }
    }
  }
  if (!timeState && resolvedStatus === 'published') timeState = 'upcoming';

  if (resolvedStatus === 'published' && timeState === 'past') {
    resolvedStatus = 'completed';
  } else if (resolvedStatus === 'published' && (timeState === 'today' || timeState === 'live')) {
    resolvedStatus = 'live';
  } else if (resolvedStatus === 'published') {
    resolvedStatus = 'upcoming';
  }

  const isToday = e.is_today ?? (timeState === 'today' || timeState === 'live');
  const isPast = e.is_past ?? (timeState === 'past' || resolvedStatus === 'completed');

  const categoryName = (e.category && typeof e.category === "object" ? e.category.name : null) || e.category_name || (typeof e.category === "string" ? e.category : null) || "General";
  const mapLocation = e.venue_name || (e.city ? `${e.city}${e.country ? ', ' + e.country : ''}` : e.country || e.location || 'Location TBA');


  const base = {
    id: e.id,
    slug: e.slug,
    title: e.title || e.name,
    name: e.title || e.name, // Support dashboard requirement
    category: categoryName,
    categoryName: categoryName,
    date: rawStartDate, // Keep original standard, add formattedDate for dashboard
    formattedDate: formattedDate,
    rawStartDate: rawStartDate,
    status: resolvedStatus,
    workflowStatus,
    timeState: timeState || 'upcoming',
    isToday,
    isPast,
    time: formatTimeString(e.start_time),
    endDate: e.end_date,
    endTime: formatTimeString(e.end_time),
    location: mapLocation,
    venueName: e.venue_name || '',
    themeColor: e.theme_color || "#02338D",
    accentColor: e.accent_color || "#7C3AED",
    attendeeCount: e.attendee_count || e.ticketsSold || 0,
    ticketsSold: e.attendee_count || e.ticketsSold || 0,
    revenue: e.total_revenue || e.revenue || 0,
    capacity: e.capacity || null,
    isFeatured: e.is_featured || false,
    displayPriority: e.display_priority || 0,
    stickers: e.stickers || [],
    format: e.format || "in_person",
    coverImage: e.cover_image || e.coverImage || null,
    tags: Array.isArray(e.tags) ? e.tags.map(t => t?.name || t || '').filter(Boolean) : [],
    description: e.description || '',
    organizer: {
      id: e.organizer?.id,
      name:
        e.organizer?.organization_name ||
        ((e.organizer?.first_name || "") + (e.organizer?.last_name ? " " + e.organizer.last_name : "")) ||
        "Organizer",
      avatar: e.organizer?.avatar || null,
      brandColor: e.organizer?.brand_color || "#02338D",
      totalEvents: e.organizer?.total_events || 0,
      totalAttendees: e.organizer?.total_attendees || 0,
      bio: "",
    },
  };

  return {
    ...base,
    isFree,
    // Read from backend — backend property is_almost_sold_out returns true when <10% remain
    isAlmostSoldOut: e.is_almost_sold_out ?? false,
    // Use currency from API; fall back to KES for backward compat with older API versions
    currency: e.currency || "KES",
    price: Number(price || 0),
  };
};
// Map backend detail response to the richer event object used on detail/checkout
export const mapDetailEvent = (e) => {
  const listMapped = mapEvent(e);

  const location =
    e.venue_name && e.city
      ? `${e.venue_name}, ${e.city}`
      : e.venue_name || e.city || listMapped.location;

  const speakers = Array.isArray(e.speakers)
    ? e.speakers.map(s => ({
      ...s,
      avatar: s.avatar_url || s.avatar
    }))
    : undefined;
  const schedule = Array.isArray(e.schedule)
    ? e.schedule.map(item => ({
      ...item,
      // Normalise: backend returns start_time/speaker_name; component expects time/speaker
      time: item.start_time
        ? item.end_time
          ? `${item.start_time} – ${item.end_time}`
          : item.start_time
        : item.time || '',
      speaker: item.speaker_name || item.speaker || '',
    }))
    : undefined;
  const sponsors = Array.isArray(e.sponsors)
    ? e.sponsors.map(s => ({
      ...s,
      logo: s.logo_url || s.logo,
    }))
    : undefined;

  return {
    ...listMapped,
    rawCategory: e.category?.id || e.category || "",
    description: e.description || "",
    startDate: e.start_date || "",
    startTime: formatTimeString(e.start_time),
    endDate: e.end_date || "",
    endTime: formatTimeString(e.end_time),
    timezone: e.timezone || "",
    venueName: e.venue_name || "",
    address: e.venue_address || "",
    city: e.city || "",
    country: e.country || "",
    streamingLink: e.streaming_link || "",
    customRefundPolicy: e.custom_refund_policy || "",
    refundPolicy: e.refund_policy || "",
    capacity: e.capacity || null,
    format: e.format || "",
    bannerImage: e.gallery_images && e.gallery_images.length > 0 ? e.gallery_images[0] : (e.cover_image || null),
    location,
    tags: Array.isArray(e.tags)
      ? e.tags.map((t) => (t && typeof t === "object" ? t.name : t || ""))
      : [],
    currency:
      (e.tickets && e.tickets[0] && e.tickets[0].currency) || listMapped.currency,
    tickets:
      e.tickets?.map((t) => ({
        id: t.id,
        type: t.name || t.type,
        price: Number(t.price || 0),
        quantity: t.quantity || 100,
        description: t.description || "",
        remaining: t.remaining ?? t.quantity_available ?? 0,
        currency: t.currency,
        ticket_class: t.ticket_class,
        isSoldOut: t.is_sold_out || false,
        isAlmostSoldOut: t.is_almost_sold_out || false,
        registration_category: t.registration_category || null,
        registration_category_type: t.registration_category_type || null,
        registration_category_label: t.registration_category_label || null,
      })) || [],
    promoCodes: e.promo_codes || [],
    enableWaitlist: e.enable_waitlist ?? false,
    sendReminders: e.send_reminders ?? true,
    approvalRequestedAt: e.approval_requested_at || null,
    reviewedAt: e.reviewed_at || null,
    reviewedByName: e.reviewed_by_name || null,
    reviewNotes: e.review_notes || '',
    speakers,
    mc: e.mc ? {
      ...e.mc,
      avatar: e.mc.avatar_url || e.mc.avatar
    } : null,
    schedule,
    sponsors,
    speakersCount: e.speakers_count ?? e.speakersCount ?? null,
    scheduleCount: e.schedule_count ?? e.scheduleCount ?? null,
    sponsorsCount: e.sponsors_count ?? e.sponsorsCount ?? null,
    organizer: {
      id: e.organizer?.id,
      name:
        e.organizer?.organization_name ||
        ((e.organizer?.first_name || "") + (e.organizer?.last_name ? " " + e.organizer.last_name : "")) ||
        "Unknown Organizer",
      avatar: e.organizer?.avatar || null,
      brandColor: e.organizer?.brand_color || "#02338D",
      totalEvents: e.organizer?.total_events || 0,
      totalAttendees: e.organizer?.total_attendees || 0,
      bio: e.organizer?.organization_name || e.organizer?.bio || "",
    },
    registrationCategories: Array.isArray(e.registration_categories)
      ? e.registration_categories
      : Array.isArray(e.registrationCategories)
        ? e.registrationCategories
        : [],
  };
};

const mapReviewEvent = (e) => ({
  ...mapEvent(e),
  approvalRequestedAt: e.approval_requested_at || null,
  reviewedAt: e.reviewed_at || null,
  reviewNotes: e.review_notes || '',
  organizerEmail: e.organizer?.email || '',
});

// ── Fetch Events ──────────────────────────────────────────────────────────
export const buildEventDetailPlaceholderFromList = (event) => {
  if (!event) return undefined;
  return {
    ...event,
    rawCategory: '',
    startDate: event.date || '',
    startTime: event.time || '',
    endDate: '',
    endTime: '',
    timezone: '',
    venueName: '',
    address: '',
    city: '',
    country: '',
    streamingLink: '',
    customRefundPolicy: '',
    refundPolicy: '',
    capacity: null,
    bannerImage: event.coverImage || null,
    tags: Array.isArray(event.tags) ? event.tags : [],
    tickets: [],
    promoCodes: [],
    enableWaitlist: false,
    sendReminders: true,
    speakers: [],
    mc: null,
    schedule: [],
    sponsors: [],
    speakersCount: null,
    scheduleCount: null,
    sponsorsCount: null,
  };
};

export const fetchEvents = async (params = {}) => {
  // Build query
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  const rawData = await api.get(`/api/events/${query ? "?" + query : ""}`);

  if (rawData && typeof rawData === 'object' && !Array.isArray(rawData) && 'results' in rawData) {
    return {
      results: rawData.results ? rawData.results.map(mapEvent) : [],
      count: rawData.count || 0,
      next: rawData.next || null,
      previous: rawData.previous || null,
    };
  }

  const events = Array.isArray(rawData) ? rawData.map(mapEvent) : [];
  return {
    results: events,
    count: events.length,
    next: null,
    previous: null,
  };
};

// ── Fetch Single Event Detail ─────────────────────────────────────────────
export const fetchEvent = async (slug) => {
  const data = await api.get(`/api/events/${slug}/`);
  return mapDetailEvent(data);
};

export const fetchEventLite = async (slug) => {
  const data = await api.get(`/api/events/${slug}/?exclude=speakers,schedule,sponsors`);
  return mapDetailEvent(data);
};

// ── Related Events ─────────────────────────────────────────────────────────
export const fetchRelatedEvents = async (slug) => {
  try {
    const data = await api.get(`/api/events/${slug}/related/`);
    return data.map(mapEvent);
  } catch (err) {
    logError('fetchRelatedEvents', err);
    return [];
  }
};

export const fetchOrganizerEvents = async (organizerId) => {
  try {
    const data = await api.get(`/api/events/organizers/${organizerId}/`);
    return data.map(mapEvent);
  } catch (err) {
    logError('fetchOrganizerEvents', err);
    return [];
  }
};

export const searchEventsApi = async ({ q, location, date }) => {
  const params = {};
  if (q) params.search = q;
  if (location) params.city = location;
  if (date) params.start_date__gte = date;
  const events = await fetchEvents(params);
  return events;
};

export const fetchCategories = async () => {
  const data = await api.get("/api/events/categories/");
  const categories = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
  return sortCategoriesLikeCatalog(categories.map((category) => enrichCategory(category)));
};

// ── Analytics ───────────────────────────────────────────────────────────────
export const trackEventView = (slug) => {
  api.post(`/api/events/${slug}/analytics/view/`, {}).catch((err) => logError('trackEventView', err));
};

// ── Event sub-resources ────────────────────────────────────────────────────
export const fetchEventSpeakers = async (slug) => {
  const data = await api.get(`/api/events/${slug}/speakers/`);
  return Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
};

export const fetchEventSchedule = async (slug) => {
  const data = await api.get(`/api/events/${slug}/schedule/`);
  return Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
};

export const fetchEventSponsors = async (slug) => {
  const data = await api.get(`/api/events/${slug}/sponsors/`);
  return Array.isArray(data) ? data : (Array.isArray(data?.results) ? data.results : []);
};

const REVIEW_QUEUE_ENDPOINTS = [
  '/api/events/reviews/',
  '/api/events/review-queue/',
  '/api/events/review/',
];
let preferredReviewQueueEndpoint = null;
let reviewQueueEndpointMissing = false;

export const fetchPendingEventReviews = async (status = 'pending') => {
  if (reviewQueueEndpointMissing) return [];

  const endpointsToTry = preferredReviewQueueEndpoint
    ? [preferredReviewQueueEndpoint]
    : REVIEW_QUEUE_ENDPOINTS;
  const encodedStatus = encodeURIComponent(status);
  let lastNotFoundError = null;

  for (const endpoint of endpointsToTry) {
    try {
      const data = await api.get(`${endpoint}?status=${encodedStatus}`);
      preferredReviewQueueEndpoint = endpoint;
      const items = Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
      return items.map(mapReviewEvent);
    } catch (err) {
      if (err?.status !== 404) {
        throw err;
      }
      lastNotFoundError = err;
      if (preferredReviewQueueEndpoint) {
        preferredReviewQueueEndpoint = null;
      }
    }
  }

  if (lastNotFoundError) {
    reviewQueueEndpointMissing = true;
  }
  return [];
};

export const approveEventReview = async (slug) => {
  const data = await api.patch(`/api/events/reviews/${slug}/approve/`, {});
  return mapDetailEvent(data);
};

export const rejectEventReview = async (slug, reason) => {
  const data = await api.patch(`/api/events/reviews/${slug}/reject/`, { reason });
  return mapDetailEvent(data);
};

// ── Notifications ───────────────────────────────────────────────────────────
export const fetchNotifications = async (unreadOnly = false) => {
  const query = unreadOnly ? "?unread_only=true" : "";
  return api.get(`/api/notifications/${query}`);
};

export const fetchUnreadCount = async () => {
  const data = await api.get("/api/notifications/unread-count/");
  return data.count ?? 0;
};

export const markNotificationRead = async (id) => {
  return api.post(`/api/notifications/${id}/read/`, {});
};

export const markAllNotificationsRead = async () => {
  return api.post("/api/notifications/read-all/", {});
};

// ── Route Preloading ───────────────────────────────────────────────────────
// Preloads the JS bundles for EventsPage and EventDetailPage so navigation
// is instant. Called once after the HomePage first renders.
let hasPreloadedRoutes = false;
export const preloadRoutes = () => {
  if (hasPreloadedRoutes) return;
  hasPreloadedRoutes = true;

  // Use requestIdleCallback or setTimeout to avoid blocking main thread
  const preload = () => {
    // Preload EventsPage chunk
    import('../pages/EventsPage');
    // Preload EventDetailPage chunk
    import('../pages/EventDetailPage');
    // Preload CheckoutPage chunk
    import('../pages/CheckoutPage');
  };

  if ('requestIdleCallback' in window) {
    requestIdleCallback(preload, { timeout: 3000 });
  } else {
    setTimeout(preload, 1000);
  }
};

