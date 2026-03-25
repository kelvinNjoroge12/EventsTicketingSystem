import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, ExternalLink, MapPin, TicketCheck, RefreshCw } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import CheckInStaffHeader from '../components/organizer/CheckInStaffHeader';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';

const OrganizerCheckInLanding = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [assignedEvents, setAssignedEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch assigned check-in events from the dedicated backend endpoint.
  // This endpoint ONLY returns events that were explicitly assigned to this
  // user by an organizer for check-in. It is completely separate from the
  // organizer dashboard and never leaks other organizers' event data.
  const fetchAssignedEvents = useCallback(() => {
    setIsLoading(true);
    setError(null);
    
    // First, try the explicit API endpoint
    api.get('/api/events/checkin/assigned/')
      .then((data) => {
        const results = data?.results || data || [];
        setAssignedEvents(Array.isArray(results) ? results : []);
      })
      .catch((err) => {
        // Fallback: Use the user's profile data if the endpoint 404s or fails
        const fallbackRaw = user?.assigned_events || user?.event_assignments || user?.checkin_events || [];
        const fallbackDetails = user?.assigned_event_details || user?.assignedEventDetails || [];
        
        if (fallbackRaw.length > 0 || fallbackDetails.length > 0) {
          const normalized = (fallbackDetails.length > 0 ? fallbackDetails : fallbackRaw).map((ev) => ({
            id: ev.id,
            slug: ev.slug,
            title: ev.title || ev.name || 'Assigned Event',
            start_date: ev.start_date || ev.date || '',
            venue_name: ev.venue_name || ev.location || '',
          }));
          setAssignedEvents(normalized);
        } else if (err?.status !== 404) {
           setError(err?.message || 'Failed to load assigned events.');
        } else {
           setAssignedEvents([]);
        }
      })
      .finally(() => setIsLoading(false));
  }, [user]);

  useEffect(() => {
    fetchAssignedEvents();
  }, [fetchAssignedEvents]);

  return (
    <PageWrapper className="bg-[#F8FAFC]">
      <CheckInStaffHeader />
      <div className="min-h-screen bg-[#F8FAFC] pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between gap-3 mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#02338D]/10 flex items-center justify-center">
                <TicketCheck className="w-5 h-5 text-[#02338D]" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-[#0F172A]">Your Assigned Events</h1>
                <p className="text-sm text-[#64748B]">Select an event to begin check-in.</p>
              </div>
            </div>
            <button
              onClick={fetchAssignedEvents}
              disabled={isLoading}
              className="p-2 rounded-xl hover:bg-[#F1F5F9] transition-colors disabled:opacity-50"
              title="Refresh"
            >
              <RefreshCw className={`w-4 h-4 text-[#64748B] ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {isLoading ? (
            <div className="grid gap-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E2E8F0] p-5 animate-pulse">
                  <div className="h-5 w-2/3 bg-[#F1F5F9] rounded-lg mb-3" />
                  <div className="h-3 w-1/3 bg-[#F1F5F9] rounded-lg" />
                </div>
              ))}
            </div>
          ) : error ? (
            <div className="bg-white rounded-2xl border border-red-100 p-6 text-center">
              <p className="text-red-600 text-sm font-medium">{error}</p>
              <button
                onClick={fetchAssignedEvents}
                className="mt-3 text-xs font-semibold text-[#02338D] hover:underline"
              >
                Try again
              </button>
            </div>
          ) : assignedEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 text-center">
              <p className="text-[#64748B]">No events are currently assigned to your account.</p>
              <p className="text-xs text-[#94A3B8] mt-2">Please contact the event organizer for access.</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {assignedEvents.map((event) => (
                <div
                  key={event.id}
                  className="bg-white rounded-2xl border border-[#E2E8F0] p-5 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h2 className="text-lg font-semibold text-[#0F172A] truncate">{event.title}</h2>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-[#64748B] mt-2">
                        {(event.start_date || event.startDate) && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(event.start_date || event.startDate).toLocaleDateString()}
                          </span>
                        )}
                        {(event.venue_name || event.venueName) && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {event.venue_name || event.venueName}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/organizer/events/${event.slug}/checkin`)}
                        className="text-xs font-semibold text-white bg-[#02338D] hover:bg-[#022A78] px-3 py-1.5 rounded-lg transition-colors"
                      >
                        Open Check-In
                      </button>
                      <Link
                        to={`/events/${event.slug}`}
                        className="inline-flex items-center gap-1 text-xs font-medium text-[#64748B] hover:text-[#02338D] transition-colors"
                      >
                        <ExternalLink className="w-3 h-3" />
                        View Event
                      </Link>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default OrganizerCheckInLanding;
