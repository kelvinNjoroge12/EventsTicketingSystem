import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import CustomInput from '../components/ui/CustomInput';
import CustomButton from '../components/ui/CustomButton';
import { api } from '../lib/apiClient';
import { useAuth } from '../context/AuthContext';
import strathmoreLogo from '../assets/strathmore-logo.png';

const ForcePasswordResetPage = () => {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState('');

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
      await api.post('/api/auth/change-password/', {
        old_password: currentPassword,
        new_password: password,
        confirm_password: confirmPassword,
      });
      updateUser({ must_reset_password: false });
      setIsSuccess(true);
      setTimeout(() => {
        if (user?.role === 'checkin' || user?.role === 'staff') {
          navigate('/organizer-checkin', { replace: true });
        } else if (user?.role === 'organizer' || user?.role === 'admin') {
          navigate('/organizer-dashboard', { replace: true });
        } else {
          navigate('/', { replace: true });
        }
      }, 1200);
    } catch (err) {
      const msg = err?.detail || err?.old_password?.[0] || err?.non_field_errors?.[0] || 'Password reset failed.';
      setError(msg);
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
          <div className="text-center mb-6">
            <div className="mx-auto h-16 w-16 rounded-md bg-white p-2 shadow-sm">
              <img src={strathmoreLogo} alt="Strathmore University" className="h-full w-full object-contain" />
            </div>
            <span className="block text-2xl sm:text-3xl font-bold text-[#02338D] mt-3">Strathmore University</span>
            <span className="block text-xs sm:text-sm font-semibold text-[#02338D]/80 uppercase tracking-wide">
              Events & Partners Ticketing
            </span>
            <p className="text-sm text-[#64748B] mt-2">For security, please set a new password.</p>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-[#E2E8F0] p-8">
            <AnimatePresence mode="wait">
              {isSuccess ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="text-center"
                >
                  <div className="w-20 h-20 mx-auto mb-6 bg-[#F0FDF4] rounded-full flex items-center justify-center">
                    <CheckCircle className="w-10 h-10 text-[#16A34A]" />
                  </div>
                  <h2 className="text-2xl font-bold text-[#0F172A] mb-2">Password Updated</h2>
                  <p className="text-[#64748B]">Redirecting you to your check-in workspace...</p>
                </motion.div>
              ) : (
                <motion.form
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  onSubmit={handleSubmit}
                  className="space-y-4"
                >
                  {error && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-start gap-3 p-4 bg-[#FEF2F2] border border-[#FECACA] rounded-lg"
                    >
                      <AlertCircle className="w-5 h-5 text-[#DC2626] flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-[#DC2626]">{error}</p>
                    </motion.div>
                  )}

                  <div className="relative">
                    <CustomInput
                      label="Temporary Password"
                      type={showCurrent ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      leftIcon={Lock}
                      placeholder="Enter temporary password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrent((v) => !v)}
                      className="absolute right-3 top-[38px] text-[#94A3B8] hover:text-[#0F172A]"
                    >
                      {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="relative">
                    <CustomInput
                      label="New Password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      leftIcon={Lock}
                      placeholder="At least 8 characters"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-[38px] text-[#94A3B8] hover:text-[#0F172A]"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <div className="relative">
                    <CustomInput
                      label="Confirm Password"
                      type={showConfirm ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      leftIcon={Lock}
                      placeholder="Repeat your new password"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((v) => !v)}
                      className="absolute right-3 top-[38px] text-[#94A3B8] hover:text-[#0F172A]"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <CustomButton
                    type="submit"
                    variant="primary"
                    fullWidth
                    isLoading={isLoading}
                    className="py-3"
                  >
                    Update Password
                  </CustomButton>
                </motion.form>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </PageWrapper>
  );
};

export default ForcePasswordResetPage;

