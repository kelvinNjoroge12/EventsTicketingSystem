import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const bars = Array.from({ length: 24 }, (_, index) => index);

const ClassicTicketLoader = ({
  visible = false,
  title = 'Preparing your event pass',
  subtitle = 'Loading seats, schedule, and venue details',
}) => {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[120] bg-[#020617]/88 backdrop-blur-[2px] flex items-center justify-center px-4"
          role="status"
          aria-live="polite"
          aria-label="Loading event details"
        >
          <div className="classic-ticket-loader max-w-md w-full">
            <div className="classic-ticket-loader-scanner">
              <div className="classic-ticket-loader-beam" />
            </div>

            <div className="classic-ticket-loader-pass">
              <div className="classic-ticket-loader-notch classic-ticket-loader-notch-left" />
              <div className="classic-ticket-loader-notch classic-ticket-loader-notch-right" />

              <div className="classic-ticket-loader-pass-head">
                <span>EVENT PASS</span>
                <span>PRIORITY ENTRY</span>
              </div>

              <div className="classic-ticket-loader-pass-row">
                <span>Destination: Event Detail</span>
                <span className="classic-ticket-loader-code">EHB-024</span>
              </div>

              <div className="classic-ticket-loader-barcode" aria-hidden="true">
                {bars.map((bar) => (
                  <span key={bar} className={bar % 3 === 0 ? 'tall' : ''} />
                ))}
              </div>
            </div>

            <div className="classic-ticket-loader-copy">
              <p className="classic-ticket-loader-title">{title}</p>
              <p className="classic-ticket-loader-subtitle">
                {subtitle}
                <span className="classic-ticket-loader-dots" />
              </p>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClassicTicketLoader;
