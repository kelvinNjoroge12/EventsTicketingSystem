import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, ChevronDown, ChevronUp, Tag, Check, ShoppingCart } from 'lucide-react';
import CustomButton from '../ui/CustomButton';

const TicketBox = ({
  event,
  onGetTickets,
  themeColor,
}) => {
  // Guard: don't render if no tickets are available
  if (!event.tickets || event.tickets.length === 0) {
    return (
      <div className="bg-white rounded-2xl shadow-lg p-6" style={{ borderTop: `4px solid ${themeColor}` }}>
        <p className="text-center text-[#64748B] py-8">No tickets available for this event yet.</p>
      </div>
    );
  }

  // Track quantity per ticket type: { [ticketId]: quantity }
  const [quantities, setQuantities] = useState(() => {
    const initial = {};
    event.tickets.forEach(t => { initial[t.id] = 0; });
    // Default: first ticket gets quantity 1
    if (event.tickets.length > 0) {
      initial[event.tickets[0].id] = 1;
    }
    return initial;
  });

  const [promoCode, setPromoCode] = useState('');
  const [isPromoExpanded, setIsPromoExpanded] = useState(false);
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);

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
  const selectedTickets = event.tickets.filter(t => (quantities[t.id] || 0) > 0);
  const totalQuantity = selectedTickets.reduce((sum, t) => sum + quantities[t.id], 0);

  const calculatePrice = () => {
    let subtotal = 0;
    selectedTickets.forEach(t => {
      subtotal += t.price * quantities[t.id];
    });

    let discount = 0;
    if (appliedPromo) {
      discount = appliedPromo.discountType === 'percent'
        ? Math.round(subtotal * (appliedPromo.discountValue / 100))
        : appliedPromo.discountValue;
    }

    const serviceFee = Math.round((subtotal - discount) * 0.03);
    const total = subtotal - discount + serviceFee;

    return { subtotal, discount, serviceFee, total };
  };

  const { subtotal, discount, serviceFee, total } = calculatePrice();

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
            {event.tickets.map((ticket) => {
              const qty = quantities[ticket.id] || 0;
              const isSelected = qty > 0;
              return (
                <div
                  key={ticket.id}
                  className={`
                    p-4 rounded-xl border-2 transition-all
                    ${isSelected
                      ? 'border-[#1E4DB7] bg-[#EFF6FF]'
                      : 'border-[#E2E8F0] hover:border-[#1E4DB7]/30'}
                  `}
                >
                  <div className="flex items-start justify-between mb-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-[#0F172A] break-words leading-tight mb-1">
                        {ticket.type || ticket.name}
                      </p>
                      <p className="text-xs text-[#64748B] break-words">
                        {ticket.remaining > 0 ? `${ticket.remaining} remaining` : 'Sold out'}
                        {ticket.description && ` · ${ticket.description}`}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className="font-semibold text-[#1E4DB7] whitespace-nowrap">
                        {ticket.price === 0 ? 'Free' : `${event.currency} ${ticket.price.toLocaleString()}`}
                      </p>
                    </div>
                  </div>
                  {/* Quantity controls */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => handleQuantityChange(ticket.id, -1)}
                      disabled={qty <= 0}
                      className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center hover:border-[#1E4DB7] hover:text-[#1E4DB7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label={`Decrease ${ticket.type || ticket.name} quantity`}
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="w-8 text-center font-semibold text-sm">{qty}</span>
                    <button
                      onClick={() => handleQuantityChange(ticket.id, 1)}
                      disabled={qty >= Math.min(10, ticket.remaining) || ticket.remaining <= 0}
                      className="w-8 h-8 rounded-lg border border-[#E2E8F0] flex items-center justify-center hover:border-[#1E4DB7] hover:text-[#1E4DB7] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                      aria-label={`Increase ${ticket.type || ticket.name} quantity`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Promo Code */}
        <div className="mb-6">
          <button
            onClick={() => setIsPromoExpanded(!isPromoExpanded)}
            className="flex items-center gap-2 text-sm text-[#1E4DB7] hover:underline"
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
                      focus:outline-none focus:ring-2 focus:ring-[#1E4DB7]
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

        {/* CTA Button */}
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
  );
};

export default TicketBox;
