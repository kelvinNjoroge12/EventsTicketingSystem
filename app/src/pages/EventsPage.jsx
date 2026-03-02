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
import { fetchEvents, fetchEventsWithSWR } from '../lib/eventsApi';
import { categories } from '../data/categories';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { Calendar } from '../components/ui/calendar';

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
    className="group rounded-xl border border-[#E2E8F0] bg-white p-2.5 shadow-xs flex flex-col justify-between gap-1.5 transition-colors hover:border-[#CBD5E1]"
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
  const [isLoading, setIsLoading] = useState(true);
  const [allEvents, setAllEvents] = useState([]);

  // Filter states (No keyword search as requested)
  const [filters, setFilters] = useState({
    category: '',
    location: '',
    dateFrom: null,
    dateTo: null,
    price: 'all', // all, free, paid
    format: 'all', // all, in-person, online
    sort: 'popular', // popular, upcoming, newest, price-low, price-high
  });

  // Initial load — uses SWR cache from HomePage if available
  useEffect(() => {
    let isMounted = true;

    // 1. Try to serve from cache immediately
    const cached = fetchEventsWithSWR({}, (freshEvents) => {
      if (isMounted) setAllEvents(freshEvents);
    });

    if (cached) {
      setAllEvents(cached);
      setIsLoading(false);
    } else {
      // 2. No cache — full network fetch
      (async () => {
        try {
          const data = await fetchEvents();
          if (isMounted) setAllEvents(data);
        } catch (e) {
          console.error('Failed to load events', e);
        } finally {
          if (isMounted) setIsLoading(false);
        }
      })();
    }

    return () => { isMounted = false; };
  }, []);

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
    if (filters.dateFrom) {
      result = result.filter(event => new Date(event.date) >= filters.dateFrom);
    }
    if (filters.dateTo) {
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
      dateFrom: null,
      dateTo: null,
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
                {categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))}
              </select>
            </FilterCardWrapper>

            {/* Location */}
            <FilterCardWrapper {...filterCards[1]}>
              <input
                type="text"
                placeholder="City or venue"
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
                      {filters.dateFrom ? format(filters.dateFrom, "MM/dd/yy") : "Start"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateFrom}
                      onSelect={(date) => setFilters(prev => ({ ...prev, dateFrom: date }))}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <span className="text-[#94A3B8] px-0.5">-</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <button className="flex-1 outline-none text-left whitespace-nowrap overflow-hidden text-ellipsis hover:text-[#22C55E] text-[#334155]">
                      {filters.dateTo ? format(filters.dateTo, "MM/dd/yy") : "End"}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={filters.dateTo}
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
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="rounded-2xl overflow-hidden bg-[#F1F5F9] animate-pulse">
                  <div className="h-48 bg-[#E2E8F0]" />
                  <div className="p-4 space-y-3">
                    <div className="h-5 bg-[#E2E8F0] rounded w-3/4" />
                    <div className="h-4 bg-[#E2E8F0] rounded w-1/2" />
                    <div className="h-4 bg-[#E2E8F0] rounded w-full" />
                  </div>
                </div>
              ))}
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
        </main>
      </div>
    </PageWrapper>
  );
};

export default EventsPage;
