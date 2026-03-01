import React, { useState } from 'react';
import { motion } from 'framer-motion';

const Tabs = ({ 
  tabs, 
  defaultTab = 0, 
  onChange,
  variant = 'default',
  className = '',
  tabClassName = '',
  contentClassName = '',
}) => {
  const [activeTab, setActiveTab] = useState(defaultTab);

  const handleTabChange = (index) => {
    setActiveTab(index);
    if (onChange) {
      onChange(index, tabs[index]);
    }
  };

  const variants = {
    default: 'border-b border-[#E2E8F0]',
    pills: 'bg-[#F1F5F9] p-1 rounded-xl',
    underline: 'border-b border-[#E2E8F0]',
  };

  return (
    <div className={className}>
      {/* Tab List */}
      <div 
        className={`flex ${variants[variant]}`}
        role="tablist"
        aria-label="Tabs"
      >
        {tabs.map((tab, index) => {
          const isActive = activeTab === index;
          
          if (variant === 'pills') {
            return (
              <button
                key={index}
                onClick={() => handleTabChange(index)}
                className={`
                  relative flex-1 px-4 py-2.5 text-sm font-medium rounded-lg
                  transition-colors duration-200
                  ${isActive ? 'text-[#0F172A]' : 'text-[#64748B] hover:text-[#0F172A]'}
                  ${tabClassName}
                `}
                role="tab"
                aria-selected={isActive}
                aria-controls={`tab-panel-${index}`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activePill"
                    className="absolute inset-0 bg-white rounded-lg shadow-sm"
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            );
          }

          return (
            <button
              key={index}
              onClick={() => handleTabChange(index)}
              className={`
                relative px-4 py-3 text-sm font-medium
                transition-colors duration-200
                ${isActive ? 'text-[#1E4DB7]' : 'text-[#64748B] hover:text-[#0F172A]'}
                ${tabClassName}
              `}
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-panel-${index}`}
            >
              {tab.label}
              {isActive && variant !== 'pills' && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#1E4DB7]"
                  transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Tab Panels */}
      <div className={contentClassName}>
        {tabs.map((tab, index) => (
          <div
            key={index}
            id={`tab-panel-${index}`}
            role="tabpanel"
            aria-labelledby={`tab-${index}`}
            hidden={activeTab !== index}
          >
            {activeTab === index && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                {tab.content}
              </motion.div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default Tabs;
