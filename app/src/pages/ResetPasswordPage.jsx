import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import CustomInput from '../components/ui/CustomInput';
import CustomButton from '../components/ui/CustomButton';
import { api } from '../lib/apiClient';

const ResetPasswordPage = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const token = searchParams.get('token');

    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (!token) {
            setError('Invalid or expired reset link. Please request a new one.');
        }
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        if (password.length < 8) {
            setError('Password must be at least 8 characters.');
            return;
        }
        if (password !== confirmPassword) {
            setError('Passwords do not match.');
            return;
        }

        setIsLoading(true);
        try {
            await api.post('/api/auth/reset-password/', {
                token,
                new_password: password,
                confirm_password: confirmPassword,
            });
            setIsSuccess(true);
            // Redirect to login after 3 seconds
            setTimeout(() => navigate('/login'), 3000);
        } catch (err) {
            const msg =
                err?.detail ||
                err?.new_password?.[0] ||
                err?.non_field_errors?.[0] ||
                'Reset failed. The link may have expired. Please request a new one.';
            setError(msg);
        } finally {
            setIsLoading(false);
        }
    };

    const passwordStrength = () => {
        if (password.length === 0) return null;
        if (password.length < 6) return { label: 'Weak', color: '#DC2626', width: '33%' };
        if (password.length < 10 || !/[A-Z]/.test(password) || !/[0-9]/.test(password))
            return { label: 'Fair', color: '#F59E0B', width: '66%' };
        return { label: 'Strong', color: '#16A34A', width: '100%' };
    };

    const strength = passwordStrength();

    return (
        <PageWrapper>
            <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
                <motion.div
                    className="w-full max-w-md"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Card */}
                    <div className="bg-white rounded-2xl shadow-lg border border-[#E2E8F0] p-8">
                        <AnimatePresence mode="wait">
                            {isSuccess ? (
                                <motion.div
                                    key="success"
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    className="text-center"
                                >
                                    <motion.div
                                        className="w-20 h-20 mx-auto mb-6 bg-[#F0FDF4] rounded-full flex items-center justify-center"
                                        initial={{ scale: 0 }}
                                        animate={{ scale: 1 }}
                                        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
                                    >
                                        <CheckCircle className="w-10 h-10 text-[#16A34A]" />
                                    </motion.div>

                                    <h2 className="text-2xl font-bold text-[#0F172A] mb-2">
                                        Password Reset!
                                    </h2>
                                    <p className="text-[#64748B] mb-4">
                                        Your password has been updated successfully. Redirecting you to login…
                                    </p>
                                    <Link
                                        to="/login"
                                        className="text-[#02338D] hover:underline font-medium"
                                    >
                                        Go to Login →
                                    </Link>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="form"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                >
                                    <h1 className="text-2xl font-bold text-[#0F172A] text-center mb-2">
                                        Set new password
                                    </h1>
                                    <p className="text-[#64748B] text-center mb-6">
                                        Choose a strong new password for your account
                                    </p>

                                    {error && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            className="flex items-start gap-3 p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-lg mb-4"
                                        >
                                            <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                                            <p className="text-sm text-[#DC2626]">{error}</p>
                                        </motion.div>
                                    )}

                                    <form onSubmit={handleSubmit} className="space-y-4">
                                        {/* New Password */}
                                        <div className="relative">
                                            <CustomInput
                                                label="New Password"
                                                type={showPassword ? 'text' : 'password'}
                                                value={password}
                                                onChange={(e) => setPassword(e.target.value)}
                                                leftIcon={Lock}
                                                placeholder="At least 8 characters"
                                                required
                                                disabled={!token || isLoading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowPassword((v) => !v)}
                                                className="absolute right-3 top-[38px] text-[#94A3B8] hover:text-[#0F172A]"
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                            >
                                                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                            {/* Strength bar */}
                                            {strength && (
                                                <div className="mt-1.5">
                                                    <div className="h-1 bg-[#E2E8F0] rounded-full overflow-hidden">
                                                        <motion.div
                                                            className="h-full rounded-full"
                                                            style={{ backgroundColor: strength.color }}
                                                            initial={{ width: 0 }}
                                                            animate={{ width: strength.width }}
                                                            transition={{ duration: 0.3 }}
                                                        />
                                                    </div>
                                                    <p className="text-xs mt-1" style={{ color: strength.color }}>
                                                        {strength.label} password
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        {/* Confirm Password */}
                                        <div className="relative">
                                            <CustomInput
                                                label="Confirm Password"
                                                type={showConfirm ? 'text' : 'password'}
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                leftIcon={Lock}
                                                placeholder="Repeat your new password"
                                                required
                                                disabled={!token || isLoading}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowConfirm((v) => !v)}
                                                className="absolute right-3 top-[38px] text-[#94A3B8] hover:text-[#0F172A]"
                                                aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                            >
                                                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                            </button>
                                        </div>

                                        <CustomButton
                                            type="submit"
                                            variant="primary"
                                            fullWidth
                                            isLoading={isLoading}
                                            disabled={!token || isLoading}
                                            className="py-3"
                                        >
                                            Reset Password
                                        </CustomButton>
                                    </form>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>

                    {/* Back to Login */}
                    <div className="text-center mt-6">
                        <Link
                            to="/forgot-password"
                            className="text-sm text-[#64748B] hover:text-[#0F172A]"
                        >
                            ← Request a new reset link
                        </Link>
                    </div>
                </motion.div>
            </div>
        </PageWrapper>
    );
};

export default ResetPasswordPage;

