import React from 'react';
import { motion } from 'framer-motion';

const Badge = ({
  children,
  variant = 'default',
  size = 'md',
  className = '',
  animate = false,
  ...props
}) => {
  const variants = {
    default: 'bg-[#EFF6FF] text-[#1E4DB7]',
    primary: 'bg-[#1E4DB7] text-white',
    accent: 'bg-[#7C3AED] text-white',
    success: 'bg-[#F0FDF4] text-[#16A34A]',
    error: 'bg-[#FEF2F2] text-[#DC2626]',
    warning: 'bg-[#FFFBEB] text-[#D97706]',
    outline: 'border border-[#E2E8F0] text-[#64748B] bg-white',
  };

  const sizes = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-3 py-1 text-sm',
    lg: 'px-4 py-1.5 text-base',
  };

  const Component = animate ? motion.span : 'span';

  return (
    <Component
      className={`
        inline-flex items-center justify-center font-medium rounded-full
        ${variants[variant]}
        ${sizes[size]}
        ${className}
      `}
      {...(animate && {
        initial: { scale: 0.8, opacity: 0 },
        animate: { scale: 1, opacity: 1 },
        transition: { type: 'spring', stiffness: 300, damping: 15 }
      })}
      {...props}
    >
      {children}
    </Component>
  );
};

export default Badge;
