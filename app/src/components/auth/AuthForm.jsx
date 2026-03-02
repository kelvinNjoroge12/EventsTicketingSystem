import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Eye, EyeOff, Mail, Lock, User, Building } from 'lucide-react';
import { Link } from 'react-router-dom';
import CustomInput from '../ui/CustomInput';
import CustomButton from '../ui/CustomButton';

const AuthForm = ({
  mode = 'login',
  role = 'attendee',
  onSubmit,
  isLoading,
}) => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    organization: '',
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (mode === 'signup') {
      if (!formData.firstName.trim()) {
        newErrors.firstName = 'First name is required';
      }
      if (!formData.lastName.trim()) {
        newErrors.lastName = 'Last name is required';
      }
      if (role === 'organizer' && !formData.organization.trim()) {
        newErrors.organization = 'Organization name is required';
      }
      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
      if (!formData.agreeToTerms) {
        newErrors.agreeToTerms = 'You must agree to the terms';
      }
    }

    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (mode === 'signup' && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
    }
  };

  const isSignup = mode === 'signup';

  return (
    <motion.form
      onSubmit={handleSubmit}
      className="space-y-4"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      {isSignup && (
        <div className="grid grid-cols-2 gap-4">
          <CustomInput
            label="First Name"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            error={errors.firstName}
            leftIcon={User}
            required
          />
          <CustomInput
            label="Last Name"
            value={formData.lastName}
            onChange={(e) => handleChange('lastName', e.target.value)}
            error={errors.lastName}
            required
          />
        </div>
      )}

      <CustomInput
        label="Email"
        type="email"
        value={formData.email}
        onChange={(e) => handleChange('email', e.target.value)}
        error={errors.email}
        leftIcon={Mail}
        autoComplete="email"
        required
      />

      {isSignup && role === 'organizer' && (
        <CustomInput
          label="Organization Name"
          value={formData.organization}
          onChange={(e) => handleChange('organization', e.target.value)}
          error={errors.organization}
          leftIcon={Building}
          required
        />
      )}

      <div className="relative">
        <CustomInput
          label="Password"
          type={showPassword ? 'text' : 'password'}
          value={formData.password}
          onChange={(e) => handleChange('password', e.target.value)}
          error={errors.password}
          leftIcon={Lock}
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
        />
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute right-3 top-[38px] text-[#64748B] hover:text-[#0F172A]"
          aria-label={showPassword ? 'Hide password' : 'Show password'}
        >
          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
        </button>
      </div>

      {isSignup && (
        <div className="relative">
          <CustomInput
            label="Confirm Password"
            type={showConfirmPassword ? 'text' : 'password'}
            value={formData.confirmPassword}
            onChange={(e) => handleChange('confirmPassword', e.target.value)}
            error={errors.confirmPassword}
            leftIcon={Lock}
            autoComplete="new-password"
            required
          />
          <button
            type="button"
            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
            className="absolute right-3 top-[38px] text-[#64748B] hover:text-[#0F172A]"
            aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
          >
            {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      )}

      {isSignup && (
        <div className="flex items-start gap-2">
          <input
            type="checkbox"
            id="agreeToTerms"
            checked={formData.agreeToTerms}
            onChange={(e) => handleChange('agreeToTerms', e.target.checked)}
            className="mt-1 w-4 h-4 rounded border-[#E2E8F0] text-[#1E4DB7] focus:ring-[#1E4DB7]"
          />
          <label htmlFor="agreeToTerms" className="text-sm text-[#64748B]">
            I agree to the{' '}
            <Link to="#" className="text-[#1E4DB7] hover:underline">Terms of Service</Link>
            {' '}and{' '}
            <Link to="#" className="text-[#1E4DB7] hover:underline">Privacy Policy</Link>
          </label>
        </div>
      )}

      {!isSignup && (
        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-[#1E4DB7] hover:underline"
          >
            Forgot Password?
          </Link>
        </div>
      )}

      <CustomButton
        type="submit"
        variant="primary"
        fullWidth
        isLoading={isLoading}
        className="py-3"
      >
        {isSignup ? 'Create Account' : 'Login'}
      </CustomButton>
    </motion.form>
  );
};

export default AuthForm;
