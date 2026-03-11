import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, ArrowLeft } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import EventCard from '../components/cards/EventCard';
import CustomButton from '../components/ui/CustomButton';
import { searchEventsApi } from '../lib/eventsApi';

const SearchResultsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(true);
  const [results, setResults] = useState([]);

  const query = searchParams.get('q') || '';
  const location = searchParams.get('location') || '';
  const date = searchParams.get('date') || '';

  useEffect(() => {
    let isMounted = true;
    setIsLoading(true);
    (async () => {
      try {
        const searchResults = await searchEventsApi({ q: query, location, date });
        if (isMounted) {
          setResults(searchResults?.results || []);
        }
      } catch (e) {
        console.error('Search failed', e);
        if (isMounted) setResults([]);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, [query, location, date]);

  const getSearchTitle = () => {
    if (query && location) {
      return `Events matching "${query}" in ${location}`;
    }
    if (query) {
      return `Results for "${query}"`;
    }
    if (location) {
      return `Events in ${location}`;
    }
    return 'All Events';
  };

  return (
    <PageWrapper>
      {/* Header */}
      <div className="bg-white border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-[#64748B] hover:text-[#0F172A] mb-4"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Events
          </Link>

          <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A] mb-2">
            {getSearchTitle()}
          </h1>
          <p className="text-[#64748B]">
            {isLoading ? 'Searching...' : `${results.length} events found`}
          </p>
        </div>
      </div>

      {/* Search Form */}
      <div className="bg-[#F8FAFC] border-b border-[#E2E8F0]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target);
              const params = new URLSearchParams();
              if (formData.get('q')) params.set('q', formData.get('q'));
              if (formData.get('location')) params.set('location', formData.get('location'));
              if (formData.get('date')) params.set('date', formData.get('date'));
              setSearchParams(params);
            }}
            className="flex flex-wrap gap-4"
          >
            <div className="flex-1 min-w-[200px]">
              <input
                type="text"
                name="q"
                defaultValue={query}
                placeholder="Search events..."
                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E4DB7] bg-white"
              />
            </div>
            <div className="w-48">
              <input
                type="text"
                name="location"
                defaultValue={location}
                placeholder="Location"
                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E4DB7] bg-white"
              />
            </div>
            <div className="w-40">
              <input
                type="date"
                name="date"
                defaultValue={date}
                className="w-full px-4 py-3 border border-[#E2E8F0] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#1E4DB7] bg-white"
              />
            </div>
            <CustomButton type="submit" variant="primary" className="py-3">
              <Search className="w-5 h-5" />
            </CustomButton>
          </form>
        </div>
      </div>

      {/* Results */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
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
        ) : results.length > 0 ? (
          <motion.div
            className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            {results.map((event, index) => (
              <EventCard
                key={event.id}
                event={event}
                index={index}
              />
            ))}
          </motion.div>
        ) : (
          <div className="text-center py-16">
            <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#F1F5F9] flex items-center justify-center">
              <Search className="w-10 h-10 text-[#94A3B8]" />
            </div>
            <h3 className="text-xl font-semibold text-[#0F172A] mb-2">
              No events found
            </h3>
            <p className="text-[#64748B] mb-6">
              {query
                ? `No events match "${query}". Try a different search.`
                : 'Try adjusting your search criteria.'}
            </p>
            <Link to="/events">
              <CustomButton variant="outline">Browse All Events</CustomButton>
            </Link>
          </div>
        )}
      </div>
    </PageWrapper>
  );
};

export default SearchResultsPage;
