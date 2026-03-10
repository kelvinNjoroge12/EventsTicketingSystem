import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar, MapPin, Clock, Globe, Share2, Bookmark, BookmarkCheck,
  ChevronRight, Users, Check, MessageCircle, Twitter, Linkedin,
  Facebook, Ticket, Mic2, Building2, ExternalLink, Zap
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import TicketBox from '../components/event/TicketBox';
import StickyMobileBar from '../components/event/StickyMobileBar';
import EventCard from '../components/cards/EventCard';
import CustomAvatar from '../components/ui/CustomAvatar';
import ProgressiveImage from '../components/ui/ProgressiveImage';
import ClassicTicketLoader from '../components/ui/ClassicTicketLoader';
import { buildEventDetailPlaceholderFromList, fetchEvent, fetchRelatedEvents, trackEventView } from '../lib/eventsApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCart } from '../context/CartContext';
import useSavedEvents from '../hooks/useSavedEvents';
import { heroImage, heroSrcSet, avatarImage, logoImage } from '../lib/imageUtils';
import eventQueryKeys from '../lib/eventQueryKeys';

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
        {/* Connector line */}
        {index < schedule.length - 1 && (
          <div className="absolute left-[19px] top-10 w-0.5 h-full" style={{ backgroundColor: `${themeColor}30` }} />
        )}
        {/* Dot */}
        <div className="flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center bg-white z-10"
          style={{ borderColor: themeColor }}>
          <Clock className="w-4 h-4" style={{ color: themeColor }} />
        </div>
        <div className="pb-8 flex-1 min-w-0">
          <p className="text-sm font-semibold mb-0.5 break-words" style={{ color: themeColor }}>{item.time}</p>
          <h4 className="font-semibold text-[#0F172A] mb-1 break-words">{item.title}</h4>
          {item.speaker && <p className="text-sm text-[#64748B] mb-1 break-words">🎤 {item.speaker}</p>}
          {item.description && <p className="text-sm text-[#64748B] break-words">{item.description}</p>}
        </div>
      </motion.div>
    ))}
  </div>
);

