import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Clock,
  Globe,
  Share2,
  Bookmark,
  BookmarkCheck,
  ChevronRight,
  Users,
  Check,
  MessageCircle,
  Twitter,
  Linkedin,
  Facebook,
  Ticket,
  Mic2,
  Building2,
  ExternalLink,
} from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import PageWrapper from '../components/layout/PageWrapper';
import TicketBox from '../components/event/TicketBox';
import StickyMobileBar from '../components/event/StickyMobileBar';
import EventCard from '../components/cards/EventCard';
import CustomAvatar from '../components/ui/CustomAvatar';
import ClassicTicketLoader from '../components/ui/ClassicTicketLoader';
import Modal from '../components/ui/Modal';
import {
  buildEventDetailPlaceholderFromList,
  approveEventReview,
  fetchEventLite,
  fetchEventSpeakers,
  fetchEventSchedule,
  fetchEventSponsors,
  fetchRelatedEvents,
  rejectEventReview,
  trackEventView,
} from '../lib/eventsApi';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import useSavedEvents from '../hooks/useSavedEvents';
import { heroImage, heroSrcSet, avatarImage, logoImage } from '../lib/imageUtils';
import eventQueryKeys from '../lib/eventQueryKeys';

const ScheduleTimeline = ({ schedule, themeColor }) => (
  <div className="space-y-0">
    {schedule.map((item, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.08 }}
        className="relative flex items-start gap-4"
      >
        {index < schedule.length - 1 && (
          <div className="absolute left-[19px] top-10 h-full w-0.5" style={{ backgroundColor: `${themeColor}30` }} />
        )}
        <div className="z-10 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border-2 bg-white" style={{ borderColor: themeColor }}>
          <Clock className="h-4 w-4" style={{ color: themeColor }} />
        </div>
        <div className="min-w-0 flex-1 pb-8">
          <p className="mb-0.5 break-words text-sm font-semibold" style={{ color: themeColor }}>{item.time}</p>
          <h4 className="mb-1 break-words font-semibold text-[#0F172A]">{item.title}</h4>
          {item.speaker && <p className="mb-1 break-words text-sm text-[#64748B]">Speaker: {item.speaker}</p>}
          {item.description && <p className="break-words text-sm text-[#64748B]">{item.description}</p>}
        </div>
      </motion.div>
    ))}
  </div>
);

