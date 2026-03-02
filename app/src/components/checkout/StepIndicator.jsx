import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const StepIndicator = ({ steps, currentStep, themeColor }) => {
  return (
    <div className="w-full max-w-full overflow-hidden">
      <div className="flex items-center justify-between w-full max-w-full">
        {steps.map((step, index) => {
          const isCompleted = index < currentStep;
          const isCurrent = index === currentStep;
          const isPending = index > currentStep;

          return (
            <React.Fragment key={step.id}>
              {/* Step */}
              <div className="flex flex-col items-center">
                <motion.div
                  className={`
                    w-10 h-10 rounded-full flex items-center justify-center
                    font-semibold text-sm
                    ${isCompleted
                      ? 'text-white'
                      : isCurrent
                        ? 'text-white'
                        : 'text-[#64748B] bg-[#F1F5F9] border-2 border-[#E2E8F0]'}
                  `}
                  style={{
                    backgroundColor: isCompleted || isCurrent ? themeColor : undefined
                  }}
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {isCompleted ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    step.number
                  )}
                </motion.div>
                <span className={`
                  mt-2 text-xs font-medium
                  ${isCompleted || isCurrent ? 'text-[#0F172A]' : 'text-[#64748B]'}
                `}>
                  {step.label}
                </span>
              </div>

              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="flex-1 h-px mx-4 bg-[#E2E8F0] relative">
                  <motion.div
                    className="absolute inset-y-0 left-0"
                    style={{ backgroundColor: themeColor }}
                    initial={{ width: 0 }}
                    animate={{ width: isCompleted ? '100%' : '0%' }}
                    transition={{ duration: 0.3, delay: 0.1 }}
                  />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepIndicator;
