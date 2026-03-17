import React from 'react';
import { motion } from 'framer-motion';

const CategoryPill = ({
  category,
  isActive = false,
  onClick,
  index = 0,
}) => {
  return (
    <motion.button
      onClick={onClick}
      className={`
        flex items-center gap-2 px-5 py-2.5 rounded-full whitespace-nowrap
        font-medium text-sm transition-all duration-200
        ${isActive
          ? 'bg-[#02338D] text-white shadow-md'
          : 'bg-white text-[#64748B] border border-[#E2E8F0] hover:border-[#02338D] hover:text-[#02338D]'}
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      role="tab"
      aria-selected={isActive}
    >
      <span className="text-lg">{category.icon}</span>
      <span>{category.name}</span>
      <span className={`
        px-2 py-0.5 rounded-full text-xs
        ${isActive ? 'bg-white/20' : 'bg-[#F1F5F9]'}
      `}>
        {category.count}
      </span>
    </motion.button>
  );
};

export default CategoryPill;

