import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ChevronDown, ChevronUp, User } from 'lucide-react';
import CustomInput from '../ui/CustomInput';
import CustomButton from '../ui/CustomButton';

const AttendeeForm = ({
  event,
  cart,
  onSubmit,
  themeColor,
}) => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
  });
  const [additionalAttendees, setAdditionalAttendees] = useState(
    Array(Math.max(0, cart.quantity - 1)).fill(null).map(() => ({
      firstName: '',
      lastName: '',
      email: '',
    }))
  );
  const [showAdditional, setShowAdditional] = useState(true);
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const handleAdditionalChange = (index, field, value) => {
    setAdditionalAttendees(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
    if (errors[`additional_${index}_${field}`]) {
      setErrors(prev => ({ ...prev, [`additional_${index}_${field}`]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.firstName.trim()) {
      newErrors.firstName = 'First name is required';
    }
    if (!formData.lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    }
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }
    if (!formData.phone.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    additionalAttendees.forEach((attendee, index) => {
      if (!attendee.firstName.trim()) {
        newErrors[`additional_${index}_firstName`] = 'First name is required';
      }
      if (!attendee.lastName.trim()) {
        newErrors[`additional_${index}_lastName`] = 'Last name is required';
      }
      if (!attendee.email.trim()) {
        newErrors[`additional_${index}_email`] = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email)) {
        newErrors[`additional_${index}_email`] = 'Please enter a valid email';
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        ...formData,
        additionalAttendees: cart.quantity > 1 ? additionalAttendees : [],
      });
    }
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, x: 50 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -50 }}
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <h2 className="text-xl font-semibold text-[#0F172A]">
        Attendee Details
      </h2>

      {/* Primary Attendee */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-[#64748B]">
          <User className="w-5 h-5" />
          <span className="text-sm">Primary Attendee</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomInput
            label="First Name"
            value={formData.firstName}
            onChange={(e) => handleChange('firstName', e.target.value)}
            error={errors.firstName}
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

        <CustomInput
          label="Email"
          type="email"
          value={formData.email}
          onChange={(e) => handleChange('email', e.target.value)}
          error={errors.email}
          required
        />

        <CustomInput
          label="Phone Number"
          type="tel"
          value={formData.phone}
          onChange={(e) => handleChange('phone', e.target.value)}
          error={errors.phone}
          required
        />
      </div>

      {/* Additional Attendees */}
      {cart.quantity > 1 && (
        <div className="space-y-4">
          <button
            type="button"
            onClick={() => setShowAdditional(!showAdditional)}
            className="flex items-center gap-2 text-[#02338D] hover:underline"
          >
            <span>Additional Attendees ({cart.quantity - 1})</span>
            {showAdditional ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showAdditional && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="space-y-6"
            >
              {additionalAttendees.map((attendee, index) => (
                <div key={index} className="p-4 bg-[#F8FAFC] rounded-xl space-y-4">
                  <p className="font-medium text-[#0F172A]">Attendee {index + 2}</p>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CustomInput
                      label="First Name"
                      value={attendee.firstName}
                      onChange={(e) => handleAdditionalChange(index, 'firstName', e.target.value)}
                      error={errors[`additional_${index}_firstName`]}
                      required
                    />
                    <CustomInput
                      label="Last Name"
                      value={attendee.lastName}
                      onChange={(e) => handleAdditionalChange(index, 'lastName', e.target.value)}
                      error={errors[`additional_${index}_lastName`]}
                      required
                    />
                  </div>
                  <CustomInput
                    label="Email"
                    type="email"
                    value={attendee.email}
                    onChange={(e) => handleAdditionalChange(index, 'email', e.target.value)}
                    error={errors[`additional_${index}_email`]}
                    required
                  />
                </div>
              ))}
            </motion.div>
          )}
        </div>
      )}

      <CustomButton
        type="submit"
        variant="primary"
        fullWidth
        className="py-4"
        style={{ backgroundColor: themeColor }}
      >
        Continue to Payment
      </CustomButton>
    </motion.form>
  );
};

export default AttendeeForm;

