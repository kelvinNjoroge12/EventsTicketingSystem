import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  MapPin,
  Calendar,
  ArrowRight,
  ChevronDown,
  Users,
  CalendarDays,
  Building2,
  MapPinned,
  CheckCircle
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import EventCard from '../components/cards/EventCard';
import CategoryPill from '../components/cards/CategoryPill';
import CustomButton from '../components/ui/CustomButton';
import CustomBadge from '../components/ui/CustomBadge';
import ClassicTicketLoader from '../components/ui/ClassicTicketLoader';
import heroImage from '../assets/strathmore-hero.jpg';
import { fetchEventLite, fetchEvents, preloadRoutes } from '../lib/eventsApi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { categories } from '../data/categories';
import useCountUp from '../hooks/useCountUp';
import { useAuth } from '../context/AuthContext';
import eventQueryKeys from '../lib/eventQueryKeys';

// Statistics Component
const StatBox = ({ value, label, suffix = '' }) => {
  const { count, ref } = useCountUp(parseInt(value.replace(/[^0-9]/g, '')));

  return (
    <motion.div
      ref={ref}
      className="bg-white border border-[#E2E8F0] rounded-lg p-6 text-center"
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
    >
      <p className="text-3xl md:text-4xl font-bold text-[#02338D]">
        {count.toLocaleString()}{suffix}
      </p>
      <p className="text-[#64748B] mt-1">{label}</p>
    </motion.div>
  );
};

// How It Works Step Card
const StepCard = ({ number, title, description, icon: Icon, tint, delay }) => (
  <motion.div
    className="p-6 rounded-2xl"
    style={{ backgroundColor: tint }}
    initial={{ opacity: 0, y: 20 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true }}
    transition={{ duration: 0.5, delay }}
  >
    <div className="w-12 h-12 rounded-xl bg-white/80 flex items-center justify-center mb-4">
      <Icon className="w-6 h-6 text-[#02338D]" />
    </div>
    <div className="w-8 h-8 rounded-full bg-[#02338D] text-white flex items-center justify-center text-sm font-bold mb-3">
      {number}
    </div>
    <h3 className="font-semibold text-[#0F172A] text-lg mb-2">{title}</h3>
    <p className="text-[#64748B] text-sm">{description}</p>
  </motion.div>
);

