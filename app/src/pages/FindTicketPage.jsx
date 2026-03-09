import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Search, Ticket, Mail, AlertCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import CustomInput from '../components/ui/CustomInput';
import CustomButton from '../components/ui/CustomButton';
import { api } from '../lib/apiClient';

const FindTicketPage = () => {
    const navigate = useNavigate();
    const [formData, setFormData] = useState({
        orderNumber: '',
        email: ''
    });
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        try {
            // We pass the email as a query param or in the body depending on backend
            // Most systems will verify the order matches the email provided
            const orderId = formData.orderNumber.trim();
            const email = formData.email.trim();

            if (!orderId || !email) {
                throw new Error("Please provide both order number and email address.");
            }

            // Using GET request with email as query param for unauthenticated lookup
            const data = await api.get(`/api/orders/${orderId}/?email=${encodeURIComponent(email)}`);

            // If we successfully get the order, redirect to confirmation page
            navigate(`/confirmation/${orderId}`, { state: data });

        } catch (err) {
            console.error('Failed to find ticket:', err);
            setError(err?.response?.error?.message || err?.message || 'We could not find a ticket matching this order number and email. Please check your details and try again.');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <PageWrapper>
            <div className="min-h-[calc(100vh-64px)] bg-[#F8FAFC] py-16 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
                <motion.div
                    className="max-w-md w-full"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4 }}
                >
                    <div className="text-center mb-10">
                        <div className="w-16 h-16 bg-[#EFF6FF] text-[#1E4DB7] rounded-2xl flex items-center justify-center mx-auto mb-6 transform rotate-12 shadow-sm border border-blue-100">
                            <Ticket className="w-8 h-8" />
                        </div>
                        <h1 className="text-3xl font-bold text-[#0F172A] mb-3">Find Your Ticket</h1>
                        <p className="text-[#64748B]">
                            Enter your order number and the email address you used during purchase to retrieve your ticket.
                        </p>
                    </div>

                    <div className="bg-white rounded-3xl shadow-xl border border-[#E2E8F0] overflow-hidden">
                        <div className="h-1.5 bg-gradient-to-r from-[#16A34A] to-[#22C55E]" />
                        <div className="p-8">
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, height: 0 }}
                                    animate={{ opacity: 1, height: 'auto' }}
                                    className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3"
                                >
                                    <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
                                    <p className="text-sm text-red-700">{error}</p>
                                </motion.div>
                            )}

                            <form onSubmit={handleSubmit} className="space-y-5">
                                <CustomInput
                                    label="Order Number"
                                    id="orderNumber"
                                    type="text"
                                    placeholder="e.g. ORD-12345ABC"
                                    value={formData.orderNumber}
                                    onChange={(e) => setFormData({ ...formData, orderNumber: e.target.value })}
                                    required
                                    icon={Search}
                                />

                                <CustomInput
                                    label="Email Address"
                                    id="email"
                                    type="email"
                                    placeholder="e.g. you@example.com"
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    required
                                    icon={Mail}
                                />

                                <CustomButton
                                    type="submit"
                                    variant="primary"
                                    fullWidth
                                    size="lg"
                                    className="mt-8 bg-[#16A34A] hover:bg-[#15803d]"
                                    isLoading={isLoading}
                                    leftIcon={Search}
                                >
                                    Find Ticket
                                </CustomButton>
                            </form>
                        </div>
                    </div>

                    <p className="text-center mt-8 text-sm text-[#64748B]">
                        Can't find your order number? Check the confirmation email we sent you when you purchased the ticket.
                    </p>
                </motion.div>
            </div>
        </PageWrapper>
    );
};

export default FindTicketPage;
