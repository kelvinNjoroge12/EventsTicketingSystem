import { api } from "./apiClient";

// Map backend event list item to the shape used by EventCard, HomePage, EventsPage
const mapListEvent = (e) => {
  const base = {
    id: e.id,
    slug: e.slug,
    title: e.title,
    // Frontend expects category as string, not object
    category:
      (e.category && typeof e.category === "object" ? e.category.name : null) ||
      e.category_name ||
      (typeof e.category === "string" ? e.category : null) ||
      "General",
    date: e.start_date,
    time: e.start_time,
    location: e.city
      ? `${e.city}${e.country ? ", " + e.country : ""}`
      : e.country || "",
    themeColor: e.theme_color || "#1E4DB7",
    accentColor: e.accent_color || "#7C3AED",
    attendeeCount: e.attendee_count || 0,
    isFeatured: e.is_featured || false,
    stickers: e.stickers || [],
    format: e.format || "",
    coverImage: e.cover_image || null,
    // Guard: list endpoint does not return tags or description — prevent crashes in filter
    tags: [],
    description: "",
    organizer: {
      id: e.organizer?.id,
      name:
        e.organizer?.organization_name ||
        ((e.organizer?.first_name || "") + (e.organizer?.last_name ? " " + e.organizer.last_name : "")) ||
        "Organizer",
      avatar: e.organizer?.avatar || null,
      brandColor: e.organizer?.brand_color || "#1E4DB7",
      totalEvents: e.organizer?.total_events || 0,
      totalAttendees: e.organizer?.total_attendees || 0,
      bio: "",
    },
  };

  const isFree = e.is_free ?? false;
  const price = e.lowest_ticket_price ?? 0;
  return {
    ...base,
    isFree,
    isAlmostSoldOut: false, // refined from ticket types in detail view
    currency: "KES",
    price: Number(price || 0),
  };
};

// Map backend detail response to the richer event object used on detail/checkout
const mapDetailEvent = (e) => {
  const listMapped = mapListEvent(e);

  const location =
    e.venue_name && e.city
      ? `${e.venue_name}, ${e.city}`
      : e.venue_name || e.city || listMapped.location;

  return {
    ...listMapped,
    rawCategory: e.category?.id || e.category || "",
    description: e.description || "",
    startDate: e.start_date || "",
    startTime: e.start_time || "",
    endDate: e.end_date || "",
    endTime: e.end_time || "",
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
    // Tags: backend returns [{id, name, slug}] — map to string array
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
      })) || [],
    promoCodes: e.promo_codes || [],
    speakers: (e.speakers || []).map(s => ({
      ...s,
      avatar: s.avatar_url || s.avatar // handle case where backend might send either
    })),
    mc: e.mc ? {
      ...e.mc,
      avatar: e.mc.avatar_url || e.mc.avatar
    } : null,
    schedule: e.schedule || [],
    sponsors: (e.sponsors || []).map(s => ({
      ...s,
      logo: s.logo_url || s.logo,
      tier: s.tier ? s.tier.charAt(0).toUpperCase() + s.tier.slice(1) : 'Partner'
    })),
    // Override organizer with richer detail data
    organizer: {
      id: e.organizer?.id,
      name:
        e.organizer?.organization_name ||
        ((e.organizer?.first_name || "") + (e.organizer?.last_name ? " " + e.organizer.last_name : "")) ||
        "Unknown Organizer",
      avatar: e.organizer?.avatar || null,
      brandColor: e.organizer?.brand_color || "#1E4DB7",
      totalEvents: e.organizer?.total_events || 0,
      totalAttendees: e.organizer?.total_attendees || 0,
      bio: e.organizer?.organization_name || e.organizer?.bio || "",
    },
  };
};

export const fetchEvents = async (params = {}) => {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  const data = await api.get(`/api/events/${query ? "?" + query : ""}`);
  return Array.isArray(data?.results)
    ? data.results.map(mapListEvent)
    : data.map(mapListEvent);
};

export const fetchEvent = async (slug) => {
  const data = await api.get(`/api/events/${slug}/`);
  return mapDetailEvent(data);
};

export const fetchRelatedEvents = async (slug) => {
  const data = await api.get(`/api/events/${slug}/related/`);
  return data.map(mapListEvent);
};

export const fetchOrganizerEvents = async (organizerId) => {
  const data = await api.get(`/api/events/organizers/${organizerId}/`);
  return data.map(mapListEvent);
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
  return Array.isArray(data?.results) ? data.results : (Array.isArray(data) ? data : []);
};

// ── Analytics ───────────────────────────────────────────────────────────────
/** Fire a page-view ping when an event detail page loads (best-effort, no await needed). */
export const trackEventView = (slug) => {
  api.post(`/api/events/${slug}/analytics/view/`, {}).catch(() => { });
};

// ── Event sub-resources (standalone helpers for lazy loading) ───────────────
export const fetchEventSpeakers = async (slug) => {
  return api.get(`/api/events/${slug}/speakers/`);
};

export const fetchEventSchedule = async (slug) => {
  return api.get(`/api/events/${slug}/schedule/`);
};

export const fetchEventSponsors = async (slug) => {
  return api.get(`/api/events/${slug}/sponsors/`);
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
