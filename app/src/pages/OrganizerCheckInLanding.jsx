import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Calendar, ExternalLink, MapPin, TicketCheck } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import CheckInStaffHeader from '../components/organizer/CheckInStaffHeader';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/apiClient';

const OrganizerCheckInLanding = () => {
  const { user, updateUser } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [refreshAttempted, setRefreshAttempted] = useState(false);

  const assignedEvents = useMemo(() => {
    const details = user?.assigned_event_details || user?.assignedEventDetails || [];
    if (!Array.isArray(details)) return [];
    return details.filter((event) => event && event.slug);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    if (assignedEvents.length === 1) {
      navigate(`/organizer/events/${assignedEvents[0].slug}/checkin`, { replace: true });
    }
  }, [user, assignedEvents, navigate]);

  useEffect(() => {
    if (!user || isRefreshing || refreshAttempted) return;
    if (assignedEvents.length > 0) return;
    setIsRefreshing(true);
    setRefreshAttempted(true);
    api.get('/api/auth/profile/')
      .then((profile) => updateUser(profile))
      .catch(() => {})
      .finally(() => setIsRefreshing(false));
  }, [user, assignedEvents.length, updateUser, isRefreshing, refreshAttempted]);

  return (
    <PageWrapper className="bg-[#F8FAFC]">
      <CheckInStaffHeader />
      <div className="min-h-screen bg-[#F8FAFC] pt-20">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#02338D]/10 flex items-center justify-center">
              <TicketCheck className="w-5 h-5 text-[#02338D]" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">Your Assigned Events</h1>
              <p className="text-sm text-[#64748B]">Select an event to begin check-in.</p>
            </div>
          </div>

          {assignedEvents.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E2E8F0] p-6 text-center">
              <p className="text-[#64748B]">No events are currently assigned to your account.</p>
              <p className="text-xs text-[#94A3B8] mt-2">Please contact the organizer for access.</p>
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
                        {event.date && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            {new Date(event.date).toLocaleDateString()}
                          </span>
                        )}
                        {event.time && (
                          <span className="inline-flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5" />
                            {event.time}
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

