import React from 'react';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

const Button = ({
  children,
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled = false,
  fullWidth = false,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  onClick,
  type = 'button',
  className = '',
  ariaLabel,
  ...props
}) => {
  const baseStyles = 'pressable-btn inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#02338D] focus-visible:ring-offset-2';
  const hasRounded = className.includes('rounded-');

  const variants = {
    primary: 'bg-[#02338D] text-white hover:bg-[#022A78] active:bg-[#163a8f]',
    secondary: 'bg-[#7C3AED] text-white hover:bg-[#6d28d9] active:bg-[#5b21b6]',
    outline: 'border-2 border-[#02338D] text-[#02338D] bg-transparent hover:bg-[#02338D] hover:text-white',
    ghost: 'text-[#02338D] bg-transparent hover:bg-[#EFF6FF]',
    danger: 'bg-[#DC2626] text-white hover:bg-[#b91c1c] active:bg-[#991b1b]',
    success: 'bg-[#16A34A] text-white hover:bg-[#15803d] active:bg-[#166534]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-5 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
    xl: 'px-8 py-4 text-xl',
  };

  const isDisabled = disabled || isLoading;

  return (
    <motion.button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      aria-label={ariaLabel}
      className={`
        ${baseStyles}
        ${variants[variant]}
        ${sizes[size]}
        ${hasRounded ? '' : 'rounded-2xl'}
        ${fullWidth ? 'w-full' : ''}
        ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
      whileHover={isDisabled ? {} : { y: -2 }}
      whileTap={isDisabled ? {} : { scale: 0.98 }}
      {...props}
    >
      {isLoading && (
        <Loader2 className="w-5 h-5 mr-2 animate-spin" aria-hidden="true" />
      )}
      {!isLoading && LeftIcon && (
        <LeftIcon className="w-5 h-5 mr-2" aria-hidden="true" />
      )}
      {children}
      {!isLoading && RightIcon && (
        <RightIcon className="w-5 h-5 ml-2" aria-hidden="true" />
      )}
    </motion.button>
  );
};

export default Button;


