import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Home, Calendar, HelpCircle } from 'lucide-react';
import PageWrapper from '../components/layout/PageWrapper';
import CustomButton from '../components/ui/CustomButton';

const NotFoundPage = () => {
  // Generate floating question marks
  const questionMarks = Array.from({ length: 6 }, (_, i) => ({
    id: i,
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: 20 + Math.random() * 30,
    duration: 15 + Math.random() * 10,
    delay: Math.random() * 5,
  }));

  return (
    <PageWrapper>
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center relative overflow-hidden">
        {/* Floating Question Marks Background */}
        <div className="absolute inset-0 pointer-events-none">
          {questionMarks.map((qm) => (
            <motion.div
              key={qm.id}
              className="absolute text-[#E2E8F0]"
              style={{
                left: `${qm.x}%`,
                top: `${qm.y}%`,
                fontSize: qm.size,
              }}
              animate={{
                y: [0, -30, 0],
                x: [0, 10, -10, 0],
                rotate: [0, 5, -5, 0],
              }}
              transition={{
                duration: qm.duration,
                repeat: Infinity,
                delay: qm.delay,
                ease: 'easeInOut',
              }}
            >
              <HelpCircle className="w-full h-full" />
            </motion.div>
          ))}
        </div>

        {/* Content */}
        <div className="relative z-10 text-center px-4">
          {/* 404 */}
          <motion.div
            className="mb-8"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <motion.h1
              className="text-8xl md:text-9xl font-bold text-[#1E4DB7]"
              animate={{ y: [0, -20, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
            >
              404
            </motion.h1>
          </motion.div>

          {/* Message */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <h2 className="text-2xl md:text-3xl font-bold text-[#0F172A] mb-4">
              This page doesn't exist
            </h2>
            <p className="text-[#64748B] max-w-md mx-auto mb-8">
              The event or page you're looking for may have been removed or the link is broken.
            </p>
          </motion.div>

          {/* Buttons */}
          <motion.div
            className="flex flex-wrap justify-center gap-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <Link to="/">
              <CustomButton variant="primary" leftIcon={Home}>
                Go Home
              </CustomButton>
            </Link>
            <Link to="/events">
              <CustomButton variant="outline" leftIcon={Calendar}>
                Browse Events
              </CustomButton>
            </Link>
          </motion.div>
        </div>
      </div>
    </PageWrapper>
  );
};

export default NotFoundPage;
