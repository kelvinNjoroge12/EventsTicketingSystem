import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, XCircle, Clock, Calendar, MapPin, Search, AlertCircle, ArrowLeft } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import { api } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import { toast } from 'sonner';

const TicketVerificationPage = () => {
    const { uuid } = useParams();
    const { user } = useAuth();

    const [ticketData, setTicketData] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isCheckingIn, setIsCheckingIn] = useState(false);

    // Fetch the ticket data without authenticating 
    // (This allows anyone to VIEW the ticket, but check-in logic requires auth)
    useEffect(() => {
        let mounted = true;
        const fetchTicket = async () => {
            try {
                // We're adding a new public GET endpoint for ticket viewing
                const response = await api.get(`/api/orders/qr/${uuid}/verify/`);
                if (mounted) {
                    setTicketData(response);
                }
            } catch (err) {
                if (mounted) {
                    setError(err?.response?.error?.message || err?.message || 'Invalid or expired ticket URL.');
                }
            } finally {
                if (mounted) setIsLoading(false);
            }
        };
        fetchTicket();
        return () => { mounted = false; };
    }, [uuid]);

    const handleCheckIn = async () => {
        if (!ticketData || !ticketData.event) return;

        const assignedEvents = user?.assigned_events || user?.event_assignments || user?.checkin_events || [];
        const isOwner = String(user?.id) === String(ticketData.event.organizer_id);
        const isAdmin = Boolean(user?.is_staff || user?.role === 'admin');
        const isCheckinStaff = user?.role === 'staff' || user?.role === 'checkin';
        const hasAssignments = Array.isArray(assignedEvents) && assignedEvents.length > 0;
        const isAssigned = Array.isArray(assignedEvents) && assignedEvents.some((value) => (
            String(value) === String(ticketData.event.id) || String(value) === String(ticketData.event.slug)
        ));
        const ownerCanManage = Boolean(isOwner && (!hasAssignments || isAssigned));
        const canManageCheckin = Boolean(user && (isAdmin || ownerCanManage || (isCheckinStaff && isAssigned)));

        if (!canManageCheckin) {
            toast.error('You do not have permission to check in this ticket.');
            return;
        }

        setIsCheckingIn(true);
        try {
            await api.post(`/api/events/${ticketData.event.slug}/checkin/scan/`, {
                qr_code_data: uuid
            });
            toast.success('Ticket successfully checked in!');
            // Refresh the ticket data to show updated status
            setTicketData(prev => ({
                ...prev,
                status: 'used',
                checked_in_at: new Date().toISOString()
            }));
        } catch (err) {
            toast.error(err?.response?.error?.message || 'Check-in failed.');
        } finally {
            setIsCheckingIn(false);
        }
    };

    if (isLoading) {
        return (
            <PageWrapper>
                <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center p-4">
                    <div className="flex flex-col items-center gap-4">
                        <Search className="w-12 h-12 text-[#02338D] animate-pulse" />
                        <h2 className="text-xl font-bold text-[#0F172A]">Verifying Ticket Securely...</h2>
                    </div>
                </div>
            </PageWrapper>
        );
    }

    if (error || !ticketData) {
        return (
            <PageWrapper>
                <div className="min-h-screen bg-[#F8FAFC] p-4 flex items-center justify-center">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-white max-w-md w-full rounded-2xl p-8 text-center border-2 border-red-100 shadow-xl"
                    >
                        <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle className="w-10 h-10 text-red-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-[#0F172A] mb-3">Invalid Ticket</h2>
                        <p className="text-[#64748B] mb-8">{error}</p>
                        <Link to="/" className="inline-flex items-center gap-2 text-[#02338D] font-medium hover:underline">
                            <ArrowLeft className="w-4 h-4" /> Return to Home
                        </Link>
                    </motion.div>
                </div>
            </PageWrapper>
        );
    }

    const isExpired = ticketData.status === 'expired' || ticketData.event?.time_state === 'past';
    const isUsed = ticketData.status === 'used';
    const assignedEvents = user?.assigned_events || user?.event_assignments || user?.checkin_events || [];
    const isOwner = Boolean(user && String(user.id) === String(ticketData.event.organizer_id));
    const isAdmin = Boolean(user && (user.is_staff || user.role === 'admin'));
    const isCheckinStaff = Boolean(user && (user.role === 'staff' || user.role === 'checkin'));
    const hasAssignments = Array.isArray(assignedEvents) && assignedEvents.length > 0;
    const isAssigned = Array.isArray(assignedEvents) && assignedEvents.some((value) => (
        String(value) === String(ticketData.event.id) || String(value) === String(ticketData.event.slug)
    ));
    const ownerCanCheckIn = Boolean(isOwner && (!hasAssignments || isAssigned));
    const canCheckIn = !isUsed && !isExpired && Boolean(user && (isAdmin || ownerCanCheckIn || (isCheckinStaff && isAssigned)));

    return (
        <PageWrapper>
            <div className="min-h-screen bg-[#F8FAFC] py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-xl mx-auto">

                    {/* Header Banner */}
                    <div className={`rounded-t-3xl p-6 text-center ${isExpired ? 'bg-slate-600' : isUsed ? 'bg-amber-500' : 'bg-green-600'} text-white relative overflow-hidden`}>
                        <div className="absolute top-0 right-0 opacity-10 scale-150 transform translate-x-4 -translate-y-4">
                            {isExpired || isUsed ? <AlertCircle className="w-48 h-48" /> : <ShieldCheck className="w-48 h-48" />}
                        </div>

                        <div className="relative z-10">
                            {isExpired || isUsed ? (
                                <AlertCircle className="w-16 h-16 mx-auto mb-4" />
                            ) : (
                                <ShieldCheck className="w-16 h-16 mx-auto mb-4" />
                            )}
                            <h1 className="text-3xl font-extrabold tracking-tight mb-2">
                                {isExpired ? 'Ticket Expired' : isUsed ? 'Ticket Already Used' : 'Valid Entry Pass'}
                            </h1>
                            <p className="text-white/80 font-medium">
                                {ticketData.ticket_type_name}
                            </p>
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="bg-white rounded-b-3xl shadow-xl border-x-2 border-b-2 border-gray-100 p-8">

                        {/* Event Details */}
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-[#0F172A] mb-2">{ticketData.event.title}</h2>
                            <div className="inline-flex items-center justify-center gap-2 text-[#64748B] text-sm bg-gray-50 px-4 py-2 rounded-full font-medium">
                                <Calendar className="w-4 h-4" />
                                {new Date(ticketData.event.start_date).toLocaleDateString()} at {ticketData.event.start_time.substring(0, 5)}
                            </div>
                        </div>

                        <hr className="border-gray-100 mb-8" />

                        {/* Attendee Info */}
                        <div className="space-y-6">
                            <div>
                                <p className="text-xs uppercase tracking-wider text-[#94A3B8] font-bold mb-1">Attendee Name</p>
                                <p className="text-lg font-bold text-[#0F172A]">{ticketData.attendee_name}</p>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-[#94A3B8] font-bold mb-1">Order #</p>
                                    <p className="text-sm font-bold font-mono text-[#0F172A]">{ticketData.order_number}</p>
                                </div>
                                <div>
                                    <p className="text-xs uppercase tracking-wider text-[#94A3B8] font-bold mb-1">Ticket ID</p>
                                    <p className="text-sm font-medium font-mono text-[#64748B] break-all">{ticketData.id.split('-')[0]}...</p>
                                </div>
                            </div>
                        </div>

                        {/* Status Box */}
                        <div className={`mt-8 p-4 rounded-xl border-2 flex items-start gap-4 ${isExpired ? 'bg-slate-50 border-slate-200' : isUsed ? 'bg-amber-50 border-amber-200' : 'bg-green-50 border-green-200'}`}>
                            <Clock className={`w-6 h-6 shrink-0 mt-0.5 ${isExpired ? 'text-slate-500' : isUsed ? 'text-amber-500' : 'text-green-500'}`} />
                            <div>
                                <p className={`font-bold ${isExpired ? 'text-slate-800' : isUsed ? 'text-amber-800' : 'text-green-800'}`}>
                                    {isExpired ? 'Event Ended' : isUsed ? 'Checked-In' : 'Ready for Scanning'}
                                </p>
                                {isExpired && (
                                    <p className="text-sm text-slate-700 mt-1">
                                        This event has already ended, so the ticket is no longer valid for entry.
                                    </p>
                                )}
                                {isUsed && ticketData.checked_in_at && (
                                    <p className="text-sm text-amber-700 mt-1">
                                        Scanned on: {new Date(ticketData.checked_in_at).toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Organizer Only Action button */}
                        {canCheckIn && (
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <motion.button
                                    whileHover={{ scale: 1.02 }}
                                    whileTap={{ scale: 0.98 }}
                                    onClick={handleCheckIn}
                                    disabled={isCheckingIn}
                                    className="w-full py-4 bg-gradient-to-r from-[#02338D] to-[#7C3AED] text-white rounded-xl font-bold text-lg shadow-lg shadow-blue-500/30 flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
                                >
                                    {isCheckingIn ? (
                                        <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <>Admit User Now</>
                                    )}
                                </motion.button>
                                <p className="text-center text-xs text-[#94A3B8] mt-3">
                                    Visible to authorized check-in staff.
                                </p>
                            </div>
                        )}

                        {/* Unauthorized View Message */}
                        {(!canCheckIn && !isUsed && !isExpired) && (
                            <div className="mt-8 pt-6 border-t border-gray-100 text-center">
                                <p className="text-sm text-[#64748B]">
                                    Present this screen or your QR code to the event staff at the entrance.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </PageWrapper>
    );
};

export default TicketVerificationPage;

