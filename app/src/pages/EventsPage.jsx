import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  List,
  MapPin,
  CalendarDays,
  Tag,
  MonitorPlay,
  Search,
  SlidersHorizontal,
} from 'lucide-react';
import { format } from 'date-fns';
import PageWrapper from '../components/layout/PageWrapper';
import EventCard from '../components/cards/EventCard';
import CustomButton from '../components/ui/CustomButton';
import ClassicTicketLoader from '../components/ui/ClassicTicketLoader';
import { fetchEventLite, fetchEvents } from '../lib/eventsApi';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { categories } from '../data/categories';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';
import eventQueryKeys from '../lib/eventQueryKeys';

// Define filter cards styling statically 
const filterCards = [
  { id: 'category', title: 'Category', icon: List, hoverClass: 'group-hover:text-[#1E4DB7]' },
  { id: 'location', title: 'Location', icon: MapPin, hoverClass: 'group-hover:text-[#EF4444]' },
  { id: 'date', title: 'Date Range', icon: CalendarDays, hoverClass: 'group-hover:text-[#22C55E]' },
  { id: 'price', title: 'Price', icon: Tag, hoverClass: 'group-hover:text-[#F59E0B]' },
  { id: 'format', title: 'Format', icon: MonitorPlay, hoverClass: 'group-hover:text-[#8B5CF6]' },
  { id: 'sort', title: 'Sort by', icon: SlidersHorizontal, hoverClass: 'group-hover:text-[#0F172A]' }
];

const FilterCardWrapper = ({ title, icon: Icon, hoverClass, children }) => (
  <div
    className="pressable-card pressable-card--lite group rounded-xl border border-[#E2E8F0] bg-white p-2.5 flex flex-col justify-between gap-1.5 transition-colors hover:border-[#CBD5E1]"
  >
    <div className="flex items-center gap-1.5">
      <Icon className={`w-3.5 h-3.5 text-[#94A3B8] transition-colors ${hoverClass}`} />
      <span className="font-semibold text-xs text-[#475569]">{title}</span>
    </div>
    <div className="text-xs">
      {children}
    </div>
  </div>
);

