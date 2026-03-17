import React from 'react';
import { motion } from 'framer-motion';
import { User, Building2, Check } from 'lucide-react';

const RoleSelector = ({ selectedRole, onSelect }) => {
  const roles = [
    {
      id: 'attendee',
      title: "I'm an Attendee",
      description: 'Discover and attend Strathmore-organized and affiliated events for students, alumni, and corporate guests',
      icon: User,
    },
    {
      id: 'organizer',
      title: "I'm an Organizer",
      description: 'Create and manage Strathmore-organized and affiliated events for students, alumni, and corporate guests',
      icon: Building2,
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {roles.map((role, index) => {
        const isSelected = selectedRole === role.id;
        const Icon = role.icon;

        return (
          <motion.button
            key={role.id}
            type="button"
            onClick={() => onSelect(role.id)}
            className={`
              relative p-6 rounded-2xl border-2 text-left transition-all
              ${isSelected
                ? 'border-[#02338D] bg-[#EFF6FF]'
                : 'border-[#E2E8F0] bg-white hover:border-[#02338D]/50'}
            `}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              type: 'spring', 
              stiffness: 300, 
              damping: 20,
              delay: index * 0.1 
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {/* Checkmark */}
            {isSelected && (
              <motion.div
                className="absolute top-4 right-4 w-6 h-6 bg-[#02338D] rounded-full flex items-center justify-center"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', stiffness: 400, damping: 17 }}
              >
                <Check className="w-4 h-4 text-white" />
              </motion.div>
            )}

            {/* Icon */}
            <div 
              className={`
                w-12 h-12 rounded-xl flex items-center justify-center mb-4
                ${isSelected ? 'bg-[#02338D] text-white' : 'bg-[#F1F5F9] text-[#64748B]'}
              `}
            >
              <Icon className="w-6 h-6" />
            </div>

            {/* Content */}
            <h3 className="font-semibold text-[#0F172A] text-lg mb-2">
              {role.title}
            </h3>
            <p className="text-sm text-[#64748B]">
              {role.description}
            </p>
          </motion.button>
        );
      })}
    </div>
  );
};

export default RoleSelector;

