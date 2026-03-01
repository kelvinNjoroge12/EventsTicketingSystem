import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';

const Toast = ({ toasts, removeToast }) => {
  const icons = {
    success: CheckCircle,
    error: XCircle,
    warning: AlertCircle,
    info: Info,
  };

  const styles = {
    success: 'bg-[#F0FDF4] border-[#16A34A] text-[#16A34A]',
    error: 'bg-[#FEF2F2] border-[#DC2626] text-[#DC2626]',
    warning: 'bg-[#FFFBEB] border-[#D97706] text-[#D97706]',
    info: 'bg-[#EFF6FF] border-[#1E4DB7] text-[#1E4DB7]',
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      <AnimatePresence mode="popLayout">
        {toasts.map((toast) => {
          const Icon = icons[toast.type];
          return (
            <motion.div
              key={toast.id}
              layout
              initial={{ opacity: 0, x: 100, scale: 0.9 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.9 }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className={`
                flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg
                min-w-[300px] max-w-[400px]
                ${styles[toast.type]}
              `}
              role="alert"
            >
              <Icon className="w-5 h-5 flex-shrink-0" aria-hidden="true" />
              <p className="flex-1 text-sm font-medium text-[#0F172A]">
                {toast.message}
              </p>
              <button
                onClick={() => removeToast(toast.id)}
                className="p-1 rounded hover:bg-black/5 transition-colors"
                aria-label="Dismiss notification"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
};

export default Toast;
