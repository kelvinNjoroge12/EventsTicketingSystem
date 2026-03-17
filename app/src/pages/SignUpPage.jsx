import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import AuthForm from '../components/auth/AuthForm';
import { useAuth } from '../context/AuthContext';

const SignUpPage = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    setError('');
    try {
      const user = await signup({
        ...formData,
      });
      if (user?.role === 'organizer' || user?.role === 'admin') {
        navigate('/organizer-dashboard');
      } else {
        navigate('/');
      }
    } catch (err) {
      setError(
        err?.email?.[0] ||
        err?.password?.[0] ||
        err?.detail ||
        err?.message ||
        'Failed to create account. Please try again.'
      );
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
            <Link to="/" className="inline-flex flex-col items-center">
              <span className="text-2xl sm:text-3xl font-bold text-[#1E4DB7]">Strathmore University</span>
              <span className="text-xs sm:text-sm font-semibold text-[#1E4DB7]/80 uppercase tracking-wide">Event Ticketing System</span>
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-[#E2E8F0] overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#1E4DB7] via-[#3B82F6] to-[#7C3AED]" />
            <div className="p-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h1 className="text-2xl font-bold text-[#0F172A] text-center mb-6">
                    Create Your Account
                  </h1>

                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-lg mb-6"
                    >
                      <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-[#DC2626]">{error}</p>
                    </motion.div>
                  )}

                  <AuthForm
                    mode="signup"
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                  />
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* Footer */}
          <p className="text-center mt-6 text-[#64748B]">
            Already have an account?{' '}
            <Link to="/login" className="text-[#1E4DB7] font-medium hover:underline">
              Login
            </Link>
          </p>
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default SignUpPage;
