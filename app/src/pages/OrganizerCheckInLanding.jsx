import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, MapPin, TicketCheck } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import CheckInStaffHeader from '../components/organizer/CheckInStaffHeader';
import { useAuth } from '../context/AuthContext';

const OrganizerCheckInLanding = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

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
                <button
                  key={event.id}
                  onClick={() => navigate(`/organizer/events/${event.slug}/checkin`)}
                  className="pressable-card text-left bg-white rounded-2xl border border-[#E2E8F0] p-5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h2 className="text-lg font-semibold text-[#0F172A]">{event.title}</h2>
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
                    <span className="text-xs font-semibold text-[#02338D]">Open Check-In</span>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </PageWrapper>
  );
};

export default OrganizerCheckInLanding;

