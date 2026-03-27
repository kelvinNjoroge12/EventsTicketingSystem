import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Clock, Globe, Share2, Bookmark, BookmarkCheck,
  ChevronRight, Users, Check, MessageCircle, Twitter, Linkedin,
  Facebook, Ticket, Mic2, Building2, ExternalLink
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import TicketBox from '../components/event/TicketBox';
import StickyMobileBar from '../components/event/StickyMobileBar';
import EventCard from '../components/cards/EventCard';
import CustomAvatar from '../components/ui/CustomAvatar';
import ClassicTicketLoader from '../components/ui/ClassicTicketLoader';
import {
  buildEventDetailPlaceholderFromList,
  approveEventReview,
  fetchEventLite,
  fetchEventSpeakers,
  fetchEventSchedule,
  fetchEventSponsors,
  fetchRelatedEvents,
  rejectEventReview,
  trackEventView
} from '../lib/eventsApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import useSavedEvents from '../hooks/useSavedEvents';
import { heroImage, heroSrcSet, avatarImage, logoImage } from '../lib/imageUtils';
import eventQueryKeys from '../lib/eventQueryKeys';
import { toast } from 'sonner';

// ── Timeline Component ──────────────────────────────────────────────────────
const ScheduleTimeline = ({ schedule, themeColor }) => (
  <div className="space-y-0">
    {schedule.map((item, index) => (
      <motion.div
        key={index}
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ delay: index * 0.08 }}
        className="flex items-start gap-4 relative"
      >
        {index < schedule.length - 1 && (
          <div className="absolute left-[19px] top-10 w-0.5 h-full" style={{ backgroundColor: `${themeColor}30` }} />
        )}
        <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white z-10"
          style={{ borderColor: themeColor }}>
          <Clock className="w-4 h-4" style={{ color: themeColor }} />
        </div>
        <div className="pb-8 flex-1 min-w-0">
          <p className="text-sm font-semibold mb-0.5 break-words" style={{ color: themeColor }}>{item.time}</p>
          <h4 className="font-semibold text-[#0F172A] mb-1 break-words">{item.title}</h4>
          {item.speaker && <p className="text-sm text-[#64748B] mb-1 break-words">Speaker: {item.speaker}</p>}
          {item.description && <p className="text-sm text-[#64748B] break-words">{item.description}</p>}
        </div>
      </motion.div>
    ))}
  </div>
);

