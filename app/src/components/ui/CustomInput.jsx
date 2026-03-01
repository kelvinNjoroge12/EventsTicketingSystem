import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

const Input = forwardRef(({
  label,
  error,
  helperText,
  leftIcon: LeftIcon,
  rightIcon: RightIcon,
  fullWidth = false,
  className = '',
  labelClassName = '',
  inputClassName = '',
  id,
  required = false,
  ...props
}, ref) => {
  const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
  const errorId = `${inputId}-error`;
  const helperId = `${inputId}-helper`;

  return (
    <div className={`${fullWidth ? 'w-full' : ''} ${className}`}>
      {label && (
        <label 
          htmlFor={inputId}
          className={`block text-sm font-medium text-[#0F172A] mb-1.5 ${labelClassName}`}
        >
          {label}
          {required && <span className="text-[#DC2626] ml-1">*</span>}
        </label>
      )}
      <div className="relative">
        {LeftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]">
            <LeftIcon className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
        <input
          ref={ref}
          id={inputId}
          className={`
            w-full px-4 py-2.5 bg-white border rounded-lg
            text-[#0F172A] placeholder-[#94A3B8]
            transition-all duration-200
            focus:outline-none focus:ring-2 focus:ring-[#1E4DB7] focus:border-transparent
            disabled:bg-[#F1F5F9] disabled:text-[#94A3B8] disabled:cursor-not-allowed
            ${error ? 'border-[#DC2626] focus:ring-[#DC2626]' : 'border-[#E2E8F0]'}
            ${LeftIcon ? 'pl-11' : ''}
            ${RightIcon ? 'pr-11' : ''}
            ${inputClassName}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={error ? errorId : helperText ? helperId : undefined}
          {...props}
        />
        {RightIcon && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64748B]">
            <RightIcon className="w-5 h-5" aria-hidden="true" />
          </div>
        )}
      </div>
      {error && (
        <motion.p
          id={errorId}
          className="mt-1.5 text-sm text-[#DC2626]"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          role="alert"
        >
          {error}
        </motion.p>
      )}
      {helperText && !error && (
        <p id={helperId} className="mt-1.5 text-sm text-[#64748B]">
          {helperText}
        </p>
      )}
    </div>
  );
});

Input.displayName = 'Input';

export default Input;
