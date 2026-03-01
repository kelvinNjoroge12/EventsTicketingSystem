import React from 'react';
import { motion } from 'framer-motion';
import CustomButton from '../ui/CustomButton';

const StickyMobileBar = ({ event, onGetTickets, themeColor }) => {
  const lowestPrice = Math.min(...event.tickets.map(t => t.price));
  const hasMultipleTickets = event.tickets.length > 1;

  return (
    <motion.div
      className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E2E8F0] p-4 md:hidden z-30"
      initial={{ y: 100 }}
      animate={{ y: 0 }}
      transition={{ type: 'spring', damping: 25, stiffness: 300, delay: 0.5 }}
    >
      <div className="flex items-center justify-between gap-4">
        {/* Price Info */}
        <div className="flex-shrink-0">
          <p className="text-xs text-[#64748B]">
            {hasMultipleTickets ? 'From' : 'Price'}
          </p>
          <p className="text-xl font-bold" style={{ color: themeColor }}>
            {event.currency} {lowestPrice.toLocaleString()}
            <span className="text-sm font-normal text-[#64748B]">/ticket</span>
          </p>
        </div>

        {/* CTA Button */}
        <CustomButton
          variant="primary"
          onClick={onGetTickets}
          className="flex-1 py-3"
          style={{ backgroundColor: themeColor }}
        >
          Get Tickets
        </CustomButton>
      </div>
    </motion.div>
  );
};

export default StickyMobileBar;
