import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, ChevronDown, ChevronUp, Tag, Check, ShoppingCart } from 'lucide-react';
import CustomButton from '../ui/CustomButton';
import { api } from '@/lib/apiClient';

const TicketBox = ({
  event,
  onGetTickets,
  themeColor,
}) => {
  const tickets = Array.isArray(event.tickets) ? event.tickets : [];

  // Track quantity per ticket type: { [ticketId]: quantity }
  const [quantities, setQuantities] = useState(() => {
    const initial = {};
    tickets.forEach(t => { initial[t.id] = 0; });
    // Default: first available ticket gets quantity 1
    const firstAvailable = tickets.find(t => (t.remaining ?? 0) > 0);
    if (firstAvailable) {
      initial[firstAvailable.id] = 1;
    }
    return initial;
  });

  const [promoCode, setPromoCode] = useState('');
  const [isPromoExpanded, setIsPromoExpanded] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [waitlistStatus, setWaitlistStatus] = useState({ loading: false, error: '', success: '' });

  const toCents = (value) => Math.round(Number(value || 0) * 100);
  const fromCents = (value) => Number((value / 100).toFixed(2));

  const handleQuantityChange = (ticketId, delta) => {
    setQuantities(prev => {
      const ticket = event.tickets.find(t => t.id === ticketId);
      const current = prev[ticketId] || 0;
      const newQty = current + delta;
      if (newQty < 0 || newQty > Math.min(10, ticket?.remaining || 10)) return prev;
      return { ...prev, [ticketId]: newQty };
    });
  };

  const handleApplyPromo = () => {
    setPromoError('');
    setPromoSuccess('');

    if (!promoCode.trim()) return;

    const validPromo = event.promoCodes?.find(
      p => p.code.toLowerCase() === promoCode.toLowerCase()
    );

    if (validPromo) {
      setAppliedPromo(validPromo);
      setPromoSuccess(`Promo applied! ${validPromo.discountValue}% off`);
    } else {
      setPromoError('Invalid promo code');
      setAppliedPromo(null);
    }
  };

  // Get selected tickets (quantity > 0)
  const selectedTickets = tickets.filter(t => (quantities[t.id] || 0) > 0);
  const totalQuantity = selectedTickets.reduce((sum, t) => sum + quantities[t.id], 0);

  const calculatePrice = () => {
    let subtotalCents = 0;
    selectedTickets.forEach(t => {
      subtotalCents += toCents(t.price) * quantities[t.id];
    });

    let discountCents = 0;
    if (appliedPromo) {
      discountCents = appliedPromo.discountType === 'percent'
        ? Math.round(subtotalCents * (appliedPromo.discountValue / 100))
        : toCents(appliedPromo.discountValue);
    }

    const serviceFeeCents = Math.round((subtotalCents - discountCents) * 0.03);
    const totalCents = subtotalCents - discountCents + serviceFeeCents;

    return {
      subtotal: fromCents(subtotalCents),
      discount: fromCents(discountCents),
      serviceFee: fromCents(serviceFeeCents),
      total: fromCents(totalCents),
    };
  };

  const { subtotal, discount, serviceFee, total } = calculatePrice();
  const allSoldOut = tickets.length > 0 ? tickets.every((ticket) => (ticket.remaining ?? 0) <= 0) : true;
  const waitlistAllowed = allSoldOut && (event.enableWaitlist ?? event.enable_waitlist) && event.slug;

  const handleWaitlistSubmit = async () => {
    setWaitlistStatus({ loading: false, error: '', success: '' });
    if (!waitlistForm.name.trim() || !waitlistForm.email.trim()) {
      setWaitlistStatus({ loading: false, error: 'Name and email are required.', success: '' });
      return;
    }
    if (!event.slug) {
      setWaitlistStatus({ loading: false, error: 'Event information is missing.', success: '' });
      return;
    }
    try {
      setWaitlistStatus({ loading: true, error: '', success: '' });
      await api.post(`/api/events/${event.slug}/waitlist/join/`, {
        name: waitlistForm.name.trim(),
        email: waitlistForm.email.trim(),
        phone: waitlistForm.phone.trim(),
        notes: waitlistForm.notes.trim(),
      });
      setWaitlistStatus({ loading: false, error: '', success: 'You are on the waitlist. We will email you when tickets open.' });
      setWaitlistForm({ name: '', email: '', phone: '', notes: '' });
    } catch (err) {
      setWaitlistStatus({ loading: false, error: err?.message || 'Failed to join waitlist.', success: '' });
    }
  };

  const handleGetTickets = () => {
    const items = selectedTickets.map(t => ({
      ticketTypeId: t.id,
      ticketType: t.type || t.name,
      quantity: quantities[t.id],
      unitPrice: t.price,
    }));

    onGetTickets({
      items,
      promoCode: appliedPromo?.code || null,
      discount,
      serviceFee,
      total,
    });
  };

  return (
    <div
      className="bg-white rounded-2xl shadow-lg overflow-hidden"
      style={{ borderTop: `4px solid ${themeColor}` }}
    >
      <div className="p-6">
        {/* Ticket Type Selection with Quantities */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-[#0F172A] mb-3">
            Select Tickets
          </label>
          <div className="space-y-3">
            {tickets.length > 0 ? tickets.map((ticket) => {
              const qty = quantities[ticket.id] || 0;
              const isSelected = qty > 0;
              const isSoldOut = (ticket.remaining ?? 0) <= 0;
              return (
                <div
                  key={ticket.id}
                  className={`
                    p-4 rounded-xl border-2 transition-all
                    ${isSoldOut
                      ? 'border-[#F1F5F9] bg-[#F8FAFC]'
                      : isSelected
                        ? 'border-[#02338D] bg-[#EFF6FF]'
                        : 'border-[#E2E8F0] hover:border-[#02338D]/30'}
                  `}
                >
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className={`font-medium break-words leading-tight mb-1 ${isSoldOut ? 'text-[#94A3B8] line-through decoration-[#94A3B8]/50' : 'text-[#0F172A]'}`}>
                        {ticket.type || ticket.name}
                      </p>
                      <p className="text-xs text-[#64748B] break-words">
                        {isSoldOut ? 'Sold out' : `${ticket.remaining} remaining`}
                        {ticket.description && ` · ${ticket.description}`}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`font-semibold whitespace-nowrap ${isSoldOut ? 'text-[#94A3B8]' : 'text-[#02338D]'}`}>
                        {ticket.price === 0 ? 'Free' : `${event.currency} ${ticket.price.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  {/* Quantity controls */}
                  <div className="flex items-center gap-3">
                    {isSoldOut ? (
                      <span className="text-xs font-bold uppercase tracking-wider text-[#94A3B8] bg-[#F1F5F9] px-3 py-1.5 rounded-lg border border-[#E2E8F0]">
                        Sold Out
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleQuantityChange(ticket.id, -1)}
                          disabled={qty <= 0}
                          className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center hover:border-[#02338D] hover:text-[#02338D] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label={`Decrease ${ticket.type || ticket.name} quantity`}
                        >
                          <Minus className="w-4 h-4" />
                        </button>
                        <span className="w-8 text-center font-semibold text-sm">{qty}</span>
                        <button
                          onClick={() => handleQuantityChange(ticket.id, 1)}
                          disabled={qty >= Math.min(10, ticket.remaining)}
                          className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center hover:border-[#02338D] hover:text-[#02338D] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                          aria-label={`Increase ${ticket.type || ticket.name} quantity`}
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            }) : (
              <div className="rounded-xl border border-dashed border-[#E2E8F0] p-6 text-center text-sm text-[#64748B]">
                No tickets available for this event yet.
              </div>
            )}
          </div>
        </div>

        {/* Promo Code */}
        <div className="mb-6">
          <button
            onClick={() => setIsPromoExpanded(!isPromoExpanded)}
            className="flex items-center gap-2 text-sm text-[#02338D] hover:underline"
          >
            <Tag className="w-4 h-4" />
            Have a promo code?
            {isPromoExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          <AnimatePresence>
            {isPromoExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <div className="pt-3 flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Enter code"
                    className={`
                      flex-1 px-3 py-2 border rounded-lg text-sm
                      focus:outline-none focus:ring-2 focus:ring-[#02338D]
                      ${promoError ? 'border-[#DC2626]' : 'border-[#E2E8F0]'}
                    `}
                  />
                  <CustomButton
                    variant="outline"
                    size="sm"
                    onClick={handleApplyPromo}
                  >
                    Apply
                  </CustomButton>
                </div>

                <AnimatePresence>
                  {promoError && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-2 text-sm text-[#DC2626]"
                    >
                      {promoError}
                    </motion.p>
                  )}
                  {promoSuccess && (
                    <motion.p
                      initial={{ opacity: 0, y: -5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="mt-2 text-sm text-[#16A34A] flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      {promoSuccess}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Price Breakdown */}
        <div className="space-y-2 mb-6 pb-6 border-b border-[#E2E8F0]">
          {selectedTickets.map(t => (
            <div key={t.id} className="flex justify-between text-sm">
              <span className="text-[#64748B]">
                {t.type || t.name} × {quantities[t.id]}
              </span>
              <span className="text-[#0F172A]">{event.currency} {(t.price * quantities[t.id]).toLocaleString()}</span>
            </div>
          ))}
          {selectedTickets.length === 0 && (
            <div className="text-center text-sm text-[#94A3B8] py-2">
              Select at least one ticket
            </div>
          )}
          {discount > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-[#16A34A]">Discount</span>
              <span className="text-[#16A34A]">-{event.currency} {discount.toLocaleString()}</span>
            </div>
          )}
          {totalQuantity > 0 && (
            <>
              <div className="flex justify-between text-sm">
                <span className="text-[#64748B]">Service fee</span>
                <span className="text-[#0F172A]">{event.currency} {serviceFee.toLocaleString()}</span>
              </div>
              <div className="flex justify-between font-semibold text-lg pt-2">
                <span className="text-[#0F172A]">Total</span>
                <span style={{ color: themeColor }}>{event.currency} {total.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>

        {waitlistAllowed && (
          <div className="mb-6 p-4 border border-[#E2E8F0] rounded-xl bg-[#F8FAFC]">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Sold out — join the waitlist</p>
                <p className="text-xs text-[#64748B]">We will notify you when more tickets become available.</p>
              </div>
              <CustomButton
                variant="outline"
                size="sm"
                onClick={() => setShowWaitlist((prev) => !prev)}
              >
                {showWaitlist ? 'Hide form' : 'Join waitlist'}
              </CustomButton>
            </div>

            <AnimatePresence>
              {showWaitlist && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <input
                      type="text"
                      placeholder="Full name *"
                      value={waitlistForm.name}
                      onChange={(e) => setWaitlistForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#02338D]"
                    />
                    <input
                      type="email"
                      placeholder="Email address *"
                      value={waitlistForm.email}
                      onChange={(e) => setWaitlistForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#02338D]"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (optional)"
                      value={waitlistForm.phone}
                      onChange={(e) => setWaitlistForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#02338D]"
                    />
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={waitlistForm.notes}
                      onChange={(e) => setWaitlistForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className="px-3 py-2 border border-[#E2E8F0] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#02338D]"
                    />
                  </div>

                  {waitlistStatus.error && (
                    <p className="mt-2 text-xs text-[#DC2626]">{waitlistStatus.error}</p>
                  )}
                  {waitlistStatus.success && (
                    <p className="mt-2 text-xs text-[#16A34A]">{waitlistStatus.success}</p>
                  )}

                  <div className="mt-3">
                    <CustomButton
                      variant="primary"
                      size="sm"
                      onClick={handleWaitlistSubmit}
                      disabled={waitlistStatus.loading}
                    >
                      {waitlistStatus.loading ? 'Joining...' : 'Submit waitlist'}
                    </CustomButton>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

        {/* CTA Button */}
        <div className="lg:sticky lg:bottom-0 lg:z-10 lg:-mx-6 lg:px-6 lg:pt-4 lg:pb-4 lg:bg-white lg:border-t lg:border-[#E2E8F0]">
          <CustomButton
            variant="primary"
            fullWidth
            onClick={handleGetTickets}
            disabled={totalQuantity === 0}
            className="py-4"
            style={{ backgroundColor: themeColor }}
          >
            <span className="flex items-center justify-center gap-2">
              <ShoppingCart className="w-5 h-5" />
              {totalQuantity === 0
                ? 'Select Tickets'
                : `Get ${totalQuantity} Ticket${totalQuantity > 1 ? 's' : ''}`
              }
            </span>
          </CustomButton>

          {/* Trust Badges */}
          <div className="mt-4 flex items-center justify-center gap-1 text-xs text-[#64748B]">
            <span>🔒</span>
            <span>Secure Checkout · Instant QR Ticket · Free Cancellation</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TicketBox;


