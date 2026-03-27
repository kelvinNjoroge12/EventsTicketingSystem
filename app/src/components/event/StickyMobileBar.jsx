import React from 'react';
import CustomButton from '../ui/CustomButton';

const StickyMobileBar = ({ event, onOpenTickets, themeColor }) => {
  const tickets = Array.isArray(event.tickets) ? event.tickets : [];
  const lowestPrice = tickets.length > 0 ? Math.min(...tickets.map((ticket) => Number(ticket.price || 0))) : 0;
  const hasMultipleTickets = tickets.length > 1;
  const isPastEvent = event.isPast || event.timeState === 'past' || event.status === 'completed';
  const workflowStatus = event.workflowStatus || event.status;
  const isUnavailableForSale = !['published', 'completed'].includes(workflowStatus);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-30 border-t border-[#E2E8F0] bg-white/95 px-4 py-3 shadow-[0_-12px_28px_-20px_rgba(15,23,42,0.55)] backdrop-blur lg:hidden"
      style={{ overflowX: 'hidden' }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="flex-shrink-0">
          <p className="text-xs text-[#64748B]">
            {isPastEvent || isUnavailableForSale ? 'Status' : hasMultipleTickets ? 'From' : 'Price'}
          </p>
          <p className="text-lg font-bold sm:text-xl" style={{ color: themeColor }}>
            {isPastEvent ? 'Closed' : isUnavailableForSale ? 'Pending' : `${event.currency} ${lowestPrice.toLocaleString()}`}
            {!isPastEvent && !isUnavailableForSale && (
              <span className="ml-1 text-sm font-normal text-[#64748B]">/ticket</span>
            )}
          </p>
        </div>

        <CustomButton
          variant="primary"
          onClick={onOpenTickets}
          disabled={isPastEvent || isUnavailableForSale}
          className="flex-1 py-3 text-sm sm:text-base"
          style={{ backgroundColor: themeColor }}
        >
          {isPastEvent ? 'Event Has Passed' : isUnavailableForSale ? 'Awaiting Approval' : 'Get Tickets'}
        </CustomButton>
      </div>
    </div>
  );
};

export default StickyMobileBar;
