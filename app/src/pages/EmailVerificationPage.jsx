import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { CheckCircle, AlertCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import { api } from '../lib/apiClient';

const EmailVerificationPage = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');

    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('');

    useEffect(() => {
        let mounted = true;

        if (!token) {
            setStatus('error');
            setMessage('Missing verification token in the URL.');
            return;
        }

        api.post('/api/auth/verify-email/', { token })
            .then(res => {
                if (mounted) {
                    setStatus('success');
                    setMessage('Your email has been successfully verified! You can now log in.');
                }
            })
            .catch(err => {
                if (mounted) {
                    setStatus('error');
                    setMessage(err.message || 'Verification failed. The link may have expired or is invalid.');
                }
            });

        return () => {
            mounted = false;
        };
    }, [token]);

    return (
        <PageWrapper>
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <motion.div
                    className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-[#E2E8F0] p-8 text-center"
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                >
                    {status === 'verifying' && (
                        <div className="py-8">
                            <motion.div
                                className="w-16 h-16 border-4 border-[#1E4DB7] border-t-transparent rounded-full mx-auto mb-6"
                                animate={{ rotate: 360 }}
                                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                            />
                            <h2 className="text-xl font-bold text-[#0F172A]">Verifying your email...</h2>
                            <p className="text-[#64748B] mt-2">Please wait a moment while we map the stars.</p>
                        </div>
                    )}

                    {status === 'success' && (
                        <div className="py-8">
                            <motion.div
                                className="w-20 h-20 mx-auto mb-6 bg-[#F0FDF4] rounded-full flex items-center justify-center"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            >
                                <CheckCircle className="w-10 h-10 text-[#16A34A]" />
                            </motion.div>
                            <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Email Verified!</h2>
                            <p className="text-[#64748B] mb-6">{message}</p>
                            <Link
                                to="/login"
                                className="inline-block px-8 py-3 bg-[#1E4DB7] text-white font-medium rounded-lg hover:bg-[#1E3A8A] transition-colors"
                            >
                                Go to Login
                            </Link>
                        </div>
                    )}

                    {status === 'error' && (
                        <div className="py-8">
                            <motion.div
                                className="w-20 h-20 mx-auto mb-6 bg-[#FEF2F2] rounded-full flex items-center justify-center"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                            >
                                <AlertCircle className="w-10 h-10 text-[#DC2626]" />
                            </motion.div>
                            <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Verification Failed</h2>
                            <p className="text-[#64748B] mb-6">{message}</p>
                            <div className="flex flex-col gap-3">
                                <Link
                                    to="/login"
                                    className="inline-block px-8 py-3 bg-[#F8FAFC] text-[#0F172A] border border-[#E2E8F0] font-medium rounded-lg hover:bg-[#F1F5F9] transition-colors"
                                >
                                    Back to Login
                                </Link>
                                <Link
                                    to="/"
                                    className="text-sm text-[#1E4DB7] hover:underline"
                                >
                                    Return Home
                                </Link>
                            </div>
                        </div>
                    )}
                </motion.div>
            </div>
        </PageWrapper>
    );
};

export default EmailVerificationPage;
