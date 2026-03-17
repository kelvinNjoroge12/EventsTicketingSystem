import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import CustomInput from '../components/ui/CustomInput';
import CustomButton from '../components/ui/CustomButton';
import { api } from '../lib/apiClient';
import strathmoreLogo from '../assets/strathmore-logo.png';

const ForgotPasswordPage = () => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setIsLoading(true);
    try {
      await api.post('/api/auth/forgot-password/', { email });
      setIsSubmitted(true);
    } catch (error) {
      console.error('Forgot password error:', error);
      // Backend always returns 200, but log just in case
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <PageWrapper>
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <motion.div
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Logo */}
          <div className="text-center mb-8">
            <Link to="/" className="inline-flex flex-col items-center gap-3">
              <div className="h-16 w-16 rounded-md bg-white p-2 shadow-sm">
                <img src={strathmoreLogo} alt="Strathmore University" className="h-full w-full object-contain" />
              </div>
              <div>
                <span className="text-2xl sm:text-3xl font-bold text-[#02338D]">Strathmore University</span>
                <span className="block text-xs sm:text-sm font-semibold text-[#02338D]/80 uppercase tracking-wide">
                  Events & Partners Ticketing
                </span>
              </div>
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-[#E2E8F0] p-8">
            <AnimatePresence mode="wait">
              {!isSubmitted ? (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                >
                  <h1 className="text-2xl font-bold text-[#0F172A] text-center mb-2">
                    Reset your password
                  </h1>
                  <p className="text-[#64748B] text-center mb-6">
                    Enter your email and we'll send you a reset link
                  </p>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    <CustomInput
                      label="Email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      leftIcon={Mail}
                      placeholder="you@example.com"
                      required
                    />

                    <CustomButton
                      type="submit"
                      variant="primary"
                      fullWidth
                      isLoading={isLoading}
                      className="py-3"
                    >
                      Send Reset Link
                    </CustomButton>
                  </form>
                </motion.div>
              ) : (
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
                    Check your inbox!
                  </h2>
                  <p className="text-[#64748B] mb-6">
                    We sent a reset link to <span className="font-medium text-[#0F172A]">{email}</span>
                  </p>

                  <p className="text-sm text-[#64748B]">
                    Didn't receive the email?{' '}
                    <button
                      onClick={() => setIsSubmitted(false)}
                      className="text-[#02338D] hover:underline font-medium"
                    >
                      Try again
                    </button>
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Back to Login */}
          <div className="text-center mt-6">
            <Link 
              to="/login"
              className="inline-flex items-center gap-1 text-[#64748B] hover:text-[#0F172A]"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Login
            </Link>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default ForgotPasswordPage;

