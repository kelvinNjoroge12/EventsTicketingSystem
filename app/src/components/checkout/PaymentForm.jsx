import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { CreditCard, Smartphone, Lock } from 'lucide-react';
import CustomInput from '../ui/CustomInput';
import CustomButton from '../ui/CustomButton';

const PaymentForm = ({
  event,
  cart,
  onSubmit,
  themeColor,
  isProcessing,
}) => {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [formData, setFormData] = useState({
    cardNumber: '',
    expiry: '',
    cvv: '',
    cardholderName: '',
    mpesaPhone: '',
  });
  const [errors, setErrors] = useState({});

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const formatCardNumber = (value) => {
    return value.replace(/\s/g, '').replace(/(\d{4})/g, '$1 ').trim().slice(0, 19);
  };

  const formatExpiry = (value) => {
    return value.replace(/\//g, '').replace(/(\d{2})(\d{0,2})/, '$1/$2').slice(0, 5);
  };

  const validate = () => {
    const newErrors = {};

    if (paymentMethod === 'card') {
      if (!formData.cardNumber.trim()) {
        newErrors.cardNumber = 'Card number is required';
      } else if (formData.cardNumber.replace(/\s/g, '').length < 16) {
        newErrors.cardNumber = 'Please enter a valid card number';
      }

      if (!formData.expiry.trim()) {
        newErrors.expiry = 'Expiry date is required';
      }

      if (!formData.cvv.trim()) {
        newErrors.cvv = 'CVV is required';
      } else if (formData.cvv.length < 3) {
        newErrors.cvv = 'Please enter a valid CVV';
      }

      if (!formData.cardholderName.trim()) {
        newErrors.cardholderName = 'Cardholder name is required';
      }
    } else {
      if (!formData.mpesaPhone.trim()) {
        newErrors.mpesaPhone = 'Phone number is required';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit({
        paymentMethod,
        ...formData,
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
        Payment Details
      </h2>

      {/* Payment Method Tabs */}
      <div className="flex gap-2 p-1 bg-[#F1F5F9] rounded-xl">
        <button
          type="button"
          onClick={() => setPaymentMethod('card')}
          className={`
            flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all
            ${paymentMethod === 'card'
              ? 'bg-white text-[#0F172A] shadow-sm'
              : 'text-[#64748B] hover:text-[#0F172A]'}
          `}
        >
          <CreditCard className="w-5 h-5" />
          Card
        </button>
        <button
          type="button"
          onClick={() => setPaymentMethod('mpesa')}
          className={`
            flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all
            ${paymentMethod === 'mpesa'
              ? 'bg-white text-[#0F172A] shadow-sm'
              : 'text-[#64748B] hover:text-[#0F172A]'}
          `}
        >
          <Smartphone className="w-5 h-5" />
          M-Pesa
        </button>
      </div>

      {/* Card Payment Form */}
      {paymentMethod === 'card' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <CustomInput
            label="Card Number"
            placeholder="1234 5678 9012 3456"
            value={formData.cardNumber}
            onChange={(e) => handleChange('cardNumber', formatCardNumber(e.target.value))}
            error={errors.cardNumber}
            leftIcon={CreditCard}
            required
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <CustomInput
              label="Expiry Date"
              placeholder="MM/YY"
              value={formData.expiry}
              onChange={(e) => handleChange('expiry', formatExpiry(e.target.value))}
              error={errors.expiry}
              required
            />
            <CustomInput
              label="CVV"
              placeholder="123"
              type="password"
              maxLength={4}
              value={formData.cvv}
              onChange={(e) => handleChange('cvv', e.target.value.replace(/\D/g, '').slice(0, 4))}
              error={errors.cvv}
              required
            />
          </div>

          <CustomInput
            label="Cardholder Name"
            placeholder="John Doe"
            value={formData.cardholderName}
            onChange={(e) => handleChange('cardholderName', e.target.value)}
            error={errors.cardholderName}
            required
          />
        </motion.div>
      )}

      {/* M-Pesa Payment Form */}
      {paymentMethod === 'mpesa' && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          <div className="p-4 bg-[#F0FDF4] rounded-xl">
            <p className="text-sm text-[#16A34A]">
              You will receive an M-Pesa prompt on your phone to complete the payment.
            </p>
          </div>

          <CustomInput
            label="M-Pesa Phone Number"
            placeholder="254 712 345 678"
            value={formData.mpesaPhone}
            onChange={(e) => handleChange('mpesaPhone', e.target.value)}
            error={errors.mpesaPhone}
            leftIcon={Smartphone}
            required
          />
        </motion.div>
      )}

      {/* Security Note */}
      <div className="flex items-center gap-2 text-sm text-[#64748B]">
        <Lock className="w-4 h-4" />
        <span>Your payment information is secure and encrypted</span>
      </div>

      <CustomButton
        type="submit"
        variant="primary"
        fullWidth
        isLoading={isProcessing}
        className="py-4"
        style={{ backgroundColor: themeColor }}
      >
        {isProcessing ? 'Processing...' : `Pay ${event.currency} ${cart.total.toLocaleString()}`}
      </CustomButton>
    </motion.form>
  );
};

export default PaymentForm;
