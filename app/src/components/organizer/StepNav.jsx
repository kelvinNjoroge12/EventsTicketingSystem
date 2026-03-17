import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

const StepNav = ({ steps, currentStep, completedSteps }) => {
  return (
    <div className="w-full overflow-x-auto hide-scrollbar">
      <div className="flex items-center min-w-max px-2">
        {steps.map((step, index) => {
          const isCompleted = completedSteps.includes(index);
          const isCurrent = currentStep === index;
          const isPending = index > currentStep && !isCompleted;

          return (
            <React.Fragment key={step.id}>
              {/* Step */}
              <div className="flex flex-col items-center">
                <motion.div
                  className={`
                    w-8 h-8 rounded-full flex items-center justify-center
                    text-sm font-semibold
                    ${isCompleted 
                      ? 'bg-[#16A34A] text-white' 
                      : isCurrent 
                        ? 'bg-[#02338D] text-white'
                        : 'bg-[#F1F5F9] text-[#64748B] border border-[#E2E8F0]'}
                  `}
                  initial={false}
                  animate={{
                    scale: isCurrent ? 1.1 : 1,
                  }}
                  transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                >
                  {isCompleted ? (
                    <Check className="w-4 h-4" />
                  ) : (
                    step.number
                  )}
                </motion.div>
                <span className={`
                  mt-2 text-xs font-medium whitespace-nowrap
                  ${isCompleted ? 'text-[#16A34A]' : isCurrent ? 'text-[#02338D]' : 'text-[#64748B]'}
                `}>
                  {step.label}
                </span>
              </div>

              {/* Connector */}
              {index < steps.length - 1 && (
                <div className="w-12 h-px mx-2 bg-[#E2E8F0] relative">
                  {isCompleted && (
                    <motion.div
                      className="absolute inset-y-0 left-0 bg-[#16A34A]"
                      initial={{ width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.3 }}
                    />
                  )}
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};

export default StepNav;