const EventsPage = () => {
  const queryClient = useQueryClient();
  // Filter states
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    dateFrom: undefined,
    dateTo: undefined,
    price: 'all', // all, free, paid
    format: 'all', // all, in-person, online
    sort: 'popular', // popular, upcoming, newest, price-low, price-high
  });
  const [isSlowLoad, setIsSlowLoad] = useState(false);

  const PAGE_SIZE = 12;

  const {
    data: eventsData,
    isLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: eventQueryKeys.listInfinite({ ordering: 'start_date', page_size: PAGE_SIZE }),
    queryFn: ({ pageParam = 1 }) => fetchEvents({ ordering: 'start_date', page: pageParam, page_size: PAGE_SIZE }),
    initialPageParam: 1,
    getNextPageParam: (lastPage, pages) => {
      if (!lastPage?.next) return undefined;
      try {
        const nextUrl = new URL(lastPage.next);
        const nextPage = Number(nextUrl.searchParams.get('page'));
        return Number.isNaN(nextPage) ? pages.length + 1 : nextPage;
      } catch {
        return pages.length + 1;
      }
    },
    staleTime: 5 * 60 * 1000,
  });

  const allEvents = useMemo(() => {
    const pages = Array.isArray(eventsData?.pages) ? eventsData.pages : [];
    return pages.flatMap((page) => (Array.isArray(page?.results) ? page.results : []));
  }, [eventsData]);

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

    const warmLikelyClicks = () => {
      allEvents.slice(0, 8).forEach((event, index) => {
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
        }, index * 140);
      });
    };

    if ('requestIdleCallback' in window) {
      idleId = window.requestIdleCallback(warmLikelyClicks, { timeout: 2200 });
    } else {
      timerId = setTimeout(warmLikelyClicks, 420);
    }

    return () => {
      cancelled = true;
      if (idleId && 'cancelIdleCallback' in window) window.cancelIdleCallback(idleId);
      if (timerId) clearTimeout(timerId);
    };
  }, [allEvents, queryClient]);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    let result = [...allEvents];

    // Category filter
    if (filters.category) {
      result = result.filter(event =>
        event.category?.toLowerCase() === filters.category.toLowerCase()
      );
    }

    // Location filter
    if (filters.location) {
      result = result.filter(event =>
        event.location?.toLowerCase().includes(filters.location.toLowerCase())
      );
    }

    // Date filters via date formatting
    if (filters.dateFrom instanceof Date) {
      result = result.filter(event => new Date(event.date) >= filters.dateFrom);
    }
    if (filters.dateTo instanceof Date) {
      result = result.filter(event => new Date(event.date) <= filters.dateTo);
    }

    // Price filter
    if (filters.price === 'free') {
      result = result.filter(event => event.isFree);
    } else if (filters.price === 'paid') {
      result = result.filter(event => !event.isFree);
    }

    // Format filter
    if (filters.format !== 'all') {
      const formatMap = {
        'in-person': 'in_person',
        'online': 'online',
        'hybrid': 'hybrid',
      };
      result = result.filter(event =>
        event.format?.toLowerCase() === formatMap[filters.format]?.toLowerCase()
      );
    }

    // Sort
    switch (filters.sort) {
      case 'upcoming':
        result.sort((a, b) => new Date(a.date) - new Date(b.date));
        break;
      case 'newest':
        result.sort((a, b) => new Date(b.date) - new Date(a.date));
        break;
      case 'price-low':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'price-high':
        result.sort((a, b) => b.price - a.price);
        break;
      default: // popular
        result.sort((a, b) => (b.attendeeCount || 0) - (a.attendeeCount || 0));
    }

    return result;
  }, [filters, allEvents]);

  const clearFilters = () => {
            setFilters({
              category: '',
              location: '',
              dateFrom: undefined,
              dateTo: undefined,
              price: 'all',
              format: 'all',
              sort: 'popular',
    });
  };

  const hasActiveFilters = () => {
    return filters.category ||
      filters.location ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.price !== 'all' ||
      filters.format !== 'all';
  };

  return (
    <PageWrapper>
      {/* Hero Header & Filter Bar */}
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 md:py-6">
          <div className="flex flex-col mb-4">
            <h1 className="text-2xl font-bold text-[#0F172A] mb-1">
              Explore Events
            </h1>
            <p className="text-[#64748B] text-sm flex items-center gap-2">
              Showing {filteredEvents.length} events
              {hasActiveFilters() && (
                <button onClick={clearFilters} className="text-[#1E4DB7] hover:underline ml-2 font-medium">
                  Clear Filters
                </button>
              )}
            </p>
          </div>

          {/* New Minimal Filter Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-2 md:gap-3">

            {/* Category */}
            <FilterCardWrapper {...filterCards[0]}>
              <select
                value={filters.category}
                onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                className="w-full bg-transparent outline-none focus:text-[#1E4DB7] cursor-pointer text-[#334155] truncate"
              >
                <option value="">All Categories</option>
                {(Array.isArray(categories) ? categories : []).map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </FilterCardWrapper>

            {/* Location */}
            <FilterCardWrapper {...filterCards[1]}>
              <input
                type="text"
                placeholder="University or venue"
                value={filters.location}
                onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                className="w-full bg-transparent outline-none focus:text-[#EF4444] text-[#334155] placeholder:text-[#94A3B8] truncate"
              />
            </FilterCardWrapper>

            {/* Date Range - Custom Modern Implementation */}
            <FilterCardWrapper {...filterCards[2]}>
              <div className="flex items-center gap-1.5 w-full">
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex-1 outline-none text-left whitespace-nowrap overflow-hidden text-ellipsis hover:text-[#22C55E] text-[#334155]">
                      {filters.dateFrom instanceof Date ? format(filters.dateFrom, "MM/dd/yy") : "Start"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom || undefined}
                      onSelect={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-[#94A3B8] px-0.5">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex-1 outline-none text-left whitespace-nowrap overflow-hidden text-ellipsis hover:text-[#22C55E] text-[#334155]">
                      {filters.dateTo instanceof Date ? format(filters.dateTo, "MM/dd/yy") : "End"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo || undefined}
                      onSelect={(date) => setFilters(prev => ({ ...prev, dateTo: date }))}
                      initialFocus
                      disabled={(date) => filters.dateFrom ? date < filters.dateFrom : false}
                    />
                  </PopoverContent>
                </Popover>
              </div>
            </FilterCardWrapper>

            {/* Price */}
            <FilterCardWrapper {...filterCards[3]}>
              <div className="flex items-center gap-0.5 w-full bg-[#F1F5F9] rounded p-0.5">
                {['all', 'free', 'paid'].map((price) => (
                  <button
                    key={price}
                    onClick={() => setFilters(prev => ({ ...prev, price }))}
                    className={`flex-1 py-1 rounded text-[11px] font-medium capitalize transition-colors ${filters.price === price
                      ? 'bg-white shadow text-[#F59E0B]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                  >
                    {price}
                  </button>
                ))}
              </div>
            </FilterCardWrapper>

            {/* Format */}
            <FilterCardWrapper {...filterCards[4]}>
              <div className="flex items-center gap-0.5 w-full bg-[#F1F5F9] rounded p-0.5">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'in-person', label: 'Person' },
                  { id: 'online', label: 'Online' },
                ].map((format) => (
                  <button
                    key={format.id}
                    onClick={() => setFilters(prev => ({ ...prev, format: format.id }))}
                    className={`flex-1 py-1 rounded text-[11px] font-medium transition-colors ${filters.format === format.id
                      ? 'bg-white shadow text-[#8B5CF6]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                      }`}
                  >
                    {format.label}
                  </button>
                ))}
              </div>
            </FilterCardWrapper>

            {/* Sort */}
            <FilterCardWrapper {...filterCards[5]}>
              <select
                value={filters.sort}
                onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                className="w-full bg-transparent outline-none focus:text-[#0F172A] cursor-pointer text-[#334155] truncate"
              >
                <option value="popular">Most Popular</option>
                <option value="upcoming">Upcoming</option>
                <option value="newest">Newest</option>
                <option value="price-low">Price: Low to High</option>
                <option value="price-high">Price: High to Low</option>
              </select>
            </FilterCardWrapper>

          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <main className="flex-1">
          {/* Events Grid */}
          {isLoading ? (
            <div className="min-h-[360px] flex flex-col items-center justify-center space-y-4">
              <ClassicTicketLoader visible overlay={false} ariaLabel="Loading events" />
              {isSlowLoad && (
                <motion.p 
                  initial={{ opacity: 0 }} 
                  animate={{ opacity: 1 }} 
                  className="text-sm text-[#64748B] text-center max-w-xs"
                >
                  Finding the best events... 📅<br />
                  <span className="text-xs">(Free tiers may take up to 60s to start)</span>
                </motion.p>
              )}
            </div>
          ) : filteredEvents.length > 0 ? (
            <motion.div
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
              layout
            >
              <AnimatePresence mode="popLayout">
                {filteredEvents.map((event, index) => (
                  <motion.div
                    key={event.id}
                    layoutId={String(event.id)}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.2 }}
                  >
                    <EventCard
                      event={event}
                      index={index}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <div className="text-center py-20 bg-[#F8FAFC] rounded-3xl border border-[#E2E8F0]">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white shadow-sm flex items-center justify-center">
                <Search className="w-8 h-8 text-[#94A3B8]" />
              </div>
              <h3 className="text-xl font-semibold text-[#0F172A] mb-2">
                No events match your filters
              </h3>
              <p className="text-[#64748B] mb-6">
                Try loosening your search criteria to find what you're looking for.
              </p>
              <CustomButton variant="outline" onClick={clearFilters}>
                Clear All Filters
              </CustomButton>
            </div>
          )}
          {hasNextPage && (
            <div className="mt-8 flex justify-center">
              <CustomButton
                variant="outline"
                onClick={() => fetchNextPage()}
                disabled={isFetchingNextPage}
              >
                {isFetchingNextPage ? 'Loading more…' : 'Load more events'}
              </CustomButton>
            </div>
          )}
        </main>
      </div>
    </PageWrapper>
  );
};

export default EventsPage;
