import React from 'react';
import { motion } from 'framer-motion';

const PageWrapper = ({ 
  children, 
  className = '',
  animate = true,
}) => {
  if (!animate) {
    return (
      <main id="main-content" className={`min-h-screen bg-white ${className}`}>
        {children}
      </main>
    );
  }

  return (
    <motion.main
      id="main-content"
      className={`min-h-screen bg-white ${className}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      {children}
    </motion.main>
  );
};

export default PageWrapper;
