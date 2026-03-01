import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Ticket, Calendar, MapPin, ArrowRight } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import { api } from '../lib/apiClient';

const MyTicketsPage = () => {
    const [orders, setOrders] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let mounted = true;
        (async () => {
            try {
                const data = await api.get('/api/orders/');
                if (mounted) {
                    setOrders(data || []);
                }
            } catch (err) {
                console.error('Failed to fetch orders:', err);
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
                        {[1, 2, 3].map(i => (
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
                <h1 className="text-3xl font-bold text-[#0F172A] mb-8">My Tickets</h1>

                {orders.length === 0 ? (
                    <div className="text-center py-16 bg-white rounded-2xl border border-[#E2E8F0]">
                        <Ticket className="w-16 h-16 text-[#94A3B8] mx-auto mb-4" />
                        <h2 className="text-xl font-semibold text-[#0F172A] mb-2">No tickets yet</h2>
                        <p className="text-[#64748B] mb-6">Looks like you haven't bought any tickets.</p>
                        <Link
                            to="/events"
                            className="px-6 py-2.5 bg-[#1E4DB7] text-white font-medium rounded-lg hover:bg-[#1E3A8A] transition-colors inline-block"
                        >
                            Browse Events
                        </Link>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {orders.map((order) => {
                            // Extract a bit of details, in real app event data might be deeply populated
                            // For now, we lean on `order.items` and created_at
                            const item = order.items?.[0];
                            return (
                                <div key={order.order_number} className="bg-white rounded-xl shadow-sm border border-[#E2E8F0] p-6 hover:shadow-md transition-shadow">
                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                                        <div>
                                            <h3 className="text-lg font-semibold text-[#0F172A]">
                                                Order #{order.order_number}
                                            </h3>
                                            <div className="flex items-center gap-4 text-sm text-[#64748B] mt-2">
                                                <span className="flex items-center gap-1">
                                                    <Ticket className="w-4 h-4" />
                                                    {item?.quantity || 1}x {item?.ticket_type_name || 'Ticket'}
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <Calendar className="w-4 h-4" />
                                                    {new Date(order.created_at).toLocaleDateString()}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="text-right">
                                                <p className="text-sm text-[#64748B]">Total</p>
                                                <p className="font-semibold text-[#0F172A]">{order.currency} {order.total}</p>
                                            </div>
                                            <Link
                                                to={`/confirmation/${order.order_number}`}
                                                className="p-2 text-[#1E4DB7] hover:bg-[#EFF6FF] rounded-lg transition-colors flex items-center gap-1"
                                            >
                                                <span className="text-sm font-medium">View</span>
                                                <ArrowRight className="w-4 h-4" />
                                            </Link>
                                        </div>
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
