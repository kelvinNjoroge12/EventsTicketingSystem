import React, { useEffect, useState } from 'react';
import { useParams, useLocation, Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Calendar,
  Share2,
  Check,
  ArrowRight,
  Mail,
  Loader2,
  AlertCircle
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
  const [searchParams] = useSearchParams();
  const { clearCart } = useCart();
  const [showCheckmark, setShowCheckmark] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [order, setOrder] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [resendStatus, setResendStatus] = useState({ text: '', type: '' });

  const stateData = location.state;
  const emailParam = searchParams.get('email');

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
      const query = emailParam ? `?email=${encodeURIComponent(emailParam)}` : '';
      api.get(`/api/orders/${orderId}/${query}`)
        .then(data => {
          if (mounted) setOrder(data);
        })
        .catch(err => {
          console.error("Failed to fetch order", err);
          setLoadError(err?.message || 'We could not load your order details.');
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

  const currentRawEmail =
    stateData?.attendeeData?.email ||
    emailParam ||
    (finalOrder?.attendee_email_masked ? null : finalOrder?.attendee_email);

  const handleResendEmail = async () => {
    if (!currentRawEmail) return;
    setIsResending(true);
    setResendStatus({ text: '', type: '' });

    try {
      const res = await api.post(`/api/orders/${orderId}/resend-email/`, { email: currentRawEmail });
      setResendStatus({ text: res?.message || 'Email sent successfully!', type: 'success' });
    } catch (err) {
      setResendStatus({
        text: err?.response?.error?.message || err?.message || 'Failed to resend email.',
        type: 'error'
      });
    } finally {
      setIsResending(false);
    }
  };

  if (loadError && !isHydrated) {
    return (
      <PageWrapper>
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
          <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Unable to load your order</h2>
          <p className="text-[#64748B] mb-6">{loadError}</p>
          <Link
            to="/find-ticket"
            className="inline-flex items-center justify-center px-6 py-3 rounded-xl bg-[#02338D] text-white font-medium"
          >
            Find your ticket
          </Link>
        </div>
      </PageWrapper>
    );
  }

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
  const emailDisplay =
    stateData?.attendeeData?.email ||
    finalOrder?.attendee_email ||
    finalOrder?.attendee_email_masked ||
    'your email';

  return (
    <PageWrapper>
      <div className="min-h-[calc(100vh-112px)] flex items-center justify-center px-4 sm:px-6 lg:px-8 py-6">
        <div className="w-full max-w-2xl">
        {/* Success Animation */}
        <div className="text-center mb-6">
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

        {/* Email Sent Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="mb-6 p-6 bg-[#F8FAFC] border border-[#E2E8F0] rounded-2xl text-center"
        >
          <div className="w-12 h-12 bg-[#EFF6FF] text-[#02338D] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 6c0-1.1-.9-2-2-2H4c-1.1 0-2 .9-2 2"></path>
              <path d="m22 6-10 7L2 6"></path>
              <path d="M22 18c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2"></path>
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-[#0F172A] mb-2">Check your inbox</h3>
          <p className="text-[#64748B] mb-3">
            We've sent your official tickets to <span className="font-medium text-[#0F172A]">
              {emailDisplay}
            </span>. Please check your inbox (and spam folder) to download or print your tickets.
          </p>

          {currentRawEmail && (
            <div className="mt-4 flex flex-col items-center">
              <button
                onClick={handleResendEmail}
                disabled={isResending || resendStatus.type === 'success'}
                className="inline-flex items-center gap-2 text-sm font-medium text-[#02338D] hover:text-[#1E4DB7] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isResending ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> Sending...</>
                ) : resendStatus.type === 'success' ? (
                  <><Check className="w-4 h-4 text-[#16A34A]" /> Sent</>
                ) : (
                  <><Mail className="w-4 h-4" /> Resend email</>
                )}
              </button>
              
              {resendStatus.text && (
                <div className={`mt-2 flex items-center gap-1.5 text-sm ${resendStatus.type === 'error' ? 'text-red-600' : 'text-[#16A34A]'}`}>
                  {resendStatus.type === 'error' ? <AlertCircle className="w-4 h-4 shrink-0" /> : null}
                  <span>{resendStatus.text}</span>
                </div>
              )}
            </div>
          )}
        </motion.div>

        {/* Calendar Buttons */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3 mb-6"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.9 }}
        >
          <CustomButton
            variant="outline"
            leftIcon={Calendar}
            onClick={() => handleAddToCalendar('google')}
            className="min-w-[140px]"
          >
            Google
          </CustomButton>
          <CustomButton
            variant="outline"
            leftIcon={Calendar}
            onClick={() => handleAddToCalendar('apple')}
            className="min-w-[140px]"
          >
            Apple
          </CustomButton>
        </motion.div>

        {/* Share Section */}
        <motion.div
          className="text-center mb-6"
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
            className="inline-flex items-center gap-2 text-[#02338D] font-medium hover:underline"
          >
            Browse More Events
            <ArrowRight className="w-4 h-4" />
          </Link>
        </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default ConfirmationPage;
