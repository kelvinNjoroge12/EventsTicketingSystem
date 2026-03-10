import React from 'react';
import { ArrowRight, Ticket } from 'lucide-react';

const OrganizerCheckInSelect = ({
  events,
  isLoadingEvents,
  checkInEventId,
  onSelectEvent,
  onOpenCheckin,
}) => {
  return (
    <div className="space-y-5">
      <div className="bg-white border border-[#E2E8F0] rounded-[28px] p-6 shadow-sm">
        <h3 className="text-xl font-bold text-[#0F172A]">Start Check-In</h3>
        <p className="text-sm text-[#64748B] mt-1">
          Choose an event first, then open your check-in screen.
        </p>
        <div className="mt-5 grid md:grid-cols-[1fr_auto] gap-3 items-end">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-[#64748B] mb-1.5">Event</label>
            <select
              value={checkInEventId}
              onChange={(e) => onSelectEvent(e.target.value)}
              className="w-full px-4 py-3 border border-[#E2E8F0] rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-[#1E4DB7]/20"
            >
              {events.map((event) => (
                <option key={event.id} value={event.id}>
                  {event.name}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={onOpenCheckin}
            disabled={!checkInEventId}
            className="px-5 py-3 rounded-2xl text-sm font-semibold text-white bg-[#1E4DB7] hover:bg-[#163B90] disabled:opacity-50 inline-flex items-center gap-2"
          >
            <Ticket className="w-4 h-4" />
            Open Check-In
          </button>
        </div>
      </div>

      <div className="bg-white border border-[#E2E8F0] rounded-[28px] p-6 shadow-sm">
        <h4 className="font-semibold text-[#0F172A] mb-3">Quick Event Access</h4>
        {isLoadingEvents ? (
          <div className="space-y-2 animate-pulse">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 rounded-xl bg-[#F1F5F9]" />
            ))}
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-2">
            {events.map((event) => (
              <button
                key={event.id}
                onClick={() => onOpenCheckin(event.id)}
                className="px-4 py-3 rounded-2xl border border-[#E2E8F0] hover:bg-[#F8FAFC] transition-colors text-sm flex items-center justify-between"
              >
                <span className="font-medium text-[#0F172A] truncate">{event.name}</span>
                <ArrowRight className="w-4 h-4 text-[#94A3B8]" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default OrganizerCheckInSelect;