const HomePage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user, isAuthenticated } = useAuth();
  const [activeCategory, setActiveCategory] = useState('All');
  const [activeTab, setActiveTab] = useState('attendee');
  const [searchData, setSearchData] = useState({ keyword: '', location: '', date: '' });
  const [isSlowLoad, setIsSlowLoad] = useState(false);

  // Instantly redirect organizers/admins to their dashboard instead of showing the public homepage
  useEffect(() => {
    if (isAuthenticated && (user?.role === 'organizer' || user?.role === 'admin')) {
      navigate('/organizer-dashboard', { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  // Refs for the category marquee animation
  const trackRef = useRef(null);
  const progress = useRef(0);
  const lastTime = useRef(performance.now());
  const isCategoryPaused = useRef(false);
  const pauseTimeout = useRef(null);
  const touchStartX = useRef(0);

  const { data: allEventsData, isLoading } = useQuery({
    queryKey: eventQueryKeys.list({ ordering: 'start_date', page_size: 12 }),
    queryFn: () => fetchEvents({ ordering: 'start_date', page_size: 12 })
  });
  const allEvents = allEventsData?.results || [];

  useEffect(() => {
    let timer;
    if (isLoading) {
      timer = setTimeout(() => setIsSlowLoad(true), 4000);
    } else {
      setIsSlowLoad(false);
    }
    return () => clearTimeout(timer);
  }, [isLoading]);

  useEffect(() => {
    if (!allEvents.length) return undefined;
    let cancelled = false;
    let idleId = null;
    let timerId = null;

    const warmTopEventDetails = () => {
      allEvents.slice(0, 4).forEach((event, index) => {
        setTimeout(() => {
          if (cancelled || !event?.slug) return;
          const detailKey = eventQueryKeys.detailLite(event.slug);
          const state = queryClient.getQueryState(detailKey);
          if (state?.dataUpdatedAt && Date.now() - state.dataUpdatedAt < 5 * 60 * 1000) return;
          queryClient.prefetchQuery({
            queryKey: detailKey,
            queryFn: () => fetchEventLite(event.slug),
            staleTime: 5 * 60 * 1000,
          });
        }, index * 120);
      });
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(warmTopEventDetails, { timeout: 1800 });
    } else {
      timerId = setTimeout(warmTopEventDetails, 350);
    }

    return () => {
      cancelled = true;
      if (idleId && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
      if (timerId) clearTimeout(timerId);
    };
  }, [allEvents, queryClient]);

  // Preload React Router JS chunks on mount
  useEffect(() => {
    preloadRoutes();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchData.keyword) params.set('q', searchData.keyword);
    if (searchData.location) params.set('location', searchData.location);
    if (searchData.date) params.set('date', searchData.date);
    navigate(`/search?${params.toString()}`);
  };

  const handleCategoryClick = (categoryName) => {
    setActiveCategory(categoryName);
  };

  const handleBookmarkToggle = (slug, isSaved) => {
    // Bookmark toggle handled in EventCard component
  };

  // Normalizes a category string
  const normalizeCategory = (cat) => (cat || '').toLowerCase().trim();

  // Compute dynamic counts per category
  const categoryCounts = useMemo(() => {
    const counts = {};
    allEvents.forEach((evt) => {
      if (!evt.category) return;
      const key = normalizeCategory(evt.category);
      counts[key] = (counts[key] || 0) + 1;
    });
    return counts;
  }, [allEvents]);

  // Derived filtered events
  const filteredEvents = useMemo(() => {
    if (activeCategory === 'All') {
      return allEvents;
    }
    const normActive = normalizeCategory(activeCategory);
    const fe = allEvents.filter((e) => normalizeCategory(e.category) === normActive);

    if (categoryCounts[normActive] > 0 && fe.length === 0) {
      console.warn('Category mismatch:', activeCategory, 'count', categoryCounts[normActive], 'filtered 0');
    }
    return fe;
  }, [allEvents, activeCategory, categoryCounts]);

  const updateTrackPosition = () => {
    if (!trackRef.current) return;
    const scrollWidth = trackRef.current.scrollWidth;
    const halfWidth = scrollWidth / 2;

    let p = progress.current;
    if (p <= -halfWidth) p += halfWidth;
    else if (p > 0) p -= halfWidth;

    progress.current = p;
    trackRef.current.style.transform = `translateX(${p}px)`;
  };

  const handleCategoryInteract = () => {
    isCategoryPaused.current = true;
    if (pauseTimeout.current) clearTimeout(pauseTimeout.current);
    pauseTimeout.current = setTimeout(() => {
      isCategoryPaused.current = false;
      lastTime.current = performance.now();
    }, 2000); // Resume after inactivity
  };

  useEffect(() => {
    let animationFrameId;
    const speed = 0.06; // Constant horizontal scroll speed

    const loop = (timestamp) => {
      const delta = timestamp - lastTime.current;
      lastTime.current = timestamp;

      if (!isCategoryPaused.current && trackRef.current) {
        progress.current -= speed * delta;
        updateTrackPosition();
      }
      animationFrameId = requestAnimationFrame(loop);
    };

    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, []);

  const handleWheel = (e) => {
    if (Math.abs(e.deltaX) > 0 || Math.abs(e.deltaY) > 0) {
      handleCategoryInteract();
      progress.current -= (e.deltaX || e.deltaY * 0.5); // Allow vertical wheel fallback for horizontal
      updateTrackPosition();
    }
  };

  const handleTouchStart = (e) => {
    handleCategoryInteract();
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchMove = (e) => {
    const touchX = e.touches[0].clientX;
    const deltaX = touchStartX.current - touchX;
    touchStartX.current = touchX;
    progress.current -= deltaX;
    updateTrackPosition();
  };

  return (
    <PageWrapper>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#020617] via-[#0f172a] to-[#1e293b]">
        <div className="absolute inset-0 opacity-25">
          <div
            className="w-full h-full bg-cover bg-center"
            style={{
              backgroundImage: `url(${heroImage})`,
            }}
          />
        </div>

        <motion.div
          className="absolute -right-32 top-10 hidden lg:block w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-[#ef4444] via-[#f97316] to-[#eab308] opacity-60 blur-3xl"
          animate={{ y: [0, -12, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: 'easeInOut' }}
        />

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 md:py-16">
          <div className="max-w-3xl">
            {/* Main Content */}
            <div className="space-y-6">
              <motion.p
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-white/10 text-[#f97316] border border-white/10"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4 }}
              >
                <span className="w-2 h-2 rounded-full bg-[#ef4444]" />
                Strathmore-affiliated events - Alumni - Students and corporate gatherings
              </motion.p>

              <motion.h1
                className="text-3xl md:text-4xl lg:text-5xl font-bold text-white leading-tight"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.12, delayChildren: 0.1 }
                  }
                }}
              >
                {"Celebrate the ".split(" ").map((word, i) => (
                  <motion.span
                    key={i}
                    className="inline-block mr-2"
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
                <motion.span
                  className="inline-block mr-2 text-[#ef4444]"
                  variants={{
                    hidden: { opacity: 0, y: 20 },
                    visible: { opacity: 1, y: 0 }
                  }}
                >
                  Strathmore
                </motion.span>
                {"event experience.".split(" ").map((word, i) => (
                  <motion.span
                    key={i}
                    className="inline-block mr-2 text-white"
                    variants={{
                      hidden: { opacity: 0, y: 20 },
                      visible: { opacity: 1, y: 0 }
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </motion.h1>

              <motion.p
                className="text-sm md:text-base text-slate-200 max-w-xl"
                initial="hidden"
                animate="visible"
                variants={{
                  hidden: { opacity: 0 },
                  visible: {
                    opacity: 1,
                    transition: { staggerChildren: 0.04, delayChildren: 0.4 }
                  }
                }}
              >
                {"Discover alumni reunions, student clubs, and corporate forums organized by Strathmore or in collaboration. Reserve your spot in seconds and keep all your tickets in one place.".split(" ").map((word, i) => (
                  <motion.span
                    key={i}
                    className="inline-block mr-1"
                    variants={{
                      hidden: { opacity: 0, y: 10 },
                      visible: { opacity: 1, y: 0 }
                    }}
                  >
                    {word}
                  </motion.span>
                ))}
              </motion.p>

              <motion.div
                className="flex flex-wrap gap-4"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.3, type: 'spring' }}
              >
                <Link to="/events">
                  <CustomButton variant="primary" size="lg" rightIcon={ArrowRight}>
                    Browse Events
                  </CustomButton>
                </Link>
                <Link to="/create-event">
                  <CustomButton variant="outline" size="lg">
                    Create an Event
                  </CustomButton>
                </Link>
              </motion.div>

              <motion.div
                className="flex items-center gap-4 text-xs md:text-sm text-slate-300"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.4 }}
              >
                <div className="flex -space-x-2">
                  <span className="w-8 h-8 rounded-full bg-[#f97316] border-2 border-white/20" />
                  <span className="w-8 h-8 rounded-full bg-[#22c55e] border-2 border-white/20" />
                  <span className="w-8 h-8 rounded-full bg-[#3b82f6] border-2 border-white/20" />
                </div>
                <span>
                  Join <span className="font-semibold text-[#f97316]">10,000+</span> students, alumni, and corporate guests using the Strathmore University Events Ticketing System.
                </span>
              </motion.div>
            </div>
          </div>
        </div>

        {/* Category Pills (visible on first landing view) */}
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
          <div
            className="bg-white/95 backdrop-blur rounded-2xl border border-white/20 shadow-lg px-4 py-4"
            onWheel={handleWheel}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
          >
            <div
              ref={trackRef}
              className="flex gap-3 w-max"
              style={{ willChange: 'transform' }}
            >
              {/* Duplicate the category list once for a seamless infinite loop */}
              {[...Array(2)].map((_, loopIndex) => (
                <div key={loopIndex} className="flex gap-3 pr-3">
                  <button
                    onClick={() => handleCategoryClick('All')}
                    className={`
                      flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap
                      font-medium text-sm transition-all
                      ${activeCategory === 'All'
                        ? 'bg-[#02338D] text-white shadow-md'
                        : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:border-[#02338D] hover:text-[#02338D]'}
                    `}
                  >
                    <span>All Events</span>
                  </button>
                  {categories.map((category) => (
                    <CategoryPill
                      key={category.id}
                      category={{ ...category, count: categoryCounts[normalizeCategory(category.name)] ?? 0 }}
                      isActive={activeCategory === category.name}
                      onClick={() => handleCategoryClick(category.name)}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Events Grid */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A]">
              Upcoming Events
            </h2>
            <Link
              to="/events"
              className="text-[#02338D] font-medium hover:underline flex items-center gap-1"
            >
              View All
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="min-h-[360px] flex flex-col items-center justify-center space-y-4">
              <ClassicTicketLoader visible overlay={false} ariaLabel="Loading upcoming events" />
              {isSlowLoad && (
                <motion.p 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="text-sm text-[#64748B] text-center max-w-xs"
                >
                  Waking up the servers... 📅<br />
                  <span className="text-xs">(Free tiers may take up to 60s to start)</span>
                </motion.p>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              <AnimatePresence mode="popLayout">
                {filteredEvents.length === 0 ? (
                  <motion.div
                    key="empty-state"
                    layout
                    initial={{ opacity: 0, x: 100 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.4, ease: "easeInOut" }}
                    className="col-span-full py-12 text-center text-[#64748B] bg-[#F8FAFC] rounded-2xl border border-[#E2E8F0]"
                  >
                    <p className="text-lg font-medium">No events found.</p>
                    <p className="text-sm">Try exploring a different category.</p>
                  </motion.div>
                ) : (
                  filteredEvents.map((event) => (
                    <motion.div
                      key={event.id}
                      layout
                      layoutId={String(event.id)}
                      initial={{ opacity: 0, x: 100 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -100 }}
                      transition={{ duration: 0.4, ease: "easeInOut" }}
                    >
                      <EventCard
                        event={event}
                        index={0}
                        onBookmarkToggle={handleBookmarkToggle}
                      />
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          )}
        </div>
      </section>

      {/* Statistics Row */}
      <section className="py-16 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            <StatBox value="10000" label="Students, Alumni & Guests" suffix="+" />
            <StatBox value="2000" label="Events Hosted" suffix="+" />
            <StatBox value="500" label="Schools, Clubs & Associations" suffix="+" />
            <StatBox value="50" label="Corporate Guests" suffix="+" />
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A] mb-4">
              How It Works
            </h2>

            {/* Tabs */}
            <div className="inline-flex p-1 bg-[#F1F5F9] rounded-xl">
              {['attendee', 'organizer'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`
                    px-6 py-2.5 rounded-lg font-medium capitalize transition-all
                    ${activeTab === tab
                      ? 'bg-white text-[#0F172A] shadow-sm'
                      : 'text-[#64748B] hover:text-[#0F172A]'}
                  `}
                >
                  For {tab}s
                </button>
              ))}
            </div>
          </div>

          {/* Steps */}
          <div className="grid md:grid-cols-3 gap-6 relative">
            {/* Connector Line */}
            <div className="hidden md:block absolute top-1/3 left-0 right-0 h-px bg-[#E2E8F0] -z-10" />

            {activeTab === 'attendee' ? (
              <>
                <StepCard
                  number={1}
                  title="Explore Strathmore-Affiliated Events"
                  description="Browse alumni reunions, student activities, and corporate forums. Filter by organizer, date, or venue."
                  icon={Search}
                  tint="#EFF6FF"
                  delay={0}
                />
                <StepCard
                  number={2}
                  title="Reserve Tickets"
                  description="Choose your ticket type, apply any waivers, and complete your reservation securely."
                  icon={CheckCircle}
                  tint="#F5F3FF"
                  delay={0.1}
                />
                <StepCard
                  number={3}
                  title="Attend & Check In"
                  description="Present your QR ticket at the venue entrance and enjoy the event."
                  icon={CalendarDays}
                  tint="#F0FDF4"
                  delay={0.2}
                />
              </>
            ) : (
              <>
                <StepCard
                  number={1}
                  title="Create Your Event"
                  description="Publish event details, add ticket types, and customize your registration page."
                  icon={Calendar}
                  tint="#EFF6FF"
                  delay={0}
                />
                <StepCard
                  number={2}
                  title="Promote & Invite"
                  description="Share the event with students, staff, and alumni using official channels."
                  icon={Users}
                  tint="#F5F3FF"
                  delay={0.1}
                />
                <StepCard
                  number={3}
                  title="Manage Attendance"
                  description="Track registrations, check in guests, and review attendance insights."
                  icon={Building2}
                  tint="#F0FDF4"
                  delay={0.2}
                />
              </>
            )}
          </div>
        </div>
      </section>

      {/* CTA Block */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            className="bg-[#02338D] rounded-3xl p-8 md:p-16 text-center relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            {/* Background Pattern */}
            <div className="absolute inset-0 opacity-10">
              <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                <pattern id="cta-pattern" patternUnits="userSpaceOnUse" width="20" height="20">
                  <circle cx="10" cy="10" r="2" fill="white" />
                </pattern>
                <rect width="100" height="100" fill="url(#cta-pattern)" />
              </svg>
            </div>

            <div className="relative z-10">
              <h2 className="text-3xl md:text-4xl font-bold text-white mb-4">
                Ready to Host a Strathmore-Affiliated Event?
              </h2>
              <p className="text-white/80 text-lg mb-8 max-w-xl mx-auto">
                Support your school, alumni chapter, or corporate-sponsored event with official ticketing and check-in tools.
              </p>
              <Link to="/create-event">
                <motion.div
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <CustomButton
                    variant="outline"
                    size="lg"
                    className="border-white text-white hover:bg-white hover:text-[#02338D]"
                  >
                    Create Your Event
                  </CustomButton>
                </motion.div>
              </Link>
            </div>
          </motion.div>
        </div>
      </section>
    </PageWrapper>
  );
};

export default HomePage;
