import React from 'react';
import { motion } from 'framer-motion';
import SpeakerCard from '../cards/SpeakerCard';

const SpeakerGrid = ({ speakers, themeColor }) => {
  if (!speakers || speakers.length === 0) return null;

  return (
    <div className="space-y-8">
      <motion.h2
        className="text-2xl font-bold text-[#0F172A]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Meet the Speakers
      </motion.h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {speakers.map((speaker, index) => (
          <motion.div
            key={speaker.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <SpeakerCard speaker={speaker} themeColor={themeColor} />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default SpeakerGrid;
