import React from 'react';
import { motion } from 'framer-motion';

const FormStep = ({ 
  children, 
  isActive, 
  direction = 'forward',
}) => {
  if (!isActive) return null;

  const variants = {
    enter: (direction) => ({
      x: direction === 'forward' ? 50 : -50,
      opacity: 0,
    }),
    center: {
      x: 0,
      opacity: 1,
    },
    exit: (direction) => ({
      x: direction === 'forward' ? -50 : 50,
      opacity: 0,
    }),
  };

  return (
    <motion.div
      custom={direction}
      variants={variants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="w-full"
    >
      {children}
    </motion.div>
  );
};

export default FormStep;
