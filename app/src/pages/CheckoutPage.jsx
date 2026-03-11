import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Calendar, MapPin, Ticket, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import StepIndicator from '../components/checkout/StepIndicator';
import AttendeeForm from '../components/checkout/AttendeeForm';
import PaymentForm from '../components/checkout/PaymentForm';
import { fetchEvent } from '../lib/eventsApi';
import { api } from '../lib/apiClient';
import { useCart } from '../context/CartContext';

const SIMULATED_PAYMENTS_ENABLED =
  import.meta.env.VITE_ENABLE_SIMULATED_PAYMENTS === 'true' || import.meta.env.DEV;

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

  // ── Step 1: Attendee details ─────────────────────────────────
  // Just store locally and advance — no API call needed here.
  const handleAttendeeSubmit = (data) => {
    setAttendeeData(data);
    setError('');
    setCurrentStep(1);
  };

  // ── Step 2: Create order + handle payment ────────────────────
  const handlePaymentSubmit = async (paymentData) => {
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
        };

        const order = await api.post('/api/orders/create/', payload);
        const createdOrderNumber = order?.order_number;
        const simulationToken = order?.simulation_token;
        const orderStatus = order?.status;
        orderTotal = Number(order?.total ?? 0);
        if (!createdOrderNumber) {
          throw new Error('Order creation failed. Please try again.');
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
        navigate(`/confirmation/${currentOrderContext.orderNumber}`, {
          state: { event, orderId: currentOrderContext.orderNumber, attendeeData, paymentData, cart },
        });
        return;
      }

      if (SIMULATED_PAYMENTS_ENABLED) {
        await api.post('/api/payments/simulate/confirm/', confirmationPayload);
        setIsProcessing(false);
        navigate(`/confirmation/${currentOrderContext.orderNumber}`, {
          state: { event, orderId: currentOrderContext.orderNumber, attendeeData, paymentData, cart },
        });
        return;
      }

      if (paymentData.paymentMethod === 'card') {
        await api.post('/api/payments/stripe/create-intent/', confirmationPayload);
        setError('Payment intent created. Complete the Stripe frontend confirmation step to finalize the order.');
        setIsProcessing(false);
        return;
      }

      if (paymentData.paymentMethod === 'mpesa') {
        await api.post('/api/payments/mpesa/initiate/', {
          ...confirmationPayload,
          phone: paymentData.mpesaPhone,
        });
        setError('M-Pesa request initiated. Complete callback confirmation before showing success.');
        setIsProcessing(false);
        return;
      }

      setIsProcessing(false);
    } catch (err) {
      console.error('Checkout error:', err);
      const msg =
        err?.response?.data?.detail ||
        err?.response?.data?.message ||
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

  const themeColor = event?.theme_color || event?.themeColor || '#1E4DB7';
  const accentColor = event?.accent_color || event?.accentColor || '#7C3AED';
  const currency = event?.currency || 'KES';

  // Loading
  if (!event || !cart) {
    return (
      <PageWrapper>
        <div className="max-w-7xl mx-auto px-4 py-24 flex flex-col items-center gap-4">
          <Loader2 className="w-10 h-10 animate-spin text-[#1E4DB7]" />
          <p className="text-[#64748B]">Loading checkout...</p>
        </div>
      </PageWrapper>
    );
  }

  const isFreeEvent = !cart.total || cart.total === 0;

  return (
    <PageWrapper>
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" style={{ overflowX: 'hidden' }}>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-[#0F172A] mb-1">
            Secure Checkout
          </h1>
          <p className="text-[#64748B]">Completing purchase for <span className="font-medium text-[#0F172A]">{event.title}</span></p>
        </div>

        {/* Step Indicator */}
        <div className="mb-8">
          <StepIndicator steps={steps} currentStep={currentStep} themeColor={themeColor} />
        </div>

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
                      className="text-sm text-[#1E4DB7] hover:underline font-medium"
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
                    <PaymentForm
                      event={event}
                      cart={cart}
                      onSubmit={handlePaymentSubmit}
                      themeColor={themeColor}
                      isProcessing={isProcessing}
                    />
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
