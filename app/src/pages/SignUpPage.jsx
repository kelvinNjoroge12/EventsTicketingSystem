import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, AlertCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import AuthForm from '../components/auth/AuthForm';
import RoleSelector from '../components/auth/RoleSelector';
import CustomButton from '../components/ui/CustomButton';
import { useAuth } from '../context/AuthContext';

const SignUpPage = () => {
  const navigate = useNavigate();
  const { signup } = useAuth();
  const [step, setStep] = useState(1);
  const [selectedRole, setSelectedRole] = useState('attendee');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
  };

  const handleContinue = () => {
    if (selectedRole) {
      setStep(2);
    }
  };

  const handleSubmit = async (formData) => {
    setIsLoading(true);
    setError('');
    try {
      const user = await signup({
        ...formData,
        role: selectedRole,
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
            <Link to="/">
              <span className="text-3xl font-bold text-[#1E4DB7]">EventHub</span>
            </Link>
          </div>

          {/* Card */}
          <div className="bg-white rounded-2xl shadow-lg border border-[#E2E8F0] p-8">
            <AnimatePresence mode="wait">
              {step === 1 ? (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <h1 className="text-2xl font-bold text-[#0F172A] text-center mb-2">
                    Choose Your Role
                  </h1>
                  <p className="text-[#64748B] text-center mb-6">
                    Select how you'll use EventHub
                  </p>

                  <RoleSelector
                    selectedRole={selectedRole}
                    onSelect={handleRoleSelect}
                  />

                  <CustomButton
                    variant="primary"
                    fullWidth
                    className="mt-6 py-3"
                    onClick={handleContinue}
                  >
                    Continue
                  </CustomButton>
                </motion.div>
              ) : (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <button
                    onClick={() => setStep(1)}
                    className="flex items-center gap-1 text-[#64748B] hover:text-[#0F172A] mb-4"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back to role selection
                  </button>

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
                    role={selectedRole}
                    onSubmit={handleSubmit}
                    isLoading={isLoading}
                  />
                </motion.div>
              )}
            </AnimatePresence>
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
