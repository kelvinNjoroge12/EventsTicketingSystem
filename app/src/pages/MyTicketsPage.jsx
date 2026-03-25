import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Calendar, MapPin, ExternalLink, ShieldCheck, RotateCcw, X } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import PageWrapper from '../components/layout/PageWrapper';
import { api } from '../lib/apiClient';
import { toast } from 'sonner';

const formatEventDate = (event) => {
    if (!event?.start_date) {
        return 'Date to be announced';
    }

    const date = new Date(`${event.start_date}T${event.start_time || '00:00:00'}`);
    return date.toLocaleString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: event?.start_time ? 'numeric' : undefined,
        minute: event?.start_time ? '2-digit' : undefined,
    });
};

const MyTicketsPage = () => {
    const [tickets, setTickets] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [refundModal, setRefundModal] = useState(null);
    const [refundReason, setRefundReason] = useState('');
    const [isRefunding, setIsRefunding] = useState(false);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const data = await api.get('/api/orders/tickets/');
                if (mounted) {
                    setTickets((data || []).filter((ticket) => !ticket.is_expired));
                }
            } catch (err) {
                console.error('Failed to fetch tickets:', err);
            } finally {
                if (mounted) setIsLoading(false);
            }
        })();
        return () => {
            mounted = false;
        };
    }, []);

    const handleRefundRequest = async () => {
        if (!refundModal?.orderNumber) return;
        setIsRefunding(true);
        try {
            await api.post(`/api/payments/refund/`, {
                order_number: refundModal.orderNumber,
                reason: refundReason || 'Requested by attendee',
            });
            toast.success('Refund request submitted successfully. You will receive a confirmation email.');
            setTickets((prev) => prev.filter((t) => t.order_number !== refundModal.orderNumber));
            setRefundModal(null);
            setRefundReason('');
        } catch (err) {
            const msg = err?.response?.detail || err?.message || 'Refund request failed. Please try again.';
            toast.error(msg);
        } finally {
            setIsRefunding(false);
        }
    };

    if (isLoading) {
        return (
            <PageWrapper>
                <div className="max-w-7xl mx-auto px-4 py-16 animate-pulse">
                    <div className="h-8 bg-gray-200 rounded w-1/4 mb-8"></div>
                    <div className="space-y-4">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="h-24 bg-gray-200 rounded"></div>
                        ))}
                    </div>
                </div>
            </PageWrapper>
        );
    }

    return (
        <PageWrapper>
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="flex flex-col gap-3 mb-8 sm:flex-row sm:items-end sm:justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-[#0F172A]">My Tickets</h1>
                        <p className="text-[#64748B] mt-2">
                            Your active tickets stay here so they are easy to open on the day of the event.
                        </p>
                    </div>
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#EFF6FF] px-4 py-2 text-sm font-medium text-[#02338D]">
                        <ShieldCheck className="w-4 h-4" />
                        {tickets.length} valid {tickets.length === 1 ? 'ticket' : 'tickets'}
                    </div>
                </div>

                {tickets.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-[#E2E8F0]">
                        <Ticket className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-[#0F172A] mb-2">No active tickets right now</h2>
                        <p className="text-[#64748B] mb-6">Once you buy a ticket, it will appear here automatically.</p>
                        <Link
                            to="/events"
                            className="px-6 py-2.5 bg-[#02338D] text-white font-medium rounded-lg hover:bg-[#1E3A8A] transition-colors inline-block"
                        >
                            Browse Events
                        </Link>
                    </div>
                ) : (
                    <div className="grid gap-4 md:grid-cols-2">
                        {tickets.map((ticket) => {
                            const event = ticket.event;
                            return (
                                <div key={ticket.id} className="bg-white rounded-2xl shadow-sm border border-[#E2E8F0] p-6 hover:shadow-md transition-shadow">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="min-w-0">
                                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[#02338D] mb-2">
                                                {ticket.ticket_type_name}
                                            </p>
                                            <h2 className="text-xl font-semibold text-[#0F172A] line-clamp-2">
                                                {event?.title || 'Event Ticket'}
                                            </h2>
                                        </div>
                                        <span className="rounded-full bg-[#ECFDF3] px-3 py-1 text-xs font-semibold text-[#15803D]">
                                            {ticket.status}
                                        </span>
                                    </div>

                                    <div className="mt-5 space-y-3 text-sm text-[#475569]">
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-[#02338D]" />
                                            <span>{formatEventDate(event)}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-[#02338D]" />
                                            <span>{event?.venue_name || 'Venue to be announced'}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Ticket className="w-4 h-4 text-[#02338D]" />
                                            <span>Order #{ticket.order_number}</span>
                                        </div>
                                    </div>

                                    <div className="mt-6 rounded-2xl border border-dashed border-[#CBD5E1] bg-[#F8FAFC] p-4">
                                        <img
                                            src={ticket.qr_image_url}
                                            alt={`QR code for ${event?.title || 'event ticket'}`}
                                            className="mx-auto h-44 w-44 rounded-xl bg-white p-3"
                                        />
                                        <p className="mt-3 text-center text-xs text-[#64748B]">
                                            Present this QR code at the entrance or open the ticket for a larger view.
                                        </p>
                                    </div>

                                    <div className="mt-6 flex flex-wrap items-center gap-3">
                                        <Link
                                            to={`/t/${ticket.qr_code_data}`}
                                            className="inline-flex items-center gap-2 rounded-xl bg-[#02338D] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#1E3A8A] transition-colors"
                                        >
                                            Open Ticket
                                            <ExternalLink className="w-4 h-4" />
                                        </Link>
                                        {event?.slug && (
                                            <Link
                                                to={`/events/${event.slug}`}
                                                className="inline-flex items-center gap-2 rounded-xl border border-[#CBD5E1] px-4 py-2.5 text-sm font-medium text-[#0F172A] hover:bg-[#F8FAFC] transition-colors"
                                            >
                                                View Event
                                            </Link>
                                        )}
                                        <button
                                            onClick={() => setRefundModal({ orderNumber: ticket.order_number, eventTitle: event?.title || 'this event' })}
                                            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors ml-auto"
                                        >
                                            <RotateCcw className="w-4 h-4" />
                                            Refund
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Refund Confirmation Modal */}
            <AnimatePresence>
                {refundModal && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                        onClick={() => !isRefunding && setRefundModal(null)}
                    >
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.95, opacity: 0 }}
                            className="bg-white rounded-2xl shadow-2xl p-6 max-w-md w-full mx-4"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div className="flex items-center justify-between mb-4">
                                <h3 className="text-lg font-bold text-[#0F172A]">Request Refund</h3>
                                <button
                                    onClick={() => !isRefunding && setRefundModal(null)}
                                    className="p-1 rounded-lg hover:bg-gray-100"
                                >
                                    <X className="w-5 h-5 text-[#64748B]" />
                                </button>
                            </div>
                            <p className="text-sm text-[#64748B] mb-4">
                                Are you sure you want to request a refund for <strong>{refundModal.eventTitle}</strong>?
                                This action cannot be undone.
                            </p>
                            <textarea
                                value={refundReason}
                                onChange={(e) => setRefundReason(e.target.value)}
                                placeholder="Why are you requesting a refund? (optional)"
                                className="w-full rounded-xl border border-[#E2E8F0] px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#02338D] mb-4 resize-none"
                                rows={3}
                            />
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setRefundModal(null)}
                                    disabled={isRefunding}
                                    className="flex-1 py-2.5 rounded-xl border border-[#E2E8F0] text-sm font-medium text-[#0F172A] hover:bg-gray-50 transition-colors disabled:opacity-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleRefundRequest}
                                    disabled={isRefunding}
                                    className="flex-1 py-2.5 rounded-xl bg-red-600 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                                >
                                    {isRefunding ? (
                                        <>
                                            <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        'Confirm Refund'
                                    )}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </PageWrapper>
    );
};

export default MyTicketsPage;