const SpeakersGrid = ({ speakers, themeColor }) => (
  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
    {speakers.map((speaker, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.08 }}
        className="flex min-w-0 items-start gap-4 rounded-xl border border-[#E2E8F0] bg-white p-4 transition-shadow hover:shadow-md"
      >
        {speaker.photo || speaker.avatar ? (
          <img src={avatarImage(speaker.photo || speaker.avatar, 160)} alt={speaker.name} loading="lazy" decoding="async" width="56" height="56" className="h-14 w-14 flex-shrink-0 rounded-full border-2 border-[#F1F5F9] object-cover" />
        ) : (
          <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full border-2 border-[#F1F5F9] text-lg font-bold text-white" style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)` }}>
            {speaker.name?.charAt(0) || '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="break-words text-sm font-semibold text-[#0F172A]">{speaker.name}</h4>
          {speaker.title && <p className="mt-0.5 break-words text-xs font-medium" style={{ color: themeColor }}>{speaker.title}</p>}
          {speaker.organization && <p className="break-words text-xs text-[#94A3B8]">{speaker.organization}</p>}
          {speaker.bio && <p className="mt-1.5 break-words text-xs text-[#64748B] line-clamp-2">{speaker.bio}</p>}
        </div>
      </motion.div>
    ))}
  </div>
);

const SponsorsGrid = ({ sponsors, themeColor }) => {
  const tierOrder = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Partner'];
  const tierStyles = {
    Platinum: 'border-slate-300 bg-slate-50 text-slate-500',
    Gold: 'border-amber-300 bg-amber-50 text-amber-600',
    Silver: 'border-gray-300 bg-gray-50 text-gray-500',
    Bronze: 'border-orange-300 bg-orange-50 text-orange-700',
    Partner: 'border-blue-300 bg-blue-50 text-blue-600',
  };
  const tierLabels = { Partner: 'Supporter' };
  const byTier = tierOrder.reduce((acc, tier) => {
    const items = sponsors.filter((sponsor) => sponsor.tier === tier);
    if (items.length > 0) acc[tier] = items;
    return acc;
  }, {});

  return (
    <div className="w-full space-y-8 overflow-hidden">
      {Object.entries(byTier).map(([tier, items]) => (
        <div key={tier} className="w-full">
          <div className={`mb-4 inline-flex max-w-full items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold sm:text-sm ${tierStyles[tier]}`}>
            <Building2 className="h-4 w-4 flex-shrink-0" />
            <span className="truncate">{(tierLabels[tier] || tier)} Sponsor{items.length > 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-1 gap-3 xs:grid-cols-2 sm:grid-cols-3 sm:gap-4">
            {items.map((sponsor, index) => (
              <motion.div key={index} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: index * 0.08 }}>
                {sponsor.website ? (
                  <a href={sponsor.website} target="_blank" rel="noopener noreferrer" className="pressable-card group flex min-h-[100px] w-full min-w-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 sm:p-5">
                    {sponsor.logo ? <img src={logoImage(sponsor.logo)} alt={sponsor.name} loading="lazy" decoding="async" className="h-10 max-w-full object-contain" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white" style={{ backgroundColor: themeColor }}>{sponsor.name?.charAt(0)}</div>}
                    <div className="mt-2 flex w-full items-center justify-center gap-1 text-xs text-[#94A3B8] group-hover:text-[#02338D]">
                      <span className="truncate">{sponsor.name}</span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0" />
                    </div>
                  </a>
                ) : (
                  <div className="flex min-h-[100px] w-full min-w-0 flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 sm:p-5">
                    {sponsor.logo ? <img src={logoImage(sponsor.logo)} alt={sponsor.name} loading="lazy" decoding="async" className="h-10 max-w-full object-contain" /> : <div className="flex h-12 w-12 items-center justify-center rounded-xl text-lg font-bold text-white" style={{ backgroundColor: themeColor }}>{sponsor.name?.charAt(0)}</div>}
                    <p className="mt-2 w-full truncate px-2 text-center text-xs text-[#64748B]">{sponsor.name}</p>
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

const EventDetailPage = () => {
  const { slug } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addMultipleToCart } = useCart();
  const { user } = useAuth();
  const { isSaved, toggleSave } = useSavedEvents();
  const [showSharePopover, setShowSharePopover] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [reviewMessage, setReviewMessage] = useState('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [isTicketModalOpen, setIsTicketModalOpen] = useState(false);

  useEffect(() => {
    if (slug && !location.pathname.startsWith('/admin/event-reviews/')) {
      trackEventView(slug);
    }
  }, [location.pathname, slug]);

  const detailQueryKey = eventQueryKeys.detailLite(slug);
  const listCaches = queryClient.getQueriesData({ queryKey: eventQueryKeys.lists() });
  const placeholderEventFromList = listCaches.map(([, cached]) => {
    if (Array.isArray(cached)) return cached.find((item) => item?.slug === slug);
    if (cached?.results && Array.isArray(cached.results)) return cached.results.find((item) => item?.slug === slug);
    if (cached?.pages && Array.isArray(cached.pages)) {
      for (const page of cached.pages) {
        if (page?.results && Array.isArray(page.results)) {
          const hit = page.results.find((item) => item?.slug === slug);
          if (hit) return hit;
        }
      }
    }
    return null;
  }).find(Boolean);
  const detailAlreadyCached = Boolean(queryClient.getQueryData(detailQueryKey));

  const { data: baseEvent, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: detailQueryKey,
    queryFn: () => fetchEventLite(slug),
    staleTime: 5 * 60 * 1000,
    retry: false,
    placeholderData: () => buildEventDetailPlaceholderFromList(placeholderEventFromList),
  });

  const { data: relatedEvents = [] } = useQuery({
    queryKey: eventQueryKeys.related(slug),
    queryFn: () => fetchRelatedEvents(slug),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000,
  });

  const event = baseEvent ?? null;
  const isAdminUser = Boolean(user && (user.role === 'admin' || user.is_staff));
  const isReviewMode = location.pathname.startsWith('/admin/event-reviews/');
  const isEventOwner = Boolean(user && event?.organizer?.id && String(user.id) === String(event.organizer.id));
  const canViewReviewState = Boolean(isAdminUser || isEventOwner);

  const speakersCount = event?.speakersCount ?? event?.speakers_count;
  const scheduleCount = event?.scheduleCount ?? event?.schedule_count;
  const sponsorsCount = event?.sponsorsCount ?? event?.sponsors_count;

  const hasSpeakers = typeof speakersCount === 'number' ? speakersCount > 0 : Array.isArray(event?.speakers) && event.speakers.length > 0;
  const hasSchedule = typeof scheduleCount === 'number' ? scheduleCount > 0 : Array.isArray(event?.schedule) && event.schedule.length > 0;
  const hasSponsors = typeof sponsorsCount === 'number' ? sponsorsCount > 0 : Array.isArray(event?.sponsors) && event.sponsors.length > 0;

  const shouldFetchSpeakers = !!slug && hasSpeakers && !Array.isArray(event?.speakers);
  const shouldFetchSchedule = !!slug && hasSchedule && !Array.isArray(event?.schedule);
  const shouldFetchSponsors = !!slug && hasSponsors && !Array.isArray(event?.sponsors);

  const { data: speakersData = [], isLoading: isLoadingSpeakers } = useQuery({
    queryKey: eventQueryKeys.speakers(slug),
    queryFn: () => fetchEventSpeakers(slug),
    enabled: shouldFetchSpeakers,
    staleTime: 10 * 60 * 1000,
  });

  const { data: scheduleData = [], isLoading: isLoadingSchedule } = useQuery({
    queryKey: eventQueryKeys.schedule(slug),
    queryFn: () => fetchEventSchedule(slug),
    enabled: shouldFetchSchedule,
    staleTime: 10 * 60 * 1000,
  });

  const { data: sponsorsData = [], isLoading: isLoadingSponsors } = useQuery({
    queryKey: eventQueryKeys.sponsors(slug),
    queryFn: () => fetchEventSponsors(slug),
    enabled: shouldFetchSponsors,
    staleTime: 10 * 60 * 1000,
  });

  const speakers = useMemo(() => {
    if (Array.isArray(event?.speakers)) return event.speakers;
    if (!Array.isArray(speakersData)) return [];
    return speakersData.map((speaker) => ({
      ...speaker,
      avatar: speaker.avatar_url || speaker.avatar,
    }));
  }, [event?.speakers, speakersData]);

  const schedule = useMemo(() => {
    if (Array.isArray(event?.schedule)) return event.schedule;
    if (!Array.isArray(scheduleData)) return [];
    return scheduleData.map((item) => ({
      ...item,
      time: item.start_time ? (item.end_time ? `${item.start_time} - ${item.end_time}` : item.start_time) : item.time || '',
      speaker: item.speaker_name || item.speaker || '',
    }));
  }, [event?.schedule, scheduleData]);

  const sponsors = useMemo(() => {
    if (Array.isArray(event?.sponsors)) return event.sponsors;
    if (!Array.isArray(sponsorsData)) return [];
    return sponsorsData.map((sponsor) => ({
      ...sponsor,
      logo: sponsor.logo_url || sponsor.logo,
      tier: sponsor.tier ? sponsor.tier.charAt(0).toUpperCase() + sponsor.tier.slice(1) : 'Partner',
    }));
  }, [event?.sponsors, sponsorsData]);

  const handleGetTickets = (ticketData) => {
    const items = Array.isArray(ticketData?.items) ? ticketData.items : [];
    if (items.length === 0) {
      toast.error('Select at least one ticket to continue.');
      return;
    }

    addMultipleToCart(
      event.slug,
      event.title,
      event.themeColor,
      event.accentColor,
      items,
      { registration: ticketData.registration || null }
    );
    navigate(`/checkout/${event.slug}`);
  };

  const handleGetTicketsFromModal = (ticketData) => {
    setIsTicketModalOpen(false);
    handleGetTickets(ticketData);
  };

  const handleShare = (platform) => {
    const url = isReviewMode ? `${window.location.origin}/events/${event.slug}` : window.location.href;
    const text = `Check out ${event.title} on the Strathmore University Events Ticketing System!`;
    const urls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };

    if (platform === 'copy') {
      navigator.clipboard.writeText(url);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
      return;
    }

    window.open(urls[platform], '_blank');
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    setReviewMessage(event?.reviewNotes || '');
  }, [event?.reviewNotes]);

  useEffect(() => {
    setShowSharePopover(false);
    setIsTicketModalOpen(false);
  }, [slug]);

  const refreshReviewData = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: detailQueryKey }),
      queryClient.invalidateQueries({ queryKey: eventQueryKeys.lists() }),
      queryClient.invalidateQueries({ queryKey: ['admin_event_reviews'] }),
      queryClient.invalidateQueries({ queryKey: ['organizer_events'] }),
    ]);
  };

  const handleApproveEvent = async () => {
    if (!slug) return;
    try {
      setIsSubmittingReview(true);
      await approveEventReview(slug);
      await refreshReviewData();
      toast.success('Event approved and published.');
    } catch (error) {
      toast.error(error?.message || 'Failed to approve this event.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleRejectEvent = async () => {
    if (!slug) return;
    if (!reviewMessage.trim()) {
      toast.error('Please add a rejection message before rejecting this event.');
      return;
    }
    try {
      setIsSubmittingReview(true);
      await rejectEventReview(slug, reviewMessage.trim());
      await refreshReviewData();
      toast.success('Event rejected and the organizer has been notified.');
    } catch (error) {
      toast.error(error?.message || 'Failed to reject this event.');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  if (isLoading && !baseEvent) {
    return (
      <PageWrapper>
        <ClassicTicketLoader visible />
        <div className="min-h-screen bg-[#020617]" />
      </PageWrapper>
    );
  }

  if (!event) {
    return (
      <PageWrapper>
        <div className="max-w-7xl mx-auto px-4 py-16 text-center">
          <h1 className="mb-4 text-2xl font-bold text-[#0F172A]">Event Not Found</h1>
          <p className="mb-6 text-[#64748B]">The event you're looking for doesn't exist.</p>
          <Link to="/events" className="rounded-xl bg-[#02338D] px-6 py-3 font-medium text-white transition-colors hover:bg-[#022A78]">
            Browse Events
          </Link>
        </div>
      </PageWrapper>
    );
  }

  const saved = isSaved({ id: event.id, slug: event.slug });
  const themeColor = event.themeColor || '#02338D';
  const accentColor = event.accentColor || '#7C3AED';
  const eventWorkflowStatus = event.workflowStatus || event.status;
  const hasMC = event.mc?.name;
  const showClassicLoader = !detailAlreadyCached && (isPlaceholderData || (isFetching && isLoading));
  const locationName = typeof event.location === 'object' ? event.location.name : (event.location || 'Online event');
  const eventFormatLabel = event.format === 'in_person' ? 'In-person' : event.format === 'online' ? 'Online' : event.format === 'hybrid' ? 'Hybrid' : event.format || 'Event';
  const eventTimeLabel = `${event.time}${event.endTime ? ` - ${event.endTime}` : ''}`;
  const tickets = Array.isArray(event.tickets) ? event.tickets : [];
  const lowestTicketPrice = tickets.length > 0 ? Math.min(...tickets.map((ticket) => Number(ticket.price || 0))) : Number(event.price || 0);
  const detailHighlights = [
    { label: 'Date', value: formatDate(event.date), icon: Calendar },
    { label: 'Time', value: eventTimeLabel, icon: Clock },
    { label: 'Location', value: locationName, icon: MapPin },
    { label: 'Timezone', value: event.timezone || 'Not specified', icon: Globe },
    { label: 'Attendees', value: `${event.attendeeCount?.toLocaleString() || 0} attending`, icon: Users },
  ];
  const reviewStatusCopy = {
    pending: { title: 'Pending approval', body: 'This event has been submitted for publication and is waiting for admin review.', tone: 'border-[#FDE68A] bg-[#FFF7E6] text-[#8A620E]' },
    rejected: { title: 'Changes requested', body: 'This event was reviewed and needs updates before it can be published again.', tone: 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]' },
    published: { title: 'Published', body: 'This event is live and visible to attendees.', tone: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]' },
  };
  const reviewBanner = eventWorkflowStatus === 'published' && !isReviewMode ? null : reviewStatusCopy[eventWorkflowStatus] || null;

  return (
    <PageWrapper>
      <ClassicTicketLoader visible={showClassicLoader} />

      <div className="max-w-[1240px] mx-auto w-full px-4 pb-28 pt-6 sm:px-6 sm:pb-32 lg:px-8 lg:pb-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start lg:gap-10 xl:grid-cols-[minmax(0,1fr)_336px]">
          <div className="min-w-0">
            <div className="mb-4">
              <nav className="mb-3 flex flex-wrap items-center gap-1 text-xs text-[#64748B] sm:gap-2">
                <Link to="/" className="transition-colors hover:text-[#0F172A]">Home</Link>
                <ChevronRight className="h-3 w-3" />
                <Link to="/events" className="transition-colors hover:text-[#0F172A]">Events</Link>
                <ChevronRight className="h-3 w-3" />
                <span className="max-w-[220px] truncate text-[#0F172A]">{event.title}</span>
              </nav>
              <h1 className="text-2xl font-bold leading-tight text-[#0F172A] break-words sm:text-3xl">{event.title}</h1>
            </div>

            <section className="mb-6 overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-white shadow-[0_30px_60px_-48px_rgba(15,23,42,0.7)]">
              <div className="relative aspect-[16/11] overflow-hidden sm:aspect-[16/9] lg:aspect-[16/7]">
                {event.bannerImage ? (
                  <img src={heroImage(event.bannerImage)} srcSet={heroSrcSet(event.bannerImage)} sizes="(max-width: 1024px) 100vw, 780px" alt="" aria-hidden="true" fetchPriority="high" decoding="sync" className="absolute inset-0 h-full w-full object-cover" />
                ) : (
                  <div className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${themeColor} 0%, ${accentColor} 100%)` }} />
                )}

                {!event.bannerImage && (
                  <div className="absolute inset-0 opacity-10">
                    <svg className="h-full w-full" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
                      <defs>
                        <pattern id="dots" patternUnits="userSpaceOnUse" width="30" height="30">
                          <circle cx="15" cy="15" r="2" fill="white" />
                        </pattern>
                      </defs>
                      <rect width="200" height="200" fill="url(#dots)" />
                    </svg>
                  </div>
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-[#020617]/90 via-[#020617]/45 to-transparent" />

                <div className="absolute right-3 top-3 flex items-center gap-2 sm:right-4 sm:top-4">
                  <div className="relative">
                    <button onClick={() => setShowSharePopover(!showSharePopover)} className="rounded-full border border-white/20 bg-white/20 p-2 text-white backdrop-blur-sm transition-colors hover:bg-white/35" aria-label="Share event">
                      <Share2 className="h-4 w-4" />
                    </button>
                    <AnimatePresence>
                      {showSharePopover && (
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute right-0 top-full z-20 mt-2 min-w-[190px] rounded-xl border border-[#E2E8F0] bg-white p-2 shadow-2xl">
                          {[
                            { label: 'WhatsApp', platform: 'whatsapp', icon: <MessageCircle className="h-4 w-4 text-[#16A34A]" /> },
                            { label: 'Twitter', platform: 'twitter', icon: <Twitter className="h-4 w-4 text-[#1DA1F2]" /> },
                            { label: 'LinkedIn', platform: 'linkedin', icon: <Linkedin className="h-4 w-4 text-[#0A66C2]" /> },
                            { label: 'Facebook', platform: 'facebook', icon: <Facebook className="h-4 w-4 text-[#1877F2]" /> },
                          ].map(({ label, platform, icon }) => (
                            <button key={platform} onClick={() => handleShare(platform)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#F1F5F9]">
                              {icon} {label}
                            </button>
                          ))}
                          <div className="my-1 border-t border-[#E2E8F0]" />
                          <button onClick={() => handleShare('copy')} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition-colors hover:bg-[#F1F5F9]">
                            {linkCopied ? (<><Check className="h-4 w-4 text-[#16A34A]" /><span className="text-[#16A34A]">Copied!</span></>) : (<><Share2 className="h-4 w-4 text-[#64748B]" /><span>Copy Link</span></>)}
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  <button onClick={() => toggleSave({ id: event.id, slug: event.slug })} className={`rounded-full border p-2 backdrop-blur-sm transition-all ${saved ? 'bg-[#02338D] border-[#02338D] text-white' : 'bg-white/20 border-white/20 text-white hover:bg-white/35'}`} aria-label={saved ? 'Remove from saved' : 'Save event'}>
                    {saved ? <BookmarkCheck className="h-4 w-4" /> : <Bookmark className="h-4 w-4" />}
                  </button>
                </div>

                <div className="absolute inset-x-0 bottom-0 p-4 sm:p-5 lg:p-6">
                  <div className="rounded-[24px] border border-white/15 bg-white/14 p-4 text-white shadow-xl backdrop-blur-xl sm:p-5">
                    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                      {detailHighlights.map(({ label, value, icon: Icon }) => (
                        <div key={label} className="min-w-0 rounded-2xl border border-white/10 bg-black/10 px-4 py-3">
                          <div className="flex items-start gap-3">
                            <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-white/12">
                              <Icon className="h-4 w-4 text-white" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">{label}</p>
                              <p className="mt-1 break-words text-sm font-semibold leading-5 text-white">{value}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 sm:p-6 lg:p-8">
                <div className="mb-4 flex flex-wrap items-center gap-2">
                  <span className="rounded-full px-3 py-1 text-xs font-semibold text-white" style={{ backgroundColor: `${themeColor}CC` }}>{event.category}</span>
                  <span className="rounded-full bg-[#F1F5F9] px-3 py-1 text-xs font-medium text-[#475569]">{eventFormatLabel}</span>
                  {event.isFeatured && <span className="rounded-full bg-amber-400 px-3 py-1 text-xs font-semibold text-amber-900">Featured</span>}
                </div>

                <div className="prose prose-slate max-w-full break-words overflow-hidden">
                  {event.description ? event.description.split('\n\n').map((para, index) => (
                    <p key={index} className="mb-4 whitespace-normal break-words text-[#475569] sm:break-normal" style={{ wordBreak: 'break-word' }}>{para}</p>
                  )) : <p className="text-[#64748B]">No description provided.</p>}
                </div>
              </div>
            </section>

            {canViewReviewState && reviewBanner && (
              <div className={`mb-6 rounded-2xl border p-5 ${reviewBanner.tone}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">{reviewBanner.title}</span>
                      {event.reviewedAt && <span className="text-xs opacity-80">Reviewed {new Date(event.reviewedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>}
                    </div>
                    <p className="text-sm leading-6">{reviewBanner.body}</p>
                    {event.approvalRequestedAt && <p className="text-xs opacity-80">Submitted {new Date(event.approvalRequestedAt).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })}</p>}
                    {event.reviewedByName && <p className="text-xs opacity-80">Reviewed by {event.reviewedByName}</p>}
                    {event.reviewNotes && <div className="rounded-xl border border-current/15 bg-white/50 p-4 text-sm leading-6 text-[#334155]"><p className="mb-1 font-semibold">Review message</p><p>{event.reviewNotes}</p></div>}
                  </div>

                  {isReviewMode && isAdminUser && (
                    <div className="w-full max-w-xl rounded-2xl border border-[#E2E8F0] bg-white p-4 text-[#0F172A] shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h2 className="text-base font-bold">Admin Review</h2>
                          <p className="text-sm text-[#64748B]">Review this event in its real detail-page layout, then publish or reject it.</p>
                        </div>
                        <button type="button" onClick={() => navigate('/organizer-dashboard?tab=reviews')} className="text-sm font-semibold text-[#02338D] hover:text-[#022A78]">Back to queue</button>
                      </div>
                      <div className="mt-4 space-y-3">
                        <label className="block text-sm font-medium text-[#0F172A]">Rejection message</label>
                        <textarea value={reviewMessage} onChange={(e) => setReviewMessage(e.target.value)} placeholder="Explain what needs to change before this event can be published." className="min-h-[120px] w-full rounded-xl border border-[#CBD5E1] px-4 py-3 text-sm text-[#0F172A] shadow-sm focus:border-[#02338D] focus:outline-none focus:ring-2 focus:ring-[#02338D]/20" />
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button type="button" onClick={handleApproveEvent} disabled={isSubmittingReview || eventWorkflowStatus === 'published'} className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#02338D] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#022A78] disabled:cursor-not-allowed disabled:opacity-60">{eventWorkflowStatus === 'published' ? 'Already Published' : 'Publish Event'}</button>
                          <button type="button" onClick={handleRejectEvent} disabled={isSubmittingReview || eventWorkflowStatus === 'published'} className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#991B1B] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#7F1D1D] disabled:cursor-not-allowed disabled:opacity-60">Reject Event</button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            <section className="overflow-hidden rounded-[28px] border border-[#E2E8F0] bg-white shadow-[0_24px_48px_-42px_rgba(15,23,42,0.45)]">
              {hasMC && (
                <div className="px-5 py-5 sm:px-6 lg:px-8">
                  <div className="flex items-start gap-4">
                    {event.mc.avatar || event.mc.photo ? (
                      <img src={avatarImage(event.mc.avatar || event.mc.photo, 128)} alt={event.mc.name} loading="lazy" decoding="async" width="48" height="48" className="h-12 w-12 flex-shrink-0 rounded-full border-2 border-[#F1F5F9] object-cover" />
                    ) : (
                      <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white" style={{ backgroundColor: accentColor }}>
                        <Mic2 className="h-5 w-5" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-[#0F172A]">{event.mc.name}</h3>
                        <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white" style={{ backgroundColor: accentColor }}>MC / Host</span>
                      </div>
                      {event.mc.bio && <p className="mt-1 text-sm leading-6 text-[#64748B]">{event.mc.bio}</p>}
                    </div>
                  </div>
                </div>
              )}

              <div className={`${hasMC ? 'border-t border-[#E2E8F0]' : ''} px-5 py-5 sm:px-6 lg:px-8`}>
                <div className="flex items-start gap-4">
                  <CustomAvatar src={event.organizer.avatar} name={event.organizer.name} size="lg" fallbackColor={event.organizer.brandColor} />
                  <div className="min-w-0 flex-1">
                    <h4 className="font-semibold text-[#0F172A]">{event.organizer.name}</h4>
                    {event.organizer.bio && <p className="mt-1 text-sm text-[#64748B]">{event.organizer.bio}</p>}
                    <Link to={`/organizers/${event.organizer.id}`} className="mt-1 inline-flex items-center gap-1 text-sm font-medium hover:underline" style={{ color: themeColor }}>
                      View profile <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>

              {event.tags?.length > 0 && (
                <div className="border-t border-[#E2E8F0] px-5 py-4 sm:px-6 lg:px-8">
                  <div className="flex flex-wrap gap-2">
                    {event.tags.map((tag, index) => (
                      <span key={index} className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#64748B]">
                        # {typeof tag === 'object' ? tag.name : (tag || '')}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {hasSpeakers && (
                <div className="border-t border-[#E2E8F0] px-5 py-6 sm:px-6 lg:px-8">
                  <h2 className="mb-4 text-lg font-bold text-[#0F172A]">Presenters ({speakers.length || speakersCount || 0})</h2>
                  {isLoadingSpeakers ? <div className="py-6 text-sm text-[#64748B]">Loading speakers...</div> : speakers.length > 0 ? <SpeakersGrid speakers={speakers} themeColor={themeColor} /> : <p className="text-sm text-[#64748B]">No speakers listed yet.</p>}
                </div>
              )}

              {hasSchedule && (
                <div className="border-t border-[#E2E8F0] px-5 py-6 sm:px-6 lg:px-8">
                  <h2 className="mb-4 text-lg font-bold text-[#0F172A]">Schedule</h2>
                  {isLoadingSchedule ? <div className="py-6 text-sm text-[#64748B]">Loading schedule...</div> : schedule.length > 0 ? <ScheduleTimeline schedule={schedule} themeColor={themeColor} /> : <p className="text-sm text-[#64748B]">No schedule published yet.</p>}
                </div>
              )}

              {hasSponsors && (
                <div className="border-t border-[#E2E8F0] px-5 py-6 sm:px-6 lg:px-8">
                  <h2 className="mb-4 text-lg font-bold text-[#0F172A]">Sponsors</h2>
                  {isLoadingSponsors ? <div className="py-6 text-sm text-[#64748B]">Loading sponsors...</div> : sponsors.length > 0 ? <SponsorsGrid sponsors={sponsors} themeColor={themeColor} /> : <p className="text-sm text-[#64748B]">No sponsors listed yet.</p>}
                </div>
              )}

              {relatedEvents.length > 0 && (
                <div className="border-t border-[#E2E8F0] px-5 py-6 sm:px-6 lg:px-8">
                  <h2 className="mb-4 text-lg font-bold text-[#0F172A]">You Might Also Like</h2>
                  <div className="grid gap-5 sm:grid-cols-2">
                    {relatedEvents.slice(0, 3).map((relatedEvent, index) => (
                      <EventCard key={relatedEvent.id} event={relatedEvent} index={index} />
                    ))}
                  </div>
                </div>
              )}
            </section>
          </div>

          <aside className="hidden w-[320px] flex-shrink-0 lg:block xl:w-[336px]">
            <div className="sticky top-[7.25rem]">
              <div className="flex items-center justify-between rounded-t-2xl px-4 py-3 text-sm font-medium text-white shadow-[0_20px_36px_-28px_rgba(15,23,42,0.65)]" style={{ background: `linear-gradient(135deg, ${themeColor}, ${accentColor})` }}>
                <div className="flex items-center gap-2">
                  <Ticket className="h-4 w-4" />
                  <span>{event.isFree || lowestTicketPrice === 0 ? 'Free Event' : `From ${event.currency} ${lowestTicketPrice.toLocaleString()}`}</span>
                </div>
                <div className="flex items-center gap-1 text-white/80">
                  <Users className="h-3 w-3" />
                  <span className="text-xs">{event.attendeeCount?.toLocaleString() || 0} going</span>
                </div>
              </div>
              <div className="max-h-[calc(100vh-9.25rem)] overflow-y-auto rounded-b-2xl scrollbar-thin scrollbar-track-transparent scrollbar-thumb-[#E2E8F0]">
                <TicketBox event={event} onGetTickets={handleGetTickets} themeColor={themeColor} layout="sidebar" />
              </div>
            </div>
          </aside>
        </div>
      </div>

      <Modal isOpen={isTicketModalOpen} onClose={() => setIsTicketModalOpen(false)} title="Get Tickets" size="full" className="bg-[#F8FAFC] sm:max-w-2xl">
        <TicketBox event={event} onGetTickets={handleGetTicketsFromModal} themeColor={themeColor} />
      </Modal>

      <StickyMobileBar event={event} onOpenTickets={() => setIsTicketModalOpen(true)} themeColor={themeColor} />
    </PageWrapper>
  );
};

export default EventDetailPage;
