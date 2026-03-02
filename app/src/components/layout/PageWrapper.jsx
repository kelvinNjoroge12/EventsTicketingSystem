import React from 'react';
import { motion } from 'framer-motion';

// Inline style that cannot be overridden by Tailwind/framer-motion transforms.
// overflow: clip is stronger than overflow: hidden — it clips even
// position:fixed / position:sticky children and elements with CSS transforms.
const clipStyle = { maxWidth: '100vw', overflowX: 'clip' };

const PageWrapper = ({
  children,
  className = '',
  animate = true,
}) => {
  const baseClasses = `min-h-screen bg-white w-full ${className}`;

  if (!animate) {
    return (
      <main id="main-content" className={baseClasses} style={clipStyle}>
        {children}
      </main>
    );
  }

  return (
    <motion.main
      id="main-content"
      className={baseClasses}
      style={clipStyle}
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
