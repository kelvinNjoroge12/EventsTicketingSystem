import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Calendar, MapPin, ExternalLink, ShieldCheck } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import { api } from '../lib/apiClient';

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
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </PageWrapper>
    );
};

export default MyTicketsPage;

