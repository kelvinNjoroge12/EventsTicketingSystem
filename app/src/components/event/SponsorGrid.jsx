import React from 'react';
import { motion } from 'framer-motion';
import SponsorCard from '../cards/SponsorCard';

const SponsorGrid = ({ sponsors }) => {
  if (!sponsors || sponsors.length === 0) return null;

  return (
    <div className="space-y-12">
      <motion.h2
        className="text-2xl font-bold text-[#0F172A]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Sponsors
      </motion.h2>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
        {sponsors.map((sponsor, index) => (
          <motion.div
            key={sponsor.id || sponsor.name}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <SponsorCard
              sponsor={sponsor}
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SponsorGrid;
