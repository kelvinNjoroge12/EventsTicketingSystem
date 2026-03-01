import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Download,
  Share2,
  Check,
  ArrowRight
} from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import QRTicket from '../components/checkout/QRTicket';
import CustomButton from '../components/ui/CustomButton';
import { useCart } from '../context/CartContext';
import { api } from '../lib/apiClient';

const ConfirmationPage = () => {
  const { orderId } = useParams();
  const location = useLocation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState(null);

  const stateData = location.state;

  useEffect(() => {
    // Clear cart after successful purchase
    clearCart();

    // Trigger checkmark animation
    const timer = setTimeout(() => setShowCheckmark(true), 300);
    return () => clearTimeout(timer);
  }, [clearCart]);

  useEffect(() => {
    let mounted = true;

    // Trigger checkmark animation
    const timer = setTimeout(() => {
      if (mounted) setShowCheckmark(true);
    }, 300);

    // If we don't have location.state, try to fetch the order from API
    if (!stateData && orderId) {
      setIsLoading(true);
      api.get(`/api/orders/${orderId}/`)
        .then(data => {
          if (mounted) setOrder(data);
        })
        .catch(err => {
          console.error("Failed to fetch order", err);
          // navigate('/events'); // Optionally redirect, or show an error
        })
        .finally(() => {
          if (mounted) setIsLoading(false);
        });
    }

    return () => {
      clearTimeout(timer);
      mounted = false;
    };
  }, [stateData, orderId]);

  const finalOrder = stateData ? stateData : order;
  const event = stateData?.event || null; // API doesn't fully embed event right now, we can show basic details from order or fetch it too
  const isHydrated = !!finalOrder;

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const handleDownload = () => {
    // Simulate ticket download
    window.print();
  };

  const handleAddToCalendar = (type) => {
    const eventDate = new Date(event.date);
    const startTime = event.time.split(':');
    eventDate.setHours(parseInt(startTime[0]), parseInt(startTime[1]));

    const endDate = new Date(event.date);
    const endTime = event.endTime.split(':');
    endDate.setHours(parseInt(endTime[0]), parseInt(endTime[1]));

    if (type === 'google') {
      const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}/${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}`,
        details: event.description,
        location: event.location,
      });
      window.open(`https://calendar.google.com/calendar/render?${params.toString()}`, '_blank');
    } else {
      // Generate ICS file for Apple Calendar
      const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
BEGIN:VEVENT
DTSTART:${eventDate.toISOString().replace(/[-:]/g, '').split('.')[0]}
DTEND:${endDate.toISOString().replace(/[-:]/g, '').split('.')[0]}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;

      const blob = new Blob([icsContent], { type: 'text/calendar' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${event.slug}.ics`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const handleShare = (platform) => {
    const url = window.location.href;
    const text = `I'm going to ${event.title}!`;

    const shareUrls = {
      whatsapp: `https://wa.me/?text=${encodeURIComponent(text + ' ' + url)}`,
      twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
    };

    window.open(shareUrls[platform], '_blank');
  };

  if (isLoading || !isHydrated) {
    // Return a skeleton loader or fallback
    return (
      <PageWrapper>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center animate-pulse">
          <div className="w-24 h-24 bg-gray-200 rounded-full mx-auto mb-6"></div>
          <div className="h-8 bg-gray-200 w-48 mx-auto mb-4 rounded"></div>
        </div>
      </PageWrapper>
    );
  }

  // Use event from state if available, otherwise just use order data
  const displayTitle = event ? event.title : 'Your Event';
  const displayDate = event ? formatDate(event.date) : formatDate(finalOrder.created_at || new Date());

  return (
    <PageWrapper>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Success Animation */}
        <div className="text-center mb-8">
          <motion.div
            className="w-24 h-24 mx-auto mb-6 relative"
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
          >
            {/* Circle */}
            <svg className="w-full h-full" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                stroke="#16A34A"
                strokeWidth="4"
                className={`circle-path ${showCheckmark ? 'animate' : ''}`}
              />
            </svg>
            {/* Checkmark */}
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5, type: 'spring' }}
            >
              <div className="w-16 h-16 bg-[#16A34A] rounded-full flex items-center justify-center">
                <Check className="w-10 h-10 text-white" />
              </div>
            </motion.div>
          </motion.div>

          <motion.h1
            className="text-3xl font-bold text-[#0F172A] mb-2"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
          >
            You're going! 🎉
          </motion.h1>

          <motion.p
            className="text-[#64748B]"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.7 }}
          >
            {displayTitle} on {displayDate}
          </motion.p>
        </div>

        {/* QR Ticket */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-8"
        >
          <QRTicket
            event={event || { themeColor: '#1E4DB7', title: 'Event' }}
            orderDetails={{
              ticketType: stateData?.cart?.ticketType || finalOrder?.items?.[0]?.ticket_type_name || 'General Admission',
              quantity: stateData?.cart?.quantity || finalOrder?.items?.[0]?.quantity || 1,
              attendeeName: stateData?.attendeeData
                ? `${stateData.attendeeData.firstName} ${stateData.attendeeData.lastName}`
                : `${finalOrder?.attendee_first_name} ${finalOrder?.attendee_last_name}`,
            }}
            orderId={orderId}
            themeColor={event?.themeColor || '#1E4DB7'}
          />
        </motion.div>

        {/* Action Buttons */}
        <motion.div
          className="grid grid-cols-2 gap-4 mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <CustomButton
            variant="primary"
            leftIcon={Download}
            onClick={handleDownload}
            fullWidth
          >
            Download Ticket
          </CustomButton>
          <div className="flex gap-2">
            <CustomButton
              variant="outline"
              leftIcon={Calendar}
              onClick={() => handleAddToCalendar('google')}
              className="flex-1"
            >
              Google
            </CustomButton>
            <CustomButton
              variant="outline"
              leftIcon={Calendar}
              onClick={() => handleAddToCalendar('apple')}
              className="flex-1"
            >
              Apple
            </CustomButton>
          </div>
        </motion.div>

        {/* Share Section */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1 }}
        >
          <p className="text-sm text-[#64748B] mb-4">Share this event</p>
          <div className="flex justify-center gap-3">
            {['whatsapp', 'twitter', 'linkedin', 'facebook'].map((platform) => (
              <button
                key={platform}
                onClick={() => handleShare(platform)}
                className="p-3 rounded-full bg-[#F1F5F9] hover:bg-[#E2E8F0] transition-colors capitalize text-sm"
              >
                {platform}
              </button>
            ))}
          </div>
        </motion.div>

        {/* Browse More */}
        <motion.div
          className="text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.1 }}
        >
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-[#1E4DB7] font-medium hover:underline"
          >
            Browse More Events
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default ConfirmationPage;
