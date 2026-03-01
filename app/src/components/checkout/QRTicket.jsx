import React from 'react';
import { motion } from 'framer-motion';

import { QRCodeSVG } from 'qrcode.react';

const QRTicket = ({
  event,
  orderDetails,
  orderId,
  themeColor,
}) => {
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <motion.div
      className="bg-white rounded-2xl border border-[#E2E8F0] overflow-hidden shadow-lg"
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: 'spring', damping: 20, stiffness: 300 }}
    >
      {/* Top Section */}
      <div className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-[#0F172A] text-lg line-clamp-2">
              {event.title}
            </h3>
            <p className="text-[#64748B] text-sm mt-1">
              {formatDate(event.date)}
            </p>
          </div>
          <div
            className="px-3 py-1 rounded-full text-xs font-medium text-white"
            style={{ backgroundColor: themeColor }}
          >
            {orderDetails.ticketType}
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
            style={{ backgroundColor: themeColor }}
          >
            {orderDetails.attendeeName?.charAt(0).toUpperCase() || 'A'}
          </div>
          <div>
            <p className="font-medium text-[#0F172A]">
              {orderDetails.attendeeName || 'Attendee'}
            </p>
            <p className="text-sm text-[#64748B]">
              {orderDetails.quantity} {orderDetails.quantity > 1 ? 'tickets' : 'ticket'}
            </p>
          </div>
        </div>
      </div>

      {/* Perforation Line */}
      <div className="relative h-4">
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 border-t-2 border-dashed border-[#E2E8F0]" />
        <div className="absolute left-0 top-0 w-4 h-4 bg-white rounded-full -translate-x-1/2" />
        <div className="absolute right-0 top-0 w-4 h-4 bg-white rounded-full translate-x-1/2" />
      </div>

      {/* QR Code Section */}
      <div className="p-6 flex flex-col items-center">
        <div className="relative w-48 h-48 bg-white p-2 rounded-xl border border-[#E2E8F0] flex items-center justify-center">
          <QRCodeSVG
            value={`eventhub:order:${orderId}`}
            size={160}
            level="M"
            fgColor="#0F172A"
            bgColor="#ffffff"
          />
        </div>

        <p className="mt-4 text-sm text-[#64748B] text-center">
          Present this at the entrance
        </p>

        <div className="mt-4 pt-4 border-t border-[#E2E8F0] w-full text-center">
          <p className="text-xs text-[#64748B] mb-1">Order ID</p>
          <p className="font-mono text-sm text-[#0F172A]">
            {orderId}
          </p>
        </div>
      </div>
    </motion.div>
  );
};

export default QRTicket;