// ── Speakers Grid (Teams-style: 2-col rectangular horizontal cards) ─────────
const SpeakersGrid = ({ speakers, themeColor }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
    {speakers.map((speaker, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: i * 0.08 }}
        className="bg-white rounded-xl border border-[#E2E8F0] p-4 flex items-start gap-4 hover:shadow-md transition-shadow min-w-0"
      >
        {speaker.photo || speaker.avatar ? (
          <img
            src={avatarImage(speaker.photo || speaker.avatar, 160)}
            alt={speaker.name}
            loading="lazy"
            decoding="async"
            width="56"
            height="56"
            className="w-14 h-14 rounded-full object-cover flex-shrink-0 border-2 border-[#F1F5F9]" />
        ) : (
          <div className="w-14 h-14 rounded-full flex-shrink-0 flex items-center justify-center text-white text-lg font-bold border-2 border-[#F1F5F9]"
            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)` }}>
            {speaker.name?.charAt(0) || '?'}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="font-semibold text-[#0F172A] text-sm break-words">{speaker.name}</h4>
          {speaker.title && <p className="text-xs font-medium mt-0.5 break-words" style={{ color: themeColor }}>{speaker.title}</p>}
          {speaker.organization && <p className="text-xs text-[#94A3B8] break-words">{speaker.organization}</p>}
          {speaker.bio && <p className="text-xs text-[#64748B] mt-1.5 line-clamp-2 break-words">{speaker.bio}</p>}
        </div>
      </motion.div>
    ))}
  </div>
);

// ── Sponsors Grid ──────────────────────────────────────────────────────────
const SponsorsGrid = ({ sponsors, themeColor }) => {
  const tierOrder = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Partner'];
  const byTier = tierOrder.reduce((acc, tier) => {
    const items = sponsors.filter(s => s.tier === tier);
    if (items.length > 0) acc[tier] = items;
    return acc;
  }, {});

  const tierStyles = {
    Platinum: 'text-slate-500 border-slate-300 bg-slate-50',
    Gold: 'text-amber-600 border-amber-300 bg-amber-50',
    Silver: 'text-gray-500 border-gray-300 bg-gray-50',
    Bronze: 'text-orange-700 border-orange-300 bg-orange-50',
    Partner: 'text-blue-600 border-blue-300 bg-blue-50',
  };
  const tierLabels = { Partner: 'Supporter' };

  return (
    <div className="space-y-8 w-full overflow-hidden">
      {Object.entries(byTier).map(([tier, items]) => (
        <div key={tier} className="w-full">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-semibold mb-4 max-w-full ${tierStyles[tier]}`}>
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{(tierLabels[tier] || tier)} Sponsor{items.length > 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {items.map((sponsor, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                {sponsor.website ? (
                  <a href={sponsor.website} target="_blank" rel="noopener noreferrer"
                    className="pressable-card bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-3 sm:p-5 flex flex-col items-center justify-center gap-2 group min-h-[100px] min-w-0 w-full overflow-hidden">
                    {sponsor.logo ? (
                      <img src={logoImage(sponsor.logo)} alt={sponsor.name} loading="lazy" decoding="async" className="h-10 max-w-full object-contain" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: themeColor }}>{sponsor.name?.charAt(0)}</div>
                    )}
                    <div className="flex items-center justify-center gap-1 text-xs text-[#94A3B8] group-hover:text-[#02338D] w-full mt-2">
                      <span className="truncate">{sponsor.name}</span>
                      <ExternalLink className="w-3 h-3 flex-shrink-0" />
                    </div>
                  </a>
                ) : (
                  <div className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-3 sm:p-5 flex flex-col items-center justify-center gap-2 min-h-[100px] min-w-0 w-full overflow-hidden">
                    {sponsor.logo ? (
                      <img src={logoImage(sponsor.logo)} alt={sponsor.name} loading="lazy" decoding="async" className="h-10 max-w-full object-contain" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: themeColor }}>{sponsor.name?.charAt(0)}</div>
                    )}
                    <p className="text-xs text-[#64748B] text-center mt-2 truncate w-full px-2">{sponsor.name}</p>
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

// ── Main EventDetailPage ────────────────────────────────────────────────────
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

  useEffect(() => {
    if (slug && !location.pathname.startsWith('/admin/event-reviews/')) {
      trackEventView(slug);
    }
  }, [location.pathname, slug]);

  const detailQueryKey = eventQueryKeys.detailLite(slug);
  const listCaches = queryClient.getQueriesData({ queryKey: eventQueryKeys.lists() });
  const placeholderEventFromList = listCaches
    .map(([, cached]) => {
      if (Array.isArray(cached)) {
        return cached.find((item) => item?.slug === slug);
      }
      if (cached?.results && Array.isArray(cached.results)) {
        return cached.results.find((item) => item?.slug === slug);
      }
      if (cached?.pages && Array.isArray(cached.pages)) {
        for (const page of cached.pages) {
          if (page?.results && Array.isArray(page.results)) {
            const hit = page.results.find((item) => item?.slug === slug);
            if (hit) return hit;
          }
        }
      }
      return null;
    })
    .find(Boolean);
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

  const hasSpeakers =
    typeof speakersCount === 'number'
      ? speakersCount > 0
      : Array.isArray(event?.speakers) && event.speakers.length > 0;
  const hasSchedule =
    typeof scheduleCount === 'number'
      ? scheduleCount > 0
      : Array.isArray(event?.schedule) && event.schedule.length > 0;
  const hasSponsors =
    typeof sponsorsCount === 'number'
      ? sponsorsCount > 0
      : Array.isArray(event?.sponsors) && event.sponsors.length > 0;

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
    return speakersData.map((s) => ({
      ...s,
      avatar: s.avatar_url || s.avatar,
    }));
  }, [event?.speakers, speakersData]);

  const schedule = useMemo(() => {
    if (Array.isArray(event?.schedule)) return event.schedule;
    if (!Array.isArray(scheduleData)) return [];
    return scheduleData.map((item) => ({
      ...item,
      time: item.start_time
        ? item.end_time
          ? `${item.start_time} – ${item.end_time}`
          : item.start_time
        : item.time || '',
      speaker: item.speaker_name || item.speaker || '',
    }));
  }, [event?.schedule, scheduleData]);

  const sponsors = useMemo(() => {
    if (Array.isArray(event?.sponsors)) return event.sponsors;
    if (!Array.isArray(sponsorsData)) return [];
    return sponsorsData.map((s) => ({
      ...s,
      logo: s.logo_url || s.logo,
      tier: s.tier ? s.tier.charAt(0).toUpperCase() + s.tier.slice(1) : 'Partner',
    }));
  }, [event?.sponsors, sponsorsData]);

  const handleGetTickets = (ticketData) => {
    addMultipleToCart(
      event.slug,
      event.title,
      event.themeColor,
      event.accentColor,
      ticketData.items,
      { registration: ticketData.registration || null }
    );
    navigate(`/checkout/${event.slug}`);
  };

  const handleShare = (platform) => {
    const url = isReviewMode
      ? `${window.location.origin}/events/${event.slug}`
      : window.location.href;
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
    } else {
      window.open(urls[platform], '_blank');
    }
  };

  const formatDate = (dateString) =>
    new Date(dateString).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  useEffect(() => {
    setReviewMessage(event?.reviewNotes || '');
  }, [event?.reviewNotes]);

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
          <h1 className="text-2xl font-bold text-[#0F172A] mb-4">Event Not Found</h1>
          <p className="text-[#64748B] mb-6">The event you're looking for doesn't exist.</p>
          <Link to="/events" className="px-6 py-3 bg-[#02338D] text-white rounded-xl font-medium hover:bg-[#022A78] transition-colors">Browse Events</Link>
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
  const eventFormatLabel =
    event.format === 'in_person'
      ? 'In-person'
      : event.format === 'online'
        ? 'Online'
        : event.format === 'hybrid'
          ? 'Hybrid'
          : event.format || 'Event';
  const eventTimeLabel = `${event.time}${event.endTime ? ` - ${event.endTime}` : ''}`;

  const reviewStatusCopy = {
    pending: {
      title: 'Pending approval',
      body: 'This event has been submitted for publication and is waiting for admin review.',
      tone: 'border-[#FDE68A] bg-[#FFF7E6] text-[#8A620E]',
    },
    rejected: {
      title: 'Changes requested',
      body: 'This event was reviewed and needs updates before it can be published again.',
      tone: 'border-[#FCA5A5] bg-[#FEF2F2] text-[#991B1B]',
    },
    published: {
      title: 'Published',
      body: 'This event is live and visible to attendees.',
      tone: 'border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]',
    },
  };
  const reviewBanner = eventWorkflowStatus === 'published' && !isReviewMode
    ? null
    : reviewStatusCopy[eventWorkflowStatus] || null;

  return (
    <PageWrapper>
      <ClassicTicketLoader visible={showClassicLoader} />

      {/* ── MAIN CONTENT AREA ── */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 pb-10 w-full">

        {/* ── EVENT TITLE ── */}
        <div className="mb-4">
          <nav className="flex flex-wrap items-center gap-1 sm:gap-2 text-[#64748B] text-xs mb-3">
            <Link to="/" className="hover:text-[#0F172A] transition-colors">Home</Link>
            <ChevronRight className="w-3 h-3" />
            <Link to="/events" className="hover:text-[#0F172A] transition-colors">Events</Link>
            <ChevronRight className="w-3 h-3" />
            <span className="text-[#0F172A] truncate max-w-[200px]">{event.title}</span>
          </nav>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#0F172A] leading-tight break-words">{event.title}</h1>
        </div>

        {/* ── TWO-COLUMN LAYOUT ── */}
        <div className="flex flex-col lg:flex-row gap-8 lg:gap-10 relative">

          {/* ── LEFT COLUMN (scrollable content) ── */}
          <div className="flex-1 min-w-0">

            {/* Banner Image (contained, rounded) */}
            <div className="relative w-full rounded-2xl overflow-hidden mb-6" style={{ aspectRatio: '16/7' }}>
              {event.bannerImage ? (
                <img
                  src={heroImage(event.bannerImage)}
                  srcSet={heroSrcSet(event.bannerImage)}
                  sizes="(max-width: 1024px) 100vw, 700px"
                  alt=""
                  aria-hidden="true"
                  fetchpriority="high"
                  decoding="sync"
                  className="absolute inset-0 w-full h-full object-cover"
                />
              ) : (
                <div
                  className="absolute inset-0"
                  style={{ background: `linear-gradient(135deg, ${themeColor} 0%, ${accentColor} 100%)` }}
                />
              )}
              {!event.bannerImage && (
                <div className="absolute inset-0 opacity-10">
                  <svg className="w-full h-full" viewBox="0 0 200 200" preserveAspectRatio="xMidYMid slice">
                    <defs>
                      <pattern id="dots" patternUnits="userSpaceOnUse" width="30" height="30">
                        <circle cx="15" cy="15" r="2" fill="white" />
                      </pattern>
                    </defs>
                    <rect width="200" height="200" fill="url(#dots)" />
                  </svg>
                </div>
              )}
              {/* Action Buttons (top right of banner) */}
              <div className="absolute top-3 right-3 flex items-center gap-2">
                <div className="relative">
                  <button onClick={() => setShowSharePopover(!showSharePopover)}
                    className="p-2 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/35 transition-colors border border-white/20"
                    aria-label="Share event">
                    <Share2 className="w-4 h-4" />
                  </button>
                  <AnimatePresence>
                    {showSharePopover && (
                      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute top-full right-0 mt-2 bg-white rounded-xl shadow-2xl border border-[#E2E8F0] p-2 min-w-[190px] z-20"
                      >
                        {[
                          { label: 'WhatsApp', platform: 'whatsapp', icon: <MessageCircle className="w-4 h-4 text-[#16A34A]" /> },
                          { label: 'Twitter', platform: 'twitter', icon: <Twitter className="w-4 h-4 text-[#1DA1F2]" /> },
                          { label: 'LinkedIn', platform: 'linkedin', icon: <Linkedin className="w-4 h-4 text-[#0A66C2]" /> },
                          { label: 'Facebook', platform: 'facebook', icon: <Facebook className="w-4 h-4 text-[#1877F2]" /> },
                        ].map(({ label, platform, icon }) => (
                          <button key={platform} onClick={() => handleShare(platform)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F1F5F9] text-left text-sm transition-colors">
                            {icon} {label}
                          </button>
                        ))}
                        <div className="border-t border-[#E2E8F0] my-1" />
                        <button onClick={() => handleShare('copy')}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-[#F1F5F9] text-left text-sm transition-colors">
                          {linkCopied ? (
                            <><Check className="w-4 h-4 text-[#16A34A]" /><span className="text-[#16A34A]">Copied!</span></>
                          ) : (
                            <><Share2 className="w-4 h-4 text-[#64748B]" /><span>Copy Link</span></>
                          )}
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
                <button onClick={() => toggleSave({ id: event.id, slug: event.slug })}
                  className={`p-2 rounded-full backdrop-blur-sm border transition-all ${saved ? 'bg-[#02338D] border-[#02338D] text-white' : 'bg-white/20 border-white/20 text-white hover:bg-white/35'}`}
                  aria-label={saved ? 'Remove from saved' : 'Save event'}>
                  {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Review Banner */}
            {canViewReviewState && reviewBanner && (
              <div className={`mb-6 rounded-2xl border p-5 ${reviewBanner.tone}`}>
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-full border border-current/20 px-3 py-1 text-xs font-semibold uppercase tracking-wide">
                        {reviewBanner.title}
                      </span>
                      {event.reviewedAt && (
                        <span className="text-xs opacity-80">
                          Reviewed {new Date(event.reviewedAt).toLocaleString('en-US', {
                            month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                          })}
                        </span>
                      )}
                    </div>
                    <p className="text-sm leading-6">{reviewBanner.body}</p>
                    {event.approvalRequestedAt && (
                      <p className="text-xs opacity-80">
                        Submitted {new Date(event.approvalRequestedAt).toLocaleString('en-US', {
                          month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit',
                        })}
                      </p>
                    )}
                    {event.reviewedByName && (
                      <p className="text-xs opacity-80">Reviewed by {event.reviewedByName}</p>
                    )}
                    {event.reviewNotes && (
                      <div className="rounded-xl border border-current/15 bg-white/50 p-4 text-sm leading-6 text-[#334155]">
                        <p className="mb-1 font-semibold">Review message</p>
                        <p>{event.reviewNotes}</p>
                      </div>
                    )}
                  </div>
                  {isReviewMode && isAdminUser && (
                    <div className="w-full max-w-xl rounded-2xl border border-[#E2E8F0] bg-white p-4 text-[#0F172A] shadow-sm">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <h2 className="text-base font-bold">Admin Review</h2>
                          <p className="text-sm text-[#64748B]">
                            Review this event in its real detail-page layout, then publish or reject it.
                          </p>
                        </div>
                        <button type="button" onClick={() => navigate('/organizer-dashboard?tab=reviews')}
                          className="text-sm font-semibold text-[#02338D] hover:text-[#022A78]">
                          Back to queue
                        </button>
                      </div>
                      <div className="mt-4 space-y-3">
                        <label className="block text-sm font-medium text-[#0F172A]">Rejection message</label>
                        <textarea
                          value={reviewMessage}
                          onChange={(e) => setReviewMessage(e.target.value)}
                          placeholder="Explain what needs to change before this event can be published."
                          className="min-h-[120px] w-full rounded-xl border border-[#CBD5E1] px-4 py-3 text-sm text-[#0F172A] shadow-sm focus:border-[#02338D] focus:outline-none focus:ring-2 focus:ring-[#02338D]/20"
                        />
                        <div className="flex flex-col gap-3 sm:flex-row">
                          <button type="button" onClick={handleApproveEvent}
                            disabled={isSubmittingReview || eventWorkflowStatus === 'published'}
                            className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#02338D] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#022A78] disabled:cursor-not-allowed disabled:opacity-60">
                            {eventWorkflowStatus === 'published' ? 'Already Published' : 'Publish Event'}
                          </button>
                          <button type="button" onClick={handleRejectEvent}
                            disabled={isSubmittingReview || eventWorkflowStatus === 'published'}
                            className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#991B1B] px-4 py-3 text-sm font-semibold text-white transition-colors hover:bg-[#7F1D1D] disabled:cursor-not-allowed disabled:opacity-60">
                            Reject Event
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Mobile Ticket Section (appears before content on mobile only) */}
            <div className="lg:hidden mb-6">
              <TicketBox event={event} onGetTickets={handleGetTickets} themeColor={themeColor} />
            </div>

            {/* ── EVENT DESCRIPTION ── */}
            <div className="mb-2">
              <div className="flex flex-wrap items-center gap-2 mb-4">
                <span className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: `${themeColor}CC` }}>
                  {event.category}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#F1F5F9] text-[#475569]">
                  {eventFormatLabel}
                </span>
                {event.isFeatured && (
                  <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-amber-900">Featured</span>
                )}
              </div>

              <div className="prose prose-slate max-w-full break-words overflow-hidden">
                {event.description
                  ? event.description.split('\n\n').map((para, i) => (
                    <p key={i} className="text-[#475569] leading-relaxed mb-4 whitespace-normal break-words sm:break-normal" style={{ wordBreak: 'break-word' }}>{para}</p>
                  ))
                  : <p className="text-[#64748B]">No description provided.</p>
                }
              </div>
            </div>

            {/* ── EVENT DETAILS (inline, below description) ── */}
            <div className="py-5 border-t border-[#E2E8F0]">
              <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4" style={{ color: themeColor }} />
                  <span className="text-[#0F172A] font-medium">{formatDate(event.date)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4" style={{ color: themeColor }} />
                  <span className="text-[#0F172A] font-medium">{eventTimeLabel}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4" style={{ color: themeColor }} />
                  <span className="text-[#0F172A] font-medium">{locationName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Globe className="w-4 h-4" style={{ color: themeColor }} />
                  <span className="text-[#0F172A] font-medium">{event.timezone || 'Not specified'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: themeColor }} />
                  <span className="text-[#0F172A] font-medium">{event.attendeeCount?.toLocaleString() || 0} attending</span>
                </div>
              </div>
            </div>

            {/* MC / Host */}
            {hasMC && (
              <div className="py-5 border-t border-[#E2E8F0]">
                <div className="flex items-start gap-4">
                  {event.mc.avatar || event.mc.photo ? (
                    <img
                      src={avatarImage(event.mc.avatar || event.mc.photo, 128)}
                      alt={event.mc.name}
                      loading="lazy"
                      decoding="async"
                      width="48"
                      height="48"
                      className="h-12 w-12 flex-shrink-0 rounded-full object-cover border-2 border-[#F1F5F9]"
                    />
                  ) : (
                    <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full text-white"
                      style={{ backgroundColor: accentColor }}>
                      <Mic2 className="h-5 w-5" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#0F172A]">{event.mc.name}</h3>
                      <span className="rounded-full px-2 py-0.5 text-xs font-semibold text-white"
                        style={{ backgroundColor: accentColor }}>
                        MC / Host
                      </span>
                    </div>
                    {event.mc.bio && <p className="text-sm leading-6 text-[#64748B] mt-1">{event.mc.bio}</p>}
                  </div>
                </div>
              </div>
            )}

            {/* Organizer */}
            <div className="py-5 border-t border-[#E2E8F0]">
              <div className="flex items-start gap-4">
                <CustomAvatar
                  src={event.organizer.avatar}
                  name={event.organizer.name}
                  size="lg"
                  fallbackColor={event.organizer.brandColor}
                />
                <div className="min-w-0 flex-1">
                  <h4 className="font-semibold text-[#0F172A]">{event.organizer.name}</h4>
                  {event.organizer.bio && (
                    <p className="mt-1 text-sm text-[#64748B]">{event.organizer.bio}</p>
                  )}
                  <Link
                    to={`/organizers/${event.organizer.id}`}
                    className="mt-1 inline-flex items-center gap-1 text-sm font-medium hover:underline"
                    style={{ color: themeColor }}
                  >
                    View profile <ChevronRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>

            {/* Tags */}
            {event.tags?.length > 0 && (
              <div className="py-4 border-t border-[#E2E8F0]">
                <div className="flex flex-wrap gap-2">
                  {event.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="rounded-full border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#64748B]"
                    >
                      # {typeof tag === 'object' ? tag.name : (tag || '')}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* ── SPEAKERS ── */}
            {hasSpeakers && (
              <div className="py-6 border-t border-[#E2E8F0]">
                <h2 className="text-lg font-bold text-[#0F172A] mb-4">
                  Presenters ({speakers.length || speakersCount || 0})
                </h2>
                {isLoadingSpeakers ? (
                  <div className="py-6 text-sm text-[#64748B]">Loading speakers…</div>
                ) : speakers.length > 0 ? (
                  <SpeakersGrid speakers={speakers} themeColor={themeColor} />
                ) : (
                  <p className="text-sm text-[#64748B]">No speakers listed yet.</p>
                )}
              </div>
            )}

            {/* ── SCHEDULE ── */}
            {hasSchedule && (
              <div className="py-6 border-t border-[#E2E8F0]">
                <h2 className="text-lg font-bold text-[#0F172A] mb-4">
                  Schedule
                </h2>
                {isLoadingSchedule ? (
                  <div className="py-6 text-sm text-[#64748B]">Loading schedule…</div>
                ) : schedule.length > 0 ? (
                  <ScheduleTimeline schedule={schedule} themeColor={themeColor} />
                ) : (
                  <p className="text-sm text-[#64748B]">No schedule published yet.</p>
                )}
              </div>
            )}

            {/* ── SPONSORS ── */}
            {hasSponsors && (
              <div className="py-6 border-t border-[#E2E8F0]">
                <h2 className="text-lg font-bold text-[#0F172A] mb-4">
                  Sponsors
                </h2>
                {isLoadingSponsors ? (
                  <div className="py-6 text-sm text-[#64748B]">Loading sponsors…</div>
                ) : sponsors.length > 0 ? (
                  <SponsorsGrid sponsors={sponsors} themeColor={themeColor} />
                ) : (
                  <p className="text-sm text-[#64748B]">No sponsors listed yet.</p>
                )}
              </div>
            )}

            {/* Related Events */}
            {relatedEvents.length > 0 && (
              <div className="py-6 border-t border-[#E2E8F0]">
                <h2 className="text-lg font-bold text-[#0F172A] mb-4">You Might Also Like</h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  {relatedEvents.slice(0, 3).map((e, i) => (
                    <EventCard key={e.id} event={e} index={i} />
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* ── RIGHT SIDEBAR — Ticket (sticky, desktop only) ── */}
          <aside className="hidden lg:block w-[360px] flex-shrink-0">
            <div className="sticky top-[5.5rem]">
              <div className="flex items-center justify-between px-4 py-2.5 rounded-t-xl text-sm font-medium text-white"
                style={{ background: `linear-gradient(135deg, ${themeColor}, ${accentColor})` }}>
                <div className="flex items-center gap-2">
                  <Ticket className="w-4 h-4" />
                  <span>{event.isFree ? 'Free Event' : `From KES ${event.price?.toLocaleString()}`}</span>
                </div>
                <div className="flex items-center gap-1 text-white/80">
                  <Users className="w-3 h-3" />
                  <span className="text-xs">{event.attendeeCount?.toLocaleString()} going</span>
                </div>
              </div>
              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto scrollbar-thin scrollbar-thumb-[#E2E8F0] scrollbar-track-transparent">
                <TicketBox event={event} onGetTickets={handleGetTickets} themeColor={themeColor} />
              </div>
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Sticky Ticket Bar */}
      <StickyMobileBar
        event={event}
        onGetTickets={handleGetTickets}
        themeColor={themeColor}
      />
    </PageWrapper>
  );
};

export default EventDetailPage;
