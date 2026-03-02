import React from 'react';
import { motion } from 'framer-motion';

const PageWrapper = ({
  children,
  className = '',
  animate = true,
}) => {
  const baseClasses = `min-h-screen bg-white w-full max-w-[100vw] overflow-x-hidden ${className}`;

  if (!animate) {
    return (
      <main id="main-content" className={baseClasses}>
        {children}
      </main>
    );
  }

  return (
    <motion.main
      id="main-content"
      className={baseClasses}
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