// ── Speakers Grid ──────────────────────────────────────────────────────────
const SpeakersGrid = ({ speakers, themeColor }) => (
  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
    {speakers.map((speaker, i) => (
      <motion.div
        key={i}
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: i * 0.08 }}
        whileHover={{ y: -4 }}
        className="bg-white rounded-2xl border border-[#E2E8F0] p-5 flex flex-col items-center text-center hover:shadow-lg hover:border-blue-100 transition-all min-w-0"
      >
        {speaker.photo || speaker.avatar ? (
          <img
            src={avatarImage(speaker.photo || speaker.avatar, 160)}
            alt={speaker.name}
            loading="lazy"
            decoding="async"
            width="80"
            height="80"
            className="w-20 h-20 rounded-full object-cover mb-3 border-4 border-white shadow-md" />
        ) : (
          <div className="w-20 h-20 rounded-full mb-3 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md"
            style={{ background: `linear-gradient(135deg, ${themeColor}, ${themeColor}99)` }}>
            {speaker.name?.charAt(0) || '?'}
          </div>
        )}
        <h4 className="font-semibold text-[#0F172A] mb-0.5 break-words w-full">{speaker.name}</h4>
        {speaker.title && <p className="text-sm font-medium mb-0.5 break-words w-full" style={{ color: themeColor }}>{speaker.title}</p>}
        {speaker.organization && <p className="text-xs text-[#94A3B8] break-words w-full">{speaker.organization}</p>}
        {speaker.bio && <p className="text-xs text-[#64748B] mt-2 line-clamp-3 break-words w-full">{speaker.bio}</p>}
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

  return (
    <div className="space-y-8 w-full overflow-hidden">
      {Object.entries(byTier).map(([tier, items]) => (
        <div key={tier} className="w-full">
          <div className={`inline-flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-semibold mb-4 max-w-full ${tierStyles[tier]}`}>
            <Building2 className="w-4 h-4 flex-shrink-0" />
            <span className="truncate">{tier} Sponsor{items.length > 1 ? 's' : ''}</span>
          </div>
          <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
            {items.map((sponsor, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} viewport={{ once: true }} transition={{ delay: i * 0.08 }}>
                {sponsor.website ? (
                  <a href={sponsor.website} target="_blank" rel="noopener noreferrer"
                    className="bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0] p-3 sm:p-5 flex flex-col items-center justify-center gap-2 hover:shadow-md hover:border-blue-100 transition-all group min-h-[100px] min-w-0 w-full overflow-hidden">
                    {sponsor.logo ? (
                      <img src={logoImage(sponsor.logo)} alt={sponsor.name} loading="lazy" decoding="async" className="h-10 max-w-full object-contain" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-lg"
                        style={{ backgroundColor: themeColor }}>{sponsor.name?.charAt(0)}</div>
                    )}
                    <div className="flex items-center justify-center gap-1 text-xs text-[#94A3B8] group-hover:text-[#1E4DB7] w-full mt-2">
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { addToCart, addMultipleToCart } = useCart();
  const { isSaved, toggleSave } = useSavedEvents();
  const [activeTab, setActiveTab] = useState('overview');
  const [showSharePopover, setShowSharePopover] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [navOffset, setNavOffset] = useState(64);

  const contentStartRef = useRef(null);
  const tabBarRef = useRef(null);

  const getNavHeight = () => {
    const header = document.querySelector('header');
    return header?.getBoundingClientRect().height || 64;
  };

  const getTabHeight = () =>
    tabBarRef.current?.getBoundingClientRect().height || 52;

  const scrollTabBarIntoView = (behavior = 'smooth') => {
    const bar = tabBarRef.current;
    if (!bar) return;
    const navHeight = getNavHeight();
    const top = bar.getBoundingClientRect().top;
    const y = top + window.scrollY - (navHeight + 8);
    window.scrollTo({ top: y, behavior });
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Crucial fix: Wait 250ms for Framer Motion's AnimatePresence exit transition (0.2s) 
    // to complete, AND for the new tab to mount so the document height stabilizes.
    // If we scroll mid-animation, the document height collapse breaks the smooth scroll
    // and hides the new headings behind the sticky tab bar.
    setTimeout(() => {
      scrollTabBarIntoView('smooth');
    }, 250);
  };

  useEffect(() => {
    const updateNavOffset = () => setNavOffset(getNavHeight());
    updateNavOffset();
    window.addEventListener('resize', updateNavOffset);
    return () => window.removeEventListener('resize', updateNavOffset);
  }, []);

  // 1. Main event — served from hover-prefetch cache instantly on revisit
  useEffect(() => {
    // Fire analytics outside query so it never delays the data fetch
    if (slug) trackEventView(slug);
  }, [slug]);

  const detailQueryKey = eventQueryKeys.detail(slug);
  const listCaches = queryClient.getQueriesData({ queryKey: eventQueryKeys.lists() });
  const placeholderEventFromList = listCaches
    .map(([, cached]) => (Array.isArray(cached) ? cached.find((item) => item?.slug === slug) : null))
    .find(Boolean);
  const detailAlreadyCached = Boolean(queryClient.getQueryData(detailQueryKey));

  const { data: baseEvent, isLoading, isFetching, isPlaceholderData } = useQuery({
    queryKey: detailQueryKey,
    queryFn: () => fetchEvent(slug),
    staleTime: 5 * 60 * 1000, // 5 min — serve from cache on tab switch / back-navigation
    retry: false,
    placeholderData: () => buildEventDetailPlaceholderFromList(placeholderEventFromList),
  });


  // 2. Related events — low-priority background fetch
  const { data: relatedEvents = [] } = useQuery({
    queryKey: eventQueryKeys.related(slug),
    queryFn: () => fetchRelatedEvents(slug),
    enabled: !!slug,
    staleTime: 10 * 60 * 1000, // 10 min — rarely changes
  });

  // Speakers + schedule are now embedded in the main event response.
  // No secondary API calls needed — just use baseEvent directly.
  const event = baseEvent ?? null;

  // Handle Tickets

  const handleGetTickets = (ticketData) => {
    addMultipleToCart(
      event.slug,
      event.title,
      event.themeColor,
      event.accentColor,
      ticketData.items
    );
    navigate(`/checkout/${event.slug}`);
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = `Check out ${event.title} on EventHub!`;
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
          <Link to="/events" className="px-6 py-3 bg-[#1E4DB7] text-white rounded-xl font-medium hover:bg-[#1a42a0] transition-colors">Browse Events</Link>
        </div>
      </PageWrapper>
    );
  }

  const saved = isSaved(event.slug);
  const themeColor = event.themeColor || '#1E4DB7';
  const accentColor = event.accentColor || '#7C3AED';
  const hasSpeakers = event.speakers?.length > 0;
  const hasSchedule = event.schedule?.length > 0;
  const hasSponsors = event.sponsors?.length > 0;
  const hasMC = event.mc?.name;
  const showClassicLoader = !detailAlreadyCached && (isPlaceholderData || (isFetching && isLoading));

  const tabs = [
    { id: 'overview', label: 'Overview', icon: <Zap className="w-4 h-4" /> },
    ...(hasSpeakers ? [{ id: 'speakers', label: 'Speakers', icon: <Users className="w-4 h-4" /> }] : []),
    ...(hasSchedule ? [{ id: 'schedule', label: 'Schedule', icon: <Clock className="w-4 h-4" /> }] : []),
    ...(hasSponsors ? [{ id: 'sponsors', label: 'Sponsors', icon: <Building2 className="w-4 h-4" /> }] : []),
  ];

  return (
    <PageWrapper>
      <ClassicTicketLoader visible={showClassicLoader} />
      {/* ── HERO SECTION ── */}
      <div className="relative w-full h-[320px] md:h-[480px]" style={{ overflow: 'hidden' }}>
        {/* Background — proper <img> for LCP priority, falls back to gradient */}
        {event.bannerImage ? (
          <img
            src={heroImage(event.bannerImage)}
            srcSet={heroSrcSet(event.bannerImage)}
            sizes="100vw"
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

        {/* Decorative pattern only when no image */}
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

        {/* Multi-layer gradient for readability */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

        {/* Content */}
        <div className="absolute inset-0 flex flex-col justify-end">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 w-full">
            {/* Breadcrumb */}
            <nav className="flex flex-wrap items-center gap-1 sm:gap-2 text-white/70 text-[10px] sm:text-xs mb-4">
              <Link to="/" className="hover:text-white transition-colors">Home</Link>
              <ChevronRight className="w-3 h-3" />
              <Link to="/events" className="hover:text-white transition-colors">Events</Link>
              <ChevronRight className="w-3 h-3" />
              <span className="text-white/90 truncate max-w-[200px]">{event.title}</span>
            </nav>

            {/* Category + Format badge */}
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: `${themeColor}CC` }}>
                {event.category}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-white/20 backdrop-blur-sm text-white">
                {event.format === 'in_person' ? '📍 In-Person' : event.format === 'online' ? '💻 Online' : '🔀 Hybrid'}
              </span>
              {event.isFeatured && (
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-amber-400 text-amber-900">⭐ Featured</span>
              )}
            </div>

            {/* Title */}
            <motion.h1
              className="text-2xl sm:text-3xl md:text-5xl font-bold text-white mb-4 max-w-full sm:max-w-3xl leading-tight break-words"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              {event.title}
            </motion.h1>

            {/* Meta row */}
            <motion.div
              className="flex flex-wrap items-center gap-4 text-white/90 text-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4" />
                <span>{formatDate(event.date)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4" />
                <span>{event.time}{event.endTime ? ` – ${event.endTime}` : ''}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{typeof event.location === 'object' ? event.location.name : (event.location || 'Online')}</span>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4" />
                <span>{event.attendeeCount?.toLocaleString() || 0} attending</span>
              </div>
            </motion.div>
          </div>
        </div>

        {/* Action Buttons (top right) */}
        <div className="absolute top-4 right-4 flex items-center gap-2">
          {/* Share */}
          <div className="relative">
            <button onClick={() => setShowSharePopover(!showSharePopover)}
              className="p-2.5 rounded-full bg-white/20 backdrop-blur-sm text-white hover:bg-white/35 transition-colors border border-white/20"
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

          {/* Bookmark */}
          <button onClick={() => toggleSave(event.slug)}
            className={`p-2.5 rounded-full backdrop-blur-sm border transition-all ${saved ? 'bg-[#1E4DB7] border-[#1E4DB7] text-white' : 'bg-white/20 border-white/20 text-white hover:bg-white/35'}`}
            aria-label={saved ? 'Remove from saved' : 'Save event'}>
            {saved ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT ── */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 w-full" style={{ overflowX: 'hidden' }}>
        <div className="grid lg:grid-cols-3 gap-10">

          {/* Left Column */}
          <div className="lg:col-span-2 space-y-10 min-w-0 overflow-hidden" ref={contentStartRef}>

            {/* ── TABS ── */}
            <div
              ref={tabBarRef}
              className="sticky z-10 bg-white/95 backdrop-blur-sm border-b border-[#E2E8F0] w-full min-w-0"
              style={{ top: navOffset }}
            >
              <div className="flex gap-1 overflow-x-auto hide-scrollbar w-full flex-nowrap -mx-4 px-4 sm:mx-0 sm:px-0">
                {tabs.map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={`relative flex-shrink-0 flex items-center gap-2 px-4 py-3.5 text-sm font-medium whitespace-nowrap transition-colors ${activeTab === tab.id ? 'text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'}`}
                  >
                    {tab.icon}
                    {tab.label}
                    {activeTab === tab.id && (
                      <motion.div layoutId="eventTab"
                        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full"
                        style={{ backgroundColor: themeColor }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                      />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* ── TAB CONTENT ── */}
            <div className="min-h-[50vh] pt-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                >
                  {/* OVERVIEW */}
                  {activeTab === 'overview' && (
                    <div className="space-y-10">
                      {/* Description */}
                      <section>
                        <h2 className="text-xl font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                          <span className="w-1 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                          About This Event
                        </h2>
                        <div className="prose prose-slate max-w-full w-full break-words overflow-hidden">
                          {event.description
                            ? event.description.split('\n\n').map((para, i) => (
                              <p key={i} className="text-[#475569] leading-relaxed mb-4 whitespace-normal break-words sm:break-normal" style={{ wordBreak: 'break-word' }}>{para}</p>
                            ))
                            : <p className="text-[#64748B]">No description provided.</p>
                          }
                        </div>
                      </section>

                      {/* MC Card (inline on overview) */}
                      {hasMC && (
                        <section>
                          <h2 className="text-xl font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                            <span className="w-1 h-6 rounded-full" style={{ backgroundColor: accentColor }} />
                            MC / Host
                          </h2>
                          <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="flex items-start gap-3 sm:gap-5 p-4 sm:p-5 rounded-2xl border"
                            style={{ borderColor: `${accentColor}40`, background: `${accentColor}08` }}
                          >
                            {event.mc.avatar || event.mc.photo ? (
                              <img src={avatarImage(event.mc.avatar || event.mc.photo, 128)}
                                alt={event.mc.name}
                                loading="lazy"
                                decoding="async"
                                width="64"
                                height="64"
                                className="w-16 h-16 rounded-full object-cover border-4 border-white shadow-md flex-shrink-0" />
                            ) : (
                              <div className="w-16 h-16 rounded-full flex items-center justify-center text-white text-xl font-bold border-4 border-white shadow-md flex-shrink-0"
                                style={{ backgroundColor: accentColor }}>
                                <Mic2 className="w-7 h-7" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h4 className="font-bold text-[#0F172A]">{event.mc.name}</h4>
                                <span className="px-2 py-0.5 rounded-full text-xs font-semibold text-white" style={{ backgroundColor: accentColor }}>
                                  MC / Host
                                </span>
                              </div>
                              {event.mc.bio && <p className="text-sm text-[#64748B]">{event.mc.bio}</p>}
                            </div>
                          </motion.div>
                        </section>
                      )}

                      {/* Event Details Card */}
                      <section>
                        <h2 className="text-xl font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                          <span className="w-1 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                          Event Details
                        </h2>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          {[
                            { icon: <Calendar className="w-5 h-5" />, label: 'Date', value: formatDate(event.date) },
                            { icon: <Clock className="w-5 h-5" />, label: 'Time', value: `${event.time}${event.endTime ? ` – ${event.endTime}` : ''}` },
                            { icon: <Globe className="w-5 h-5" />, label: 'Timezone', value: event.timezone },
                            { icon: <MapPin className="w-5 h-5" />, label: 'Format', value: event.format },
                          ].map(({ icon, label, value }) => (
                            <div key={label} className="flex items-start gap-4 p-4 bg-[#F8FAFC] rounded-xl border border-[#E2E8F0]">
                              <div className="p-2 rounded-lg text-white flex-shrink-0" style={{ backgroundColor: themeColor }}>
                                {icon}
                              </div>
                              <div>
                                <p className="text-xs text-[#94A3B8] mb-0.5">{label}</p>
                                <p className="font-semibold text-[#0F172A] text-sm break-words">{value}</p>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Tags */}
                        {event.tags?.length > 0 && (
                          <div className="mt-4 flex flex-wrap gap-2">
                            {event.tags.map((tag, i) => (
                              <span key={i} className="px-3 py-1.5 bg-white rounded-full text-sm font-medium border border-[#E2E8F0] text-[#64748B] hover:border-blue-200 transition-colors">
                                # {typeof tag === 'object' ? tag.name : (tag || '')}
                              </span>
                            ))}
                          </div>
                        )}
                      </section>

                      {/* Location Section */}
                      <section>
                        <h2 className="text-xl font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                          <span className="w-1 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                          Location
                        </h2>
                        <div className="bg-[#F1F5F9] rounded-2xl h-56 flex items-center justify-center border border-[#E2E8F0] relative overflow-hidden">
                          <div className="absolute inset-0" style={{ background: `${themeColor}08` }} />
                          <div className="text-center relative">
                            <div className="w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-white" style={{ backgroundColor: themeColor }}>
                              <MapPin className="w-8 h-8" />
                            </div>
                            <p className="font-semibold text-[#0F172A]">{typeof event.location === 'object' ? event.location.name : (event.location || 'Online Event')}</p>
                          </div>
                        </div>
                      </section>

                      {/* Organizer */}
                      <section>
                        <h2 className="text-xl font-bold text-[#0F172A] mb-4 flex items-center gap-2">
                          <span className="w-1 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                          Organized By
                        </h2>
                        <div className="flex items-start gap-3 sm:gap-5 p-4 sm:p-5 bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]">
                          <CustomAvatar src={event.organizer.avatar} name={event.organizer.name} size="lg" fallbackColor={event.organizer.brandColor} />
                          <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-[#0F172A] text-lg">{event.organizer.name}</h4>
                            {event.organizer.bio && (
                              <p className="text-sm text-[#64748B] mt-1 line-clamp-2">{event.organizer.bio}</p>
                            )}
                            <Link to={`/organizers/${event.organizer.id}`}
                              className="inline-flex items-center gap-1 text-sm font-medium mt-2 hover:underline"
                              style={{ color: themeColor }}>
                              View Profile <ChevronRight className="w-4 h-4" />
                            </Link>
                          </div>
                        </div>
                      </section>
                    </div>
                  )}

                  {/* SPEAKERS */}
                  {activeTab === 'speakers' && hasSpeakers && (
                    <section>
                      <h2 className="text-xl font-bold text-[#0F172A] mb-6 flex items-center gap-2">
                        <span className="w-1 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                        Featured Speakers
                      </h2>
                      <SpeakersGrid speakers={event.speakers} themeColor={themeColor} />
                    </section>
                  )}

                  {/* SCHEDULE */}
                  {activeTab === 'schedule' && hasSchedule && (
                    <section>
                      <h2 className="text-xl font-bold text-[#0F172A] mb-6 flex items-center gap-2">
                        <span className="w-1 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                        Event Schedule
                      </h2>
                      <ScheduleTimeline schedule={event.schedule} themeColor={themeColor} />
                    </section>
                  )}

                  {/* SPONSORS */}
                  {activeTab === 'sponsors' && hasSponsors && (
                    <section>
                      <h2 className="text-xl font-bold text-[#0F172A] mb-6 flex items-center gap-2">
                        <span className="w-1 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                        Our Sponsors
                      </h2>
                      <SponsorsGrid sponsors={event.sponsors} themeColor={themeColor} />
                    </section>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Mobile Ticket Section */}
            <div className="lg:hidden pt-4 border-t border-[#E2E8F0]" id="tickets-section">
              <h2 className="text-xl font-bold text-[#0F172A] mb-6 flex items-center gap-2">
                <span className="w-1 h-6 rounded-full" style={{ backgroundColor: themeColor }} />
                Get Your Tickets
              </h2>
              <TicketBox event={event} onGetTickets={handleGetTickets} themeColor={themeColor} />
            </div>

            {/* Related Events */}
            {relatedEvents.length > 0 && (
              <section className="pt-4 border-t border-[#E2E8F0]">
                <h2 className="text-xl font-bold text-[#0F172A] mb-6">You Might Also Like</h2>
                <div className="grid sm:grid-cols-2 gap-5">
                  {relatedEvents.slice(0, 3).map((e, i) => (
                    <EventCard key={e.id} event={e} index={i} />
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* ── RIGHT SIDEBAR ── */}
          <aside className="hidden lg:block">
            <div className="sticky top-24 max-h-[90vh] overflow-y-auto pr-1 space-y-4 scrollbar-thin scrollbar-thumb-[#E2E8F0] scrollbar-track-transparent">
              {/* Ticket price preview pill */}
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm font-medium text-white shadow-lg"
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
              <TicketBox event={event} onGetTickets={handleGetTickets} themeColor={themeColor} />
            </div>
          </aside>
        </div>
      </div>

      {/* Mobile Sticky Bar */}
      <StickyMobileBar
        event={event}
        onGetTickets={() => {
          document.getElementById('tickets-section')?.scrollIntoView({ behavior: 'smooth' });
        }}
        themeColor={themeColor}
      />
    </PageWrapper >
  );
};

export default EventDetailPage;
