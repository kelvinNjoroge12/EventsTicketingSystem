import React from 'react';
import CustomButton from '../ui/CustomButton';

const StickyMobileBar = ({ event, onGetTickets, themeColor }) => {
  const tickets = Array.isArray(event.tickets) ? event.tickets : [];
  const lowestPrice = tickets.length > 0 ? Math.min(...tickets.map((t) => t.price)) : 0;
  const hasMultipleTickets = tickets.length > 1;
  const isPastEvent = event.isPast || event.timeState === 'past' || event.status === 'completed';
  const workflowStatus = event.workflowStatus || event.status;
  const isUnavailableForSale = !['published', 'completed'].includes(workflowStatus);

  return (
    <div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4 md:hidden z-30"
      style={{ overflowX: 'hidden' }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Price Info */}
        <div className="flex-shrink-0">
          <p className="text-xs text-[#64748B]">
            {isPastEvent || isUnavailableForSale ? 'Status' : hasMultipleTickets ? 'From' : 'Price'}
          </p>
          <p className="text-xl font-bold" style={{ color: themeColor }}>
            {isPastEvent ? 'Closed' : isUnavailableForSale ? 'Pending' : `${event.currency} ${lowestPrice.toLocaleString()}`}
            {!isPastEvent && !isUnavailableForSale && <span className="text-sm font-normal text-[#64748B]">/ticket</span>}
          </p>
        </div>

        {/* CTA Button */}
        <CustomButton
          variant="primary"
          onClick={onGetTickets}
          disabled={isPastEvent || isUnavailableForSale}
          className="flex-1 py-3"
          style={{ backgroundColor: themeColor }}
        >
          {isPastEvent ? 'Event Has Passed' : isUnavailableForSale ? 'Awaiting Approval' : 'Get Tickets'}
        </CustomButton>
      </div>
    </div>
  );
};

export default StickyMobileBar;
