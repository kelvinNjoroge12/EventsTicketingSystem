import React from 'react';
import { motion } from 'framer-motion';
import { Linkedin, Twitter } from 'lucide-react';
import CustomAvatar from '../ui/CustomAvatar';

const SpeakerCard = ({ speaker, themeColor }) => {
  return (
    <motion.div
      className="group relative perspective-1000"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover="flip"
    >
      <div className="relative w-full h-80 preserve-3d transition-all duration-500 group-hover:rotate-y-180">
        {/* Front of card */}
        <div 
          className="absolute inset-0 backface-hidden rounded-2xl p-6 flex flex-col items-center justify-center text-center"
          style={{ backgroundColor: `${themeColor}15` }}
        >
          <CustomAvatar 
            name={speaker.name} 
            size="xl" 
            fallbackColor={themeColor}
            className="mb-4"
          />
          <h3 className="font-semibold text-[#0F172A] text-lg mb-1">
            {speaker.name}
          </h3>
          <p className="text-[#02338D] font-medium text-sm mb-1">
            {speaker.title}
          </p>
          <p className="text-[#64748B] text-sm">
            {speaker.org}
          </p>
        </div>

        {/* Back of card */}
        <div 
          className="absolute inset-0 backface-hidden rotate-y-180 rounded-2xl p-6 flex flex-col items-center justify-center text-center"
          style={{ backgroundColor: themeColor }}
        >
          <h3 className="font-semibold text-white text-lg mb-3">
            {speaker.name}
          </h3>
          <p className="text-white/90 text-sm mb-6 line-clamp-4">
            {speaker.bio}
          </p>
          <div className="flex items-center gap-4">
            {speaker.linkedin && (
              <a
                href={speaker.linkedin}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                aria-label={`${speaker.name}'s LinkedIn`}
              >
                <Linkedin className="w-5 h-5" />
              </a>
            )}
            {speaker.twitter && (
              <a
                href={speaker.twitter}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 rounded-full bg-white/20 text-white hover:bg-white/30 transition-colors"
                aria-label={`${speaker.name}'s Twitter`}
              >
                <Twitter className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      </div>

      <style jsx>{`
        .perspective-1000 {
          perspective: 1000px;
        }
        .preserve-3d {
          transform-style: preserve-3d;
        }
        .backface-hidden {
          backface-visibility: hidden;
        }
        .rotate-y-180 {
          transform: rotateY(180deg);
        }
        .group-hover:rotate-y-180:hover {
          transform: rotateY(180deg);
        }
      `}</style>
    </motion.div>
  );
};

export default SpeakerCard;

