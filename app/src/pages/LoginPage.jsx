import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import AuthForm from '../components/auth/AuthForm';
import { useAuth } from '../context/AuthContext';

const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    setError('');
    try {
      const user = await login(formData.email, formData.password);

      const intendedDestination = location.state?.from?.pathname;
      if (intendedDestination) {
        navigate(intendedDestination, { replace: true });
      } else if (user?.role === 'checkin' || user?.role === 'staff') {
        navigate('/organizer-checkin', { replace: true });
      } else if (user?.role === 'organizer' || user?.role === 'admin') {
        navigate('/organizer-dashboard', { replace: true });
      } else {
        navigate('/', { replace: true });
      }
    } catch (err) {
      setError(err.message || 'Invalid email or password. Please try again.');
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
            <Link to="/">
              <span className="text-3xl font-bold text-[#1E4DB7]">EventHub</span>
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white rounded-3xl shadow-xl border border-[#E2E8F0] overflow-hidden">
            <div className="h-1.5 bg-gradient-to-r from-[#1E4DB7] via-[#3B82F6] to-[#7C3AED]" />
            <div className="p-8">
              <h1 className="text-2xl font-bold text-[#0F172A] text-center mb-6">
                Welcome back
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
                mode="login"
                onSubmit={handleSubmit}
                isLoading={isLoading}
              />
            </div>
          </div>

          {/* Footer */}
          <p className="text-center mt-6 text-[#64748B]">
            Don't have an account?{' '}
            <Link to="/signup" className="text-[#1E4DB7] font-medium hover:underline">
              Sign Up
            </Link>
          </p>
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default LoginPage;
