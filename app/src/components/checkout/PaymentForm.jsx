import React, { useEffect, useState } from 'react';
import { CardElement, useElements, useStripe } from '@stripe/react-stripe-js';
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
  stripeEnabled = true,
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [paymentMethod, setPaymentMethod] = useState(stripeEnabled ? 'card' : 'mpesa');
  const [formData, setFormData] = useState({
    cardholderName: '',
    mpesaPhone: '',
  });
  const [errors, setErrors] = useState({});
  const [cardComplete, setCardComplete] = useState(false);
  const currency = event?.currency || 'KES';

  useEffect(() => {
    if (!stripeEnabled && paymentMethod === 'card') {
      setPaymentMethod('mpesa');
    }
  }, [stripeEnabled, paymentMethod]);

  const handleChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (paymentMethod === 'card') {
      if (!stripeEnabled) {
        newErrors.card = 'Card payments are not available yet.';
      } else if (!cardComplete) {
        newErrors.card = 'Please complete your card details.';
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
        cardholderName: formData.cardholderName,
        mpesaPhone: formData.mpesaPhone,
      }, { stripe, elements });
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
          disabled={!stripeEnabled}
          className={`
            flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-lg font-medium transition-all
            ${paymentMethod === 'card'
              ? 'bg-white text-[#0F172A] shadow-sm'
              : 'text-[#64748B] hover:text-[#0F172A]'}
            ${!stripeEnabled ? 'opacity-50 cursor-not-allowed' : ''}
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
          <div className="space-y-2">
            <label className="block text-sm font-medium text-[#0F172A]">Card Details</label>
            <div className={`rounded-lg border ${errors.card ? 'border-red-400' : 'border-[#E2E8F0]'} px-4 py-3 bg-white`}>
              <CardElement
                options={{
                  style: {
                    base: {
                      fontSize: '16px',
                      color: '#0F172A',
                      fontFamily: 'inherit',
                      '::placeholder': { color: '#94A3B8' },
                    },
                    invalid: { color: '#DC2626' },
                  },
                }}
                onChange={(event) => {
                  setCardComplete(event.complete);
                  if (event.error) {
                    setErrors((prev) => ({ ...prev, card: event.error.message }));
                  } else if (errors.card) {
                    setErrors((prev) => ({ ...prev, card: '' }));
                  }
                }}
              />
            </div>
            {errors.card && <p className="text-sm text-[#DC2626]">{errors.card}</p>}
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
        {isProcessing ? 'Processing...' : `Pay ${currency} ${cart.total.toLocaleString()}`}
      </CustomButton>
    </motion.form>
  );
};

export default PaymentForm;
