import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Elements, CardElement } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import { Calendar, MapPin, Ticket, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import StepIndicator from '../components/checkout/StepIndicator';
import AttendeeForm from '../components/checkout/AttendeeForm';
import PaymentForm from '../components/checkout/PaymentForm';
import { fetchEvent } from '../lib/eventsApi';
import { api } from '../lib/apiClient';
import { useCart } from '../context/CartContext';

const SIMULATED_PAYMENTS_ENABLED =
  import.meta.env.VITE_ENABLE_SIMULATED_PAYMENTS === 'true';
// NOTE: To enable simulated payments in local dev, add VITE_ENABLE_SIMULATED_PAYMENTS=true to your .env file.
// We intentionally do NOT default to true in dev to avoid masking real payment integration bugs.
const STRIPE_PUBLISHABLE_KEY = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '';
const stripePromise = STRIPE_PUBLISHABLE_KEY ? loadStripe(STRIPE_PUBLISHABLE_KEY) : null;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const CheckoutPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const { cart } = useCart();

  const [event, setEvent] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [attendeeData, setAttendeeData] = useState(null);
  const [orderContext, setOrderContext] = useState(null);
  const [error, setError] = useState('');
  const [mpesaPolling, setMpesaPolling] = useState(false);
  const [mpesaCountdown, setMpesaCountdown] = useState(60);

  const [queueState, setQueueState] = useState(null);
  const [isJoiningQueue, setIsJoiningQueue] = useState(true);

  const steps = [
    { id: 'attendee', number: 1, label: 'Your Details' },
    { id: 'payment', number: 2, label: 'Payment' },
    { id: 'confirmation', number: 3, label: 'Done' },
  ];

  // Load event
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await fetchEvent(slug);
        if (mounted) setEvent(data);
      } catch {
        if (mounted) navigate('/events');
      }
    })();
    return () => { mounted = false; };
  }, [slug, navigate]);

  // Guard: if no cart, go back
  useEffect(() => {
    if (event && (!cart || cart.eventSlug !== slug)) {
      navigate(`/events/${slug}`);
    }
  }, [cart, slug, event, navigate]);

  // Virtual Queue polling
  useEffect(() => {
    let mounted = true;
    let pollInterval;

    const checkQueue = async () => {
      try {
        const res = await api.post(`/api/payments/events/${slug}/queue/join/`);
        if (mounted) {
          setQueueState(res);
          setIsJoiningQueue(false);
          // Auto-poll every 10 seconds if still in queue and cannot purchase
          if (res?.queue_active && !res?.can_purchase) {
             pollInterval = setTimeout(checkQueue, 10000);
          }
        }
      } catch (err) {
        // If queue fails (e.g., 404 or down), fail-open to not block checkout
        console.error('Queue error:', err);
        if (mounted) setIsJoiningQueue(false);
      }
    };

    if (slug) checkQueue();

    return () => {
      mounted = false;
      if (pollInterval) clearTimeout(pollInterval);
    };
  }, [slug]);

  // ── Step 1: Attendee details ─────────────────────────────────
  // Just store locally and advance — no API call needed here.
  const handleAttendeeSubmit = (data) => {
    setAttendeeData(data);
    setError('');
    setCurrentStep(1);
  };

  // ── Step 2: Create order + handle payment ────────────────────
  const getOrderDetails = async (orderNumber, email) => {
    const query = email ? `?email=${encodeURIComponent(email)}` : '';
    return api.get(`/api/orders/${orderNumber}/${query}`);
  };

  const waitForOrderConfirmation = async (orderNumber, email) => {
    let lastOrder = null;
    const maxAttempts = 8;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      try {
        lastOrder = await getOrderDetails(orderNumber, email);
        if (lastOrder?.status === 'confirmed') return lastOrder;
      } catch {
        // swallow and retry
      }
      await sleep(2500);
    }
    return lastOrder;
  };

  const pollMpesaStatus = async (checkoutRequestId) => {
    if (!checkoutRequestId) {
      throw new Error('Missing M-Pesa checkout request id.');
    }
    const maxAttempts = 12;
    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      const statusResponse = await api.post('/api/payments/mpesa/query/', {
        checkout_request_id: checkoutRequestId,
      });
      const status = statusResponse?.status || statusResponse?.payment_status;
      if (status === 'succeeded') return true;
      if (status === 'failed') {
        throw new Error('M-Pesa payment failed. Please try again.');
      }
      await sleep(5000);
    }
    throw new Error('M-Pesa payment is still pending. Please confirm on your phone and try again.');
  };

  const handlePaymentSubmit = async (paymentData, stripeContext = {}) => {
    setIsProcessing(true);
    setError('');

    try {
      // 1. Create pending order once and reuse it while user retries payment.
      let currentOrderContext = orderContext;
      let orderTotal = currentOrderContext?.total ?? null;
      if (!currentOrderContext?.orderNumber) {
        const payload = {
          event_slug: slug,
          items: (cart.items || []).map(item => ({
            ticket_type_id: item.ticketTypeId,
            quantity: item.quantity,
            attendee_name: `${attendeeData.firstName} ${attendeeData.lastName}`,
            attendee_email: attendeeData.email,
          })),
          promo_code: cart.promoCode || null,
          payment_method: paymentData.paymentMethod || 'card',
          attendee_first_name: attendeeData.firstName,
          attendee_last_name: attendeeData.lastName,
          attendee_email: attendeeData.email,
          attendee_phone: attendeeData.phone,
          registration: attendeeData.registration || null,
        };

        const order = await api.post('/api/orders/create/', payload);
        // Support both direct response {order_number, status, total} and any legacy wrapping
        const orderData = order?.order_number ? order : (order?.data ?? order);
        const createdOrderNumber = orderData?.order_number;
        const simulationToken = orderData?.simulation_token;
        const orderStatus = orderData?.status;
        orderTotal = Number(orderData?.total ?? 0);
        if (!createdOrderNumber) {
          throw new Error('Order creation failed: no order number returned. Please try again.');
        }

        currentOrderContext = {
          orderNumber: createdOrderNumber,
          simulationToken: simulationToken || '',
          status: orderStatus || 'pending',
          total: orderTotal,
        };
        setOrderContext(currentOrderContext);
      }

      const confirmationPayload = {
        order_number: currentOrderContext.orderNumber,
        simulation_token: currentOrderContext.simulationToken,
        attendee_email: attendeeData.email,
      };

      // 2. Handle payment and only navigate after backend confirms order.
      const normalizedTotal = Number(orderTotal ?? 0);
      const isBackendFree = currentOrderContext.status === 'confirmed' || normalizedTotal === 0;
      if (isBackendFree) {
        setIsProcessing(false);
        navigate(`/confirmation/${currentOrderContext.orderNumber}?email=${encodeURIComponent(attendeeData.email)}`, {
          state: { event, orderId: currentOrderContext.orderNumber, attendeeData, paymentData, cart },
        });
        return;
      }

      if (SIMULATED_PAYMENTS_ENABLED) {
        await api.post('/api/payments/simulate/confirm/', confirmationPayload);
        setIsProcessing(false);
        navigate(`/confirmation/${currentOrderContext.orderNumber}?email=${encodeURIComponent(attendeeData.email)}`, {
          state: { event, orderId: currentOrderContext.orderNumber, attendeeData, paymentData, cart },
        });
        return;
      }

      if (paymentData.paymentMethod === 'card') {
        if (!stripeContext?.stripe || !stripeContext?.elements) {
          throw new Error('Card payments are not ready yet. Please try again in a moment.');
        }
        const intentResponse = await api.post('/api/payments/stripe/create-intent/', confirmationPayload);
        const clientSecret = intentResponse?.client_secret || intentResponse?.clientSecret;
        if (!clientSecret) {
          throw new Error('Unable to start card payment. Please try again.');
        }

        const cardElement = stripeContext.elements.getElement(CardElement);
        if (!cardElement) {
          throw new Error('Card details are not ready. Please check the form and try again.');
        }

        const { error: stripeError, paymentIntent } = await stripeContext.stripe.confirmCardPayment(
          clientSecret,
          {
            payment_method: {
              card: cardElement,
              billing_details: {
                name: paymentData.cardholderName || attendeeData?.firstName || '',
                email: attendeeData?.email || '',
                phone: attendeeData?.phone || '',
              },
            },
            return_url: `${window.location.origin}/confirmation/${currentOrderContext.orderNumber}?email=${encodeURIComponent(attendeeData.email)}`,
          }
        );

        if (stripeError) {
          throw new Error(stripeError.message || 'Card payment failed.');
        }

        const status = paymentIntent?.status;
        if (status && !['succeeded', 'processing'].includes(status)) {
          throw new Error('Payment requires additional steps. Please try again.');
        }

        await waitForOrderConfirmation(currentOrderContext.orderNumber, attendeeData.email);
        setIsProcessing(false);
        navigate(`/confirmation/${currentOrderContext.orderNumber}?email=${encodeURIComponent(attendeeData.email)}`, {
          state: { event, orderId: currentOrderContext.orderNumber, attendeeData, paymentData, cart },
        });
        return;
      }

      if (paymentData.paymentMethod === 'mpesa') {
        const mpesaResponse = await api.post('/api/payments/mpesa/initiate/', {
          ...confirmationPayload,
          phone: paymentData.mpesaPhone,
        });
        setMpesaPolling(true);
        setMpesaCountdown(60);
        const countdownInterval = setInterval(() => {
          setMpesaCountdown((prev) => (prev > 0 ? prev - 1 : 0));
        }, 1000);
        const checkoutRequestId =
          mpesaResponse?.checkout_request_id || mpesaResponse?.checkoutRequestId || mpesaResponse?.id;
        try {
          await pollMpesaStatus(checkoutRequestId);
          await waitForOrderConfirmation(currentOrderContext.orderNumber, attendeeData.email);
          clearInterval(countdownInterval);
          setMpesaPolling(false);
          setIsProcessing(false);
          navigate(`/confirmation/${currentOrderContext.orderNumber}?email=${encodeURIComponent(attendeeData.email)}`, {
            state: { event, orderId: currentOrderContext.orderNumber, attendeeData, paymentData, cart },
          });
        } catch (mpesaErr) {
          clearInterval(countdownInterval);
          setMpesaPolling(false);
          throw mpesaErr;
        }
        return;
      }

      setIsProcessing(false);
    } catch (err) {
      console.error('Checkout error:', err);
      const msg =
        err?.response?.error?.message ||
        err?.response?.detail ||
        err?.message ||
        'Something went wrong. Please try again.';
      setError(msg);
      setIsProcessing(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const themeColor = event?.theme_color || event?.themeColor || '#02338D';
  const accentColor = event?.accent_color || event?.accentColor || '#7C3AED';
  const currency = event?.currency || 'KES';
  const stripeEnabled = Boolean(STRIPE_PUBLISHABLE_KEY);

  // Loading
  if (!event || !cart || isJoiningQueue) {
    return (
      <PageWrapper>
        <div className="max-w-7xl mx-auto px-4 py-24 flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#02338D]" />
          <p className="text-[#64748B]">{isJoiningQueue ? 'Checking queue status...' : 'Loading checkout...'}</p>
        </div>
      </PageWrapper>
    );
  }

  // Virtual Queue Waiting Room UI
  if (queueState?.queue_active && !queueState?.can_purchase) {
    return (
      <PageWrapper>
        <div className="w-full max-w-lg mx-auto px-4 py-16 sm:py-24">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-3xl shadow-xl border border-[#E2E8F0] p-8 text-center overflow-hidden relative"
          >
            {/* Background Accent */}
            <div className="absolute top-0 left-0 w-full h-2 bg-[#02338D]" />
            
            <div className="w-20 h-20 bg-[#EFF6FF] text-[#02338D] mx-auto rounded-full flex items-center justify-center mb-6">
              <svg className="w-10 h-10 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            
            <h2 className="text-2xl font-bold text-[#0F172A] mb-3">You are in line</h2>
            <p className="text-[#64748B] mb-8">
              Due to high demand, you have been placed in a virtual queue. Please do not refresh this page.
            </p>
            
            <div className="bg-[#F8FAFC] rounded-2xl p-6 mb-8 border border-[#E2E8F0]">
              <div className="text-[#64748B] text-sm font-medium mb-1 uppercase tracking-wider">Your Position</div>
              <div className="text-5xl font-extrabold text-[#0F172A] tabular-nums tracking-tight">
                #{queueState.position?.toLocaleString() || '...'}
              </div>
              {queueState.ahead_of_you !== undefined && (
                <div className="text-sm font-medium text-[#02338D] mt-3 flex items-center justify-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#02338D] animate-ping" />
                  {queueState.ahead_of_you.toLocaleString()} people ahead of you
                </div>
              )}
            </div>
            
            {queueState.estimated_wait_seconds > 0 && (
              <div className="text-sm text-[#475569] bg-white border border-[#CBD5E1] rounded-xl py-3 px-4 flex items-center justify-center gap-2 mx-auto inline-flex">
                <svg className="w-4 h-4 text-[#64748B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Estimated wait time: <span className="font-semibold text-[#0F172A]">~{Math.ceil(queueState.estimated_wait_seconds / 60)} mins</span>
              </div>
            )}
            
            <p className="text-xs text-[#94A3B8] mt-6">
              When it is your turn, you will automatically be directed to checkout.
            </p>
          </motion.div>
        </div>
      </PageWrapper>
    );
  }

  const isFreeEvent = !cart.total || cart.total === 0;

  return (
    <PageWrapper>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 pb-8" style={{ overflowX: 'hidden' }}>

        {/* Step Indicator */}
        <div className="mb-6">
          <StepIndicator steps={steps} currentStep={currentStep} themeColor={themeColor} />
        </div>

        {/* M-Pesa Polling Overlay */}
        <AnimatePresence>
          {mpesaPolling && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
            >
              <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-sm w-full mx-4 text-center">
                <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-[#4CAF50]/10 flex items-center justify-center">
                  <svg className="w-10 h-10 text-[#4CAF50] animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-[#0F172A] mb-2">Check Your Phone</h3>
                <p className="text-[#64748B] text-sm mb-4">
                  An M-Pesa prompt has been sent to your phone. Enter your PIN to complete payment.
                </p>
                <div className="flex items-center justify-center gap-2 mb-4">
                  <span className="w-2 h-2 rounded-full bg-[#4CAF50] animate-ping" />
                  <span className="text-sm font-medium text-[#4CAF50]">Waiting for confirmation...</span>
                </div>
                <div className="text-3xl font-bold text-[#0F172A] tabular-nums">
                  0:{mpesaCountdown.toString().padStart(2, '0')}
                </div>
                <p className="text-xs text-[#94A3B8] mt-2">Do not close this page</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error Banner */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mb-6 flex items-start gap-3 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-medium">Something went wrong</p>
                <p className="text-sm mt-0.5">{error}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="grid lg:grid-cols-3 gap-8">

          {/* ── Main Content ── */}
          <div className="lg:col-span-2 min-w-0">
            <AnimatePresence mode="wait">
              {currentStep === 0 && (
                <AttendeeForm
                  key="attendee"
                  event={event}
                  cart={cart}
                  onSubmit={handleAttendeeSubmit}
                  themeColor={themeColor}
                />
              )}

              {currentStep === 1 && (
                <motion.div
                  key="payment"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -50 }}
                  transition={{ duration: 0.3 }}
                >
                  {/* Attendee summary banner */}
                  <div className="mb-6 p-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] flex items-center justify-between">
                    <div>
                      <p className="text-sm text-[#64748B]">Booking for</p>
                      <p className="font-semibold text-[#0F172A]">
                        {attendeeData?.firstName} {attendeeData?.lastName}
                      </p>
                      <p className="text-sm text-[#64748B]">{attendeeData?.email}</p>
                    </div>
                    <button
                      onClick={() => { setCurrentStep(0); setError(''); }}
                      className="text-sm text-[#02338D] hover:underline font-medium"
                    >
                      Edit
                    </button>
                  </div>

                  {isFreeEvent ? (
                    /* Free ticket — just a confirm button */
                    <div className="space-y-6">
                      <div className="p-6 rounded-2xl border border-[#E2E8F0] bg-white text-center">
                        <CheckCircle2 className="w-14 h-14 mx-auto mb-3 text-[#16A34A]" />
                        <h2 className="text-xl font-semibold text-[#0F172A] mb-1">Free Ticket</h2>
                        <p className="text-[#64748B] text-sm">No payment needed - click below to claim your ticket.</p>
                      </div>
                      <button
                        disabled={isProcessing}
                        onClick={() => handlePaymentSubmit({ paymentMethod: 'free' })}
                        className="w-full py-4 rounded-xl font-semibold text-white transition-all disabled:opacity-60 flex items-center justify-center gap-2"
                        style={{ background: `linear-gradient(135deg, ${themeColor}, ${accentColor})` }}
                      >
                        {isProcessing
                          ? <><Loader2 className="w-5 h-5 animate-spin" /> Processing...</>
                          : 'Claim Free Ticket'}
                      </button>
                    </div>
                  ) : (
                    <Elements stripe={stripePromise}>
                      <PaymentForm
                        event={event}
                        cart={cart}
                        onSubmit={handlePaymentSubmit}
                        themeColor={themeColor}
                        isProcessing={isProcessing}
                        stripeEnabled={stripeEnabled}
                      />
                    </Elements>
                  )}

                  <div className="mt-4">
                    <button
                      onClick={() => { setCurrentStep(0); setError(''); }}
                      className="text-[#64748B] hover:text-[#0F172A] text-sm font-medium"
                    >
                      &larr; Back to details
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ── Order Summary Sidebar ── */}
          <aside className="lg:col-span-1 min-w-0">
            <div className="sticky top-24">
              <div className="bg-white border border-[#E2E8F0] rounded-2xl overflow-hidden shadow-sm">
                {/* Coloured header bar */}
                <div
                  className="px-6 py-4 text-white"
                  style={{ background: `linear-gradient(135deg, ${themeColor}, ${accentColor})` }}
                >
                  <p className="text-xs font-medium opacity-80 uppercase tracking-wider">Order Summary</p>
                  <p className="font-semibold truncate mt-0.5">{event.title}</p>
                </div>

                <div className="p-6 space-y-4">
                  {/* Event meta */}
                  <div className="space-y-1.5 pb-4 border-b border-[#E2E8F0]">
                    <div className="flex items-center gap-2 text-sm text-[#64748B]">
                      <Calendar className="w-4 h-4 flex-shrink-0" />
                      <span>{formatDate(event.start_date || event.date)}</span>
                    </div>
                    {(event.venue_name || event.city) && (
                      <div className="flex items-center gap-2 text-sm text-[#64748B]">
                        <MapPin className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{event.venue_name || event.city}</span>
                      </div>
                    )}
                  </div>

                  {/* Ticket details */}
                  <div className="space-y-2 pb-4 border-b border-[#E2E8F0] text-sm">
                    {(cart.items || []).map((item, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span className="text-[#64748B]">
                          {item.ticketType} x {item.quantity}
                        </span>
                        <span className="font-medium text-[#0F172A]">
                          {currency} {((item.unitPrice || 0) * (item.quantity || 1)).toLocaleString()}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Price breakdown */}
                  <div className="space-y-2 pb-4 border-b border-[#E2E8F0] text-sm">
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Subtotal</span>
                      <span className="text-[#0F172A]">
                        {currency} {((cart.items || []).reduce((sum, i) => sum + (i.unitPrice || 0) * (i.quantity || 0), 0)).toLocaleString()}
                      </span>
                    </div>
                    {cart.discount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-[#16A34A]">Discount</span>
                        <span className="text-[#16A34A]">-{currency} {cart.discount.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-[#64748B]">Service fee</span>
                      <span className="text-[#0F172A]">{currency} {(cart.serviceFee || 0).toLocaleString()}</span>
                    </div>
                  </div>

                  {/* Total */}
                  <div className="flex justify-between items-center">
                    <span className="font-semibold text-[#0F172A]">Total</span>
                    <span className="text-2xl font-bold" style={{ color: themeColor }}>
                      {isFreeEvent ? 'Free' : `${currency} ${(cart.total || 0).toLocaleString()}`}
                    </span>
                  </div>

                  {/* Trust badge */}
                  <div className="flex items-center justify-center gap-1.5 text-xs text-[#94A3B8] pt-2">
                    <span>🔒</span>
                    <span>Secure - Instant QR ticket - SSL encrypted</span>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </PageWrapper>
  );
};

export default CheckoutPage;

