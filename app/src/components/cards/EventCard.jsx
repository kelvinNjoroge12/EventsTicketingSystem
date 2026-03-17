import React, { memo } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  MapPin,
  Users,
  ArrowRight,
  Bookmark,
  BookmarkCheck
} from 'lucide-react';
import useSavedEvents from '../../hooks/useSavedEvents';
import { fetchEventLite } from '../../lib/eventsApi';
import { useQueryClient } from '@tanstack/react-query';
import eventQueryKeys from '../../lib/eventQueryKeys';
import CustomAvatar from '../ui/CustomAvatar';
import CustomBadge from '../ui/CustomBadge';
import ProgressiveImage from '../ui/ProgressiveImage';
import { cardImage, cardSrcSet } from '../../lib/imageUtils';

const PREFETCH_THROTTLE_MS = 12000;
const prefetchRegistry = new Map();

const cardTints = [
  '#EFF6FF', // blue
  '#F5F3FF', // purple
  '#F0FDF4', // green
  '#FFFBEB', // amber
  '#FFF1F2', // rose
];

const EventCard = ({
  event,
  showBookmark = true,
  onBookmarkToggle,
}) => {
  const { isSaved, toggleSave } = useSavedEvents();
  const saved = isSaved({ id: event.id, slug: event.slug });

  // Use event's own theme colors for consistency with detail page
  const themeColor = event.themeColor || '#02338D';
  const accentColor = event.accentColor || '#7C3AED';

  const handleBookmark = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleSave({ id: event.id, slug: event.slug });
    if (onBookmarkToggle) {
      onBookmarkToggle(event.slug, !saved);
    }
  };

  const queryClient = useQueryClient();

  const handlePrefetch = () => {
    if (!event?.slug) return;

    const queryKey = eventQueryKeys.detailLite(event.slug);
    const state = queryClient.getQueryState(queryKey);
    const now = Date.now();
    const recentlyPrefetchedAt = prefetchRegistry.get(event.slug) || 0;

    if (state?.dataUpdatedAt && now - state.dataUpdatedAt < 5 * 60 * 1000) return;
    if (now - recentlyPrefetchedAt < PREFETCH_THROTTLE_MS) return;

    prefetchRegistry.set(event.slug, now);
    queryClient.prefetchQuery({
      queryKey,
      queryFn: () => fetchEventLite(event.slug),
      staleTime: 5 * 60 * 1000,
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getBadge = () => {
    if (event.isAlmostSoldOut) {
      return { text: 'Almost Sold Out', variant: 'error' };
    }
    if (event.isFree) {
      return { text: 'Free Entry', variant: 'success' };
    }
    return { text: `KES ${event.price.toLocaleString()}`, variant: 'primary' };
  };

  const badge = getBadge();

  return (
    <Link
      to={`/events/${event.slug}`}
      className="block h-full group"
      onMouseEnter={handlePrefetch}
      onFocus={handlePrefetch}
      onTouchStart={handlePrefetch}
    >
      <motion.article
        className="relative h-[320px] md:h-[380px] rounded-2xl md:rounded-3xl overflow-hidden border border-white/10 shadow-xl flex flex-col justify-end transition-all duration-500"
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        whileHover={{
          y: -8,
          boxShadow: `0 20px 40px -10px rgba(0,0,0,0.3), 0 0 20px ${themeColor}40`,
          borderColor: `${themeColor}60`
        }}
      >
        {/* Background Image/Gradient */}
        <div className="absolute inset-0 z-0">
          {event.coverImage ? (
            <ProgressiveImage
              src={cardImage(event.coverImage)}
              srcSet={cardSrcSet(event.coverImage)}
              sizes="(max-width: 640px) 100vw, (max-width: 1280px) 50vw, 33vw"
              alt={event.title}
              loading="lazy"
              placeholderColor={themeColor}
              accentColor={accentColor}
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700"
              style={{ position: 'absolute', inset: 0 }}
            />
          ) : (
            <div
              className="w-full h-full"
              style={{ background: `linear-gradient(135deg, ${themeColor}, ${accentColor})` }}
            />
          )}
          {/* Overlays to match EventDetailPage feel */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 transition-opacity duration-300 group-hover:via-black/50" />
          <div className="absolute inset-0 bg-gradient-to-r from-black/20 to-transparent" />
        </div>

        {/* Top Badges */}
        <div className="absolute top-2.5 md:top-4 left-2.5 md:left-4 right-2.5 md:right-4 flex justify-between items-start z-10">
          {showBookmark && (
            <button
              onClick={handleBookmark}
              className={`
                p-1.5 md:p-2 rounded-full backdrop-blur-md border transition-all duration-300
                ${saved
                  ? `bg-white text-[${themeColor}] border-white`
                  : 'bg-black/20 text-white border-white/20 hover:bg-white hover:text-black'}
              `}
              style={saved ? { color: themeColor } : {}}
              aria-label={saved ? 'Remove from saved' : 'Save event'}
            >
              <motion.div
                whileTap={{ scale: 0.9 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                {saved ? <BookmarkCheck className="w-4 h-4 md:w-5 md:h-5" /> : <Bookmark className="w-4 h-4 md:w-5 md:h-5" />}
              </motion.div>
            </button>
          )}

          <div className="px-2 py-1 md:px-3 md:py-1.5 rounded-full backdrop-blur-md bg-white/10 border border-white/20 text-white text-[10px] md:text-xs font-bold uppercase tracking-wider">
            {event.category}
          </div>
        </div>

        {/* Content Overlay */}
        <div className="relative z-10 p-3 md:p-6 space-y-2 md:space-y-3">
          {/* Price/Status Badge */}
          <div className="flex items-center gap-1.5 md:gap-2">
            <span
              className={`px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-bold text-white uppercase tracking-tighter`}
              style={{ backgroundColor: badge.variant === 'error' ? '#EF4444' : badge.variant === 'success' ? '#22C55E' : themeColor }}
            >
              {badge.text}
            </span>
            {event.isFeatured && (
              <span className="px-1.5 py-0.5 rounded text-[8px] md:text-[10px] font-bold bg-amber-400 text-amber-950 uppercase tracking-tighter">
                Featured
              </span>
            )}
          </div>

          <h3 className="text-sm md:text-xl font-bold text-white leading-tight line-clamp-2 min-h-[2.5rem] md:min-h-[3rem] group-hover:text-blue-300 transition-colors">
            {event.title}
          </h3>

          <div className="flex flex-col gap-1 md:gap-2">
            <div className="flex items-center gap-1.5 md:gap-2 text-white/80 text-[10px] md:text-xs font-medium">
              <Calendar className="w-3 h-3 md:w-3.5 md:h-3.5" />
              <span>{formatDate(event.date)} • {event.time}</span>
            </div>
            <div className="flex items-center gap-1.5 md:gap-2 text-white/80 text-[10px] md:text-xs font-medium">
              <MapPin className="w-3 h-3 md:w-3.5 md:h-3.5" />
              <span className="truncate">{event.location}</span>
            </div>
          </div>

          {/* Footer Card */}
          <div className="pt-2 md:pt-4 flex items-center justify-between border-t border-white/10">
            <div className="flex items-center gap-1.5 md:gap-2">
              <CustomAvatar
                src={event.organizer.avatar}
                name={event.organizer.name}
                size="xs"
                fallbackColor={event.organizer.brandColor}
                className="border border-white/20"
              />
              <span className="text-[8px] md:text-[10px] font-semibold text-white/90 truncate max-w-[50px] md:max-w-[80px]">
                {event.organizer.name}
              </span>
            </div>

            <div className="flex items-center gap-1 text-[8px] md:text-[10px] font-bold text-white/70">
              <Users className="w-2.5 h-2.5 md:w-3 md:h-3" />
              <span>{event.attendeeCount >= 1000 ? `${(event.attendeeCount / 1000).toFixed(1)}k` : event.attendeeCount} GOING</span>
            </div>
          </div>
        </div>
      </motion.article>
    </Link>
  );
};

export default memo(EventCard);

