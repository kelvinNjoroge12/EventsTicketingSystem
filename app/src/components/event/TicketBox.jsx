import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, Tag, Check, ShoppingCart } from 'lucide-react';
import CustomButton from '../ui/CustomButton';
import { api } from '@/lib/apiClient';

const TicketBox = ({
  event,
  onGetTickets,
  themeColor,
  layout = 'default',
}) => {
  const tickets = Array.isArray(event.tickets) ? event.tickets : [];
  const promoCodes = Array.isArray(event.promoCodes)
    ? event.promoCodes
    : Array.isArray(event.promo_codes)
      ? event.promo_codes
      : [];
  const isPastEvent = event.isPast || event.timeState === 'past' || event.status === 'completed';
  const workflowStatus = event.workflowStatus || event.status;
  const isUnavailableForSale = !['published', 'completed'].includes(workflowStatus);
  const isSidebarLayout = layout === 'sidebar';
  const isMobileLayout = layout === 'mobile';
  const registrationCategories = Array.isArray(event.registrationCategories)
    ? event.registrationCategories
    : Array.isArray(event.registration_categories)
      ? event.registration_categories
      : [];

  const activeCategories = registrationCategories.filter((cat) => cat && cat.is_active !== false);
  const hasCategoryTickets = activeCategories.length > 0 && tickets.some((ticket) => ticket.registration_category);
  const categoryOptions = hasCategoryTickets
    ? activeCategories
      .filter((cat) => tickets.some((ticket) => String(ticket.registration_category) === String(cat.id)))
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    : [];

  const getCategoryLabel = (cat) => {
    if (!cat) return '';
    if (cat.category === 'guest') return cat.label || 'Guest';
    if (cat.category === 'student') return 'Student';
    if (cat.category === 'alumni') return 'Alumni';
    return cat.label || cat.category;
  };

  const buildQuantitiesForCategory = (categoryId) => {
    const initial = {};
    tickets.forEach((ticket) => {
      initial[ticket.id] = 0;
    });

    const scopedTickets = categoryId
      ? tickets.filter((ticket) => String(ticket.registration_category) === String(categoryId))
      : tickets;
    const firstAvailable = scopedTickets.find((ticket) => (ticket.remaining ?? 0) > 0);

    if (firstAvailable) {
      initial[firstAvailable.id] = 1;
    }

    return initial;
  };

  const defaultCategoryId = categoryOptions[0]?.id || null;
  const [selectedCategoryId, setSelectedCategoryId] = useState(defaultCategoryId);
  const [quantities, setQuantities] = useState(() => buildQuantitiesForCategory(defaultCategoryId));
  const [promoCode, setPromoCode] = useState('');
  const [promoError, setPromoError] = useState('');
  const [promoSuccess, setPromoSuccess] = useState('');
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [showWaitlist, setShowWaitlist] = useState(false);
  const [waitlistForm, setWaitlistForm] = useState({ name: '', email: '', phone: '', notes: '' });
  const [waitlistStatus, setWaitlistStatus] = useState({ loading: false, error: '', success: '' });

  useEffect(() => {
    if (hasCategoryTickets && categoryOptions.length > 0 && !selectedCategoryId) {
      const nextId = categoryOptions[0].id;
      setSelectedCategoryId(nextId);
      setQuantities(buildQuantitiesForCategory(nextId));
    }
  }, [categoryOptions, hasCategoryTickets, selectedCategoryId]);

  const toCents = (value) => Math.round(Number(value || 0) * 100);
  const fromCents = (value) => Number((value / 100).toFixed(2));

  const handleQuantityChange = (ticketId, delta) => {
    if (isPastEvent || isUnavailableForSale) return;

    setQuantities((prev) => {
      const ticket = tickets.find((item) => item.id === ticketId);
      const current = prev[ticketId] || 0;
      const nextQuantity = current + delta;

      if (nextQuantity < 0 || nextQuantity > Math.min(10, ticket?.remaining || 10)) {
        return prev;
      }

      return { ...prev, [ticketId]: nextQuantity };
    });
  };

  const handleCategoryChange = (categoryId) => {
    if (isPastEvent || isUnavailableForSale) return;
    setSelectedCategoryId(categoryId);
    setQuantities(buildQuantitiesForCategory(categoryId));
  };

  const handleApplyPromo = () => {
    if (isPastEvent || isUnavailableForSale) return;

    setPromoError('');
    setPromoSuccess('');

    if (!promoCode.trim()) return;

    const validPromo = promoCodes.find(
      (promo) => promo.code?.toLowerCase() === promoCode.trim().toLowerCase(),
    );

    if (validPromo) {
      setAppliedPromo(validPromo);
      setPromoSuccess(`Promo applied! ${validPromo.discountValue}% off`);
      return;
    }

    setPromoError('Invalid promo code');
    setAppliedPromo(null);
  };

  const displayedTickets = hasCategoryTickets && selectedCategoryId
    ? tickets.filter((ticket) => String(ticket.registration_category) === String(selectedCategoryId))
    : tickets;
  const selectedTickets = displayedTickets.filter((ticket) => (quantities[ticket.id] || 0) > 0);
  const totalQuantity = selectedTickets.reduce((sum, ticket) => sum + (quantities[ticket.id] || 0), 0);

  const calculatePrice = () => {
    let subtotalCents = 0;

    selectedTickets.forEach((ticket) => {
      subtotalCents += toCents(ticket.price) * (quantities[ticket.id] || 0);
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
      discount: fromCents(discountCents),
      serviceFee: fromCents(serviceFeeCents),
      total: fromCents(totalCents),
    };
  };

  const { discount, serviceFee, total } = calculatePrice();
  const allSoldOut = displayedTickets.length > 0
    ? displayedTickets.every((ticket) => (ticket.remaining ?? 0) <= 0)
    : true;
  const waitlistAllowed =
    !isPastEvent &&
    !isUnavailableForSale &&
    allSoldOut &&
    (event.enableWaitlist ?? event.enable_waitlist) &&
    event.slug;

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
      setWaitlistStatus({
        loading: false,
        error: '',
        success: 'You are on the waitlist. We will email you when tickets open.',
      });
      setWaitlistForm({ name: '', email: '', phone: '', notes: '' });
    } catch (err) {
      setWaitlistStatus({
        loading: false,
        error: err?.message || 'Failed to join waitlist.',
        success: '',
      });
    }
  };

  const handleGetTickets = () => {
    if (isPastEvent || isUnavailableForSale) return;

    const selectedCategory = categoryOptions.find((cat) => String(cat.id) === String(selectedCategoryId));
    const registration = selectedCategory
      ? {
        categoryId: selectedCategory.id,
        categoryType: selectedCategory.category,
        categoryLabel: getCategoryLabel(selectedCategory),
        fixedFields: {
          requireStudentEmail: Boolean(selectedCategory.require_student_email),
          requireAdmissionNumber: Boolean(selectedCategory.require_admission_number),
          askGraduationYear: Boolean(selectedCategory.ask_graduation_year),
          askCourse: Boolean(selectedCategory.ask_course),
          askSchool: Boolean(selectedCategory.ask_school),
          askLocation: Boolean(selectedCategory.ask_location),
        },
        questions: Array.isArray(selectedCategory.questions) ? selectedCategory.questions : [],
      }
      : null;

    const items = selectedTickets.map((ticket) => ({
      ticketTypeId: ticket.id,
      ticketType: ticket.type || ticket.name,
      quantity: quantities[ticket.id],
      unitPrice: ticket.price,
    }));

    onGetTickets({
      items,
      promoCode: appliedPromo?.code || null,
      discount,
      serviceFee,
      total,
      registration,
    });
  };

  const shellClasses = isSidebarLayout
    ? 'bg-white rounded-b-2xl border border-[#E2E8F0] border-t-0 shadow-[0_22px_44px_-34px_rgba(15,23,42,0.55)] flex flex-col'
    : 'bg-white rounded-2xl shadow-lg flex flex-col';
  const shellStyle = isSidebarLayout || isMobileLayout ? undefined : { borderTop: `4px solid ${themeColor}` };
  const bodyClasses = isSidebarLayout
    ? 'p-2 pb-3'
    : isMobileLayout
      ? 'p-3 pb-8'
      : 'p-6 pb-16 lg:pb-24';
  const sectionGapClass = isSidebarLayout ? 'mb-2' : isMobileLayout ? 'mb-3' : 'mb-6';
  const sectionLabelClasses = isSidebarLayout
    ? 'mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-[#475569]'
    : isMobileLayout
      ? 'mb-2 block text-xs font-semibold uppercase tracking-[0.12em] text-[#475569]'
    : 'mb-3 block text-sm font-medium text-[#0F172A]';
  const ticketListGapClass = isSidebarLayout ? 'space-y-0.5' : isMobileLayout ? 'space-y-2' : 'space-y-3';
  const ticketCardClasses = isSidebarLayout ? 'rounded-lg p-1.5' : isMobileLayout ? 'rounded-xl p-3' : 'rounded-xl p-4';
  const ticketCardMarginClass = isSidebarLayout ? 'mb-1 gap-1' : isMobileLayout ? 'mb-2 gap-2' : 'mb-3 gap-3';
  const quantityButtonClasses = isSidebarLayout ? 'h-[22px] w-[22px]' : isMobileLayout ? 'h-7 w-7' : 'h-8 w-8';
  const footerClasses = isSidebarLayout
    ? 'border-t border-[#E2E8F0] bg-white p-2 lg:sticky lg:bottom-0 lg:z-10 shadow-[0_-20px_35px_-32px_rgba(15,23,42,0.75)]'
    : isMobileLayout
      ? 'border-t border-[#E2E8F0] bg-white p-3 sticky bottom-0 z-10 shadow-[0_-16px_24px_-20px_rgba(15,23,42,0.55)]'
    : 'border-t border-[#E2E8F0] bg-white p-6 lg:sticky lg:bottom-0 lg:z-10';
  const footerButtonClass = isSidebarLayout ? 'py-2 text-sm' : isMobileLayout ? 'py-3 text-sm' : 'py-4';
  const couponClasses = isSidebarLayout ? 'rounded-lg p-1.5' : isMobileLayout ? 'rounded-xl p-3' : 'rounded-xl p-4';
  const waitlistClasses = isSidebarLayout ? 'mb-2 rounded-lg p-2' : isMobileLayout ? 'mb-3 rounded-xl p-3' : 'mb-6 rounded-xl p-4';
  const breakdownClasses = isSidebarLayout ? 'mb-2 space-y-0.5 pb-2' : isMobileLayout ? 'mb-3 space-y-1 pb-3' : 'mb-6 space-y-2 pb-6';

  return (
    <div className={shellClasses} style={shellStyle}>
      <div className={bodyClasses}>
        {isPastEvent && (
          <div className={`${sectionGapClass} rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 text-sm text-[#475569]`}>
            Ticket sales are closed because this event has already passed. You can still view the event details below.
          </div>
        )}

        {!isPastEvent && isUnavailableForSale && (
          <div className={`${sectionGapClass} rounded-xl border border-[#FDE68A] bg-[#FFF7E6] p-4 text-sm text-[#8A620E]`}>
            Ticket sales are unavailable until this event is approved and published.
          </div>
        )}

        {hasCategoryTickets && categoryOptions.length > 0 && (
          <div className={sectionGapClass}>
            <label className={sectionLabelClasses}>
              Choose your category
            </label>
            <div className={`flex items-center rounded-xl bg-[#F1F5F9] p-1 ${isSidebarLayout ? 'gap-0.5' : isMobileLayout ? 'gap-1' : 'gap-2'}`}>
              {categoryOptions.map((cat) => {
                const active = String(cat.id) === String(selectedCategoryId);

                return (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.id)}
                    disabled={isPastEvent || isUnavailableForSale}
                    className={`flex-1 rounded-lg font-semibold transition-all ${
                      isSidebarLayout ? 'px-1.5 py-1.5 text-[11px]' : isMobileLayout ? 'px-2 py-2 text-xs' : 'py-2.5 text-sm'
                    } ${
                      active ? 'bg-white text-[#0F172A] shadow' : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {getCategoryLabel(cat)}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className={sectionGapClass}>
          <label className={sectionLabelClasses}>
            Select Tickets
          </label>
          <div className={ticketListGapClass}>
            {displayedTickets.length > 0 ? displayedTickets.map((ticket) => {
              const qty = quantities[ticket.id] || 0;
              const isSelected = qty > 0;
              const isSoldOut = (ticket.remaining ?? 0) <= 0;

              return (
                <div
                  key={ticket.id}
                  className={`
                    ${ticketCardClasses} border-2 transition-all
                    ${isSoldOut
                      ? 'border-[#F1F5F9] bg-[#F8FAFC]'
                      : isSelected
                        ? 'border-[#02338D] bg-[#EFF6FF]'
                        : 'border-[#E2E8F0] hover:border-[#02338D]/30'}
                  `}
                >
                  <div className={`flex items-start justify-between ${ticketCardMarginClass}`}>
                    <div className="min-w-0 flex-1">
                      <p className={`break-words leading-tight ${isSidebarLayout ? 'mb-0.5 text-[13px] font-semibold' : isMobileLayout ? 'mb-0.5 text-sm font-semibold' : 'mb-1 font-medium'} ${isSoldOut ? 'text-[#94A3B8] line-through decoration-[#94A3B8]/50' : 'text-[#0F172A]'}`}>
                        {ticket.type || ticket.name}
                      </p>
                      <p className={`break-words text-[#64748B] ${isSidebarLayout ? 'text-[10px] leading-[0.875rem]' : isMobileLayout ? 'text-[11px] leading-4' : 'text-xs'}`}>
                        {isSoldOut ? 'Sold out' : `${ticket.remaining} remaining`}
                        {ticket.description && ` - ${ticket.description}`}
                      </p>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`whitespace-nowrap font-semibold ${isSidebarLayout ? 'text-[13px]' : isMobileLayout ? 'text-sm' : ''} ${isSoldOut ? 'text-[#94A3B8]' : 'text-[#02338D]'}`}>
                        {ticket.price === 0 ? 'Free' : `${event.currency} ${ticket.price.toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  <div className={`flex items-center ${isSidebarLayout ? 'gap-1.5' : isMobileLayout ? 'gap-2' : 'gap-3'}`}>
                    {isSoldOut ? (
                      <span className={`rounded-lg border border-[#E2E8F0] bg-[#F1F5F9] text-xs font-bold uppercase tracking-wider text-[#94A3B8] ${isSidebarLayout ? 'px-2.5 py-1' : 'px-3 py-1.5'}`}>
                        Sold Out
                      </span>
                    ) : (
                      <>
                        <button
                          onClick={() => handleQuantityChange(ticket.id, -1)}
                          disabled={isPastEvent || isUnavailableForSale || qty <= 0}
                          className={`${quantityButtonClasses} flex items-center justify-center rounded-lg border border-[#E2E8F0] transition-colors hover:border-[#02338D] hover:text-[#02338D] disabled:cursor-not-allowed disabled:opacity-30`}
                          aria-label={`Decrease ${ticket.type || ticket.name} quantity`}
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className={`${isSidebarLayout ? 'w-6 text-[13px]' : isMobileLayout ? 'w-7 text-sm' : 'w-8 text-sm'} text-center font-semibold`}>{qty}</span>
                        <button
                          onClick={() => handleQuantityChange(ticket.id, 1)}
                          disabled={isPastEvent || isUnavailableForSale || qty >= Math.min(10, ticket.remaining)}
                          className={`${quantityButtonClasses} flex items-center justify-center rounded-lg border border-[#E2E8F0] transition-colors hover:border-[#02338D] hover:text-[#02338D] disabled:cursor-not-allowed disabled:opacity-30`}
                          aria-label={`Increase ${ticket.type || ticket.name} quantity`}
                        >
                          <Plus className="h-4 w-4" />
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

        <div className={`${sectionGapClass} border border-[#DBEAFE] bg-[#EFF6FF] ${couponClasses}`}>
          <div className={`flex items-center gap-1.5 font-semibold text-[#0F172A] ${isSidebarLayout ? 'text-[12px]' : isMobileLayout ? 'text-sm' : 'text-sm'}`}>
            <Tag className="h-4 w-4 text-[#02338D]" />
            Promo code
            <span className={`ml-auto rounded-full bg-[#DCFCE7] font-medium text-[#15803D] ${isSidebarLayout ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.5 text-[11px]'}`}>
              {isSidebarLayout ? 'Promo' : 'Save with code'}
            </span>
          </div>
          <p className={`mt-1 text-[#64748B] ${isSidebarLayout ? 'text-[10px] leading-[0.875rem]' : isMobileLayout ? 'text-[11px] leading-4' : 'text-xs'}`}>
            Apply your discount before checkout.
          </p>
          <div className={`flex gap-2 ${isSidebarLayout ? 'mt-2' : isMobileLayout ? 'mt-2.5' : 'mt-3'}`}>
            <input
              type="text"
              value={promoCode}
              onChange={(e) => setPromoCode(e.target.value)}
              placeholder="Enter promo code"
              disabled={isPastEvent || isUnavailableForSale}
              className={`
                flex-1 rounded-lg border bg-white px-2.5 ${isSidebarLayout ? 'py-1.5 text-[12px]' : isMobileLayout ? 'py-2 text-sm' : 'py-2.5 text-sm'}
                focus:outline-none focus:ring-2 focus:ring-[#02338D]
                ${promoError ? 'border-[#DC2626]' : 'border-[#E2E8F0]'}
              `}
            />
            <CustomButton
              variant="outline"
              size="sm"
              onClick={handleApplyPromo}
              disabled={isPastEvent || isUnavailableForSale}
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
                className="mt-2 flex items-center gap-1 text-sm text-[#16A34A]"
              >
                <Check className="h-4 w-4" />
                {promoSuccess}
              </motion.p>
            )}
          </AnimatePresence>
        </div>

        <div className={`${breakdownClasses} border-b border-[#E2E8F0]`}>
          {selectedTickets.map((ticket) => (
            <div key={ticket.id} className={`flex justify-between ${isSidebarLayout ? 'text-[12px]' : isMobileLayout ? 'text-sm' : 'text-sm'}`}>
              <span className="text-[#64748B]">
                {ticket.type || ticket.name} x {quantities[ticket.id]}
              </span>
              <span className="text-[#0F172A]">
                {event.currency} {(ticket.price * quantities[ticket.id]).toLocaleString()}
              </span>
            </div>
          ))}

          {selectedTickets.length === 0 && (
            <div className="py-2 text-center text-sm text-[#94A3B8]">
              Select at least one ticket
            </div>
          )}

          {discount > 0 && (
            <div className={`flex justify-between ${isSidebarLayout ? 'text-[12px]' : isMobileLayout ? 'text-sm' : 'text-sm'}`}>
              <span className="text-[#16A34A]">Discount</span>
              <span className="text-[#16A34A]">-{event.currency} {discount.toLocaleString()}</span>
            </div>
          )}

          {totalQuantity > 0 && (
            <>
              <div className={`flex justify-between ${isSidebarLayout ? 'text-[12px]' : isMobileLayout ? 'text-sm' : 'text-sm'}`}>
                <span className="text-[#64748B]">Service fee</span>
                <span className="text-[#0F172A]">{event.currency} {serviceFee.toLocaleString()}</span>
              </div>
              <div className={`flex justify-between font-semibold ${isSidebarLayout ? 'pt-1 text-[15px]' : isMobileLayout ? 'pt-1.5 text-lg' : 'pt-2 text-lg'}`}>
                <span className="text-[#0F172A]">Total</span>
                <span style={{ color: themeColor }}>{event.currency} {total.toLocaleString()}</span>
              </div>
            </>
          )}
        </div>

        {waitlistAllowed && (
          <div className={`${waitlistClasses} border border-[#E2E8F0] bg-[#F8FAFC]`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Sold out - join the waitlist</p>
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
                  <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <input
                      type="text"
                      placeholder="Full name *"
                      value={waitlistForm.name}
                      onChange={(e) => setWaitlistForm((prev) => ({ ...prev, name: e.target.value }))}
                      className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#02338D]"
                    />
                    <input
                      type="email"
                      placeholder="Email address *"
                      value={waitlistForm.email}
                      onChange={(e) => setWaitlistForm((prev) => ({ ...prev, email: e.target.value }))}
                      className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#02338D]"
                    />
                    <input
                      type="tel"
                      placeholder="Phone (optional)"
                      value={waitlistForm.phone}
                      onChange={(e) => setWaitlistForm((prev) => ({ ...prev, phone: e.target.value }))}
                      className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#02338D]"
                    />
                    <input
                      type="text"
                      placeholder="Notes (optional)"
                      value={waitlistForm.notes}
                      onChange={(e) => setWaitlistForm((prev) => ({ ...prev, notes: e.target.value }))}
                      className="rounded-lg border border-[#E2E8F0] px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#02338D]"
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
      </div>

      <div className={footerClasses}>
        <CustomButton
          variant="primary"
          fullWidth
          onClick={handleGetTickets}
          disabled={isPastEvent || isUnavailableForSale || totalQuantity === 0}
          className={footerButtonClass}
          style={{ backgroundColor: themeColor }}
        >
          <span className="flex items-center justify-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            {isPastEvent
              ? 'Event Has Passed'
              : isUnavailableForSale
                ? 'Awaiting Approval'
                : totalQuantity === 0
                  ? 'Select Tickets'
                  : `Get ${totalQuantity} Ticket${totalQuantity > 1 ? 's' : ''}`
            }
          </span>
        </CustomButton>

        <div className={`mt-1.5 flex items-center justify-center gap-1 text-[#64748B] ${isSidebarLayout ? 'text-[9px]' : isMobileLayout ? 'text-[10px]' : 'text-xs'}`}>
          <span>Secure checkout</span>
          <span>-</span>
          <span>Instant QR ticket</span>
          <span>-</span>
          <span>Free cancellation</span>
        </div>
      </div>
    </div>
  );
};

export default TicketBox;
