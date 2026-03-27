import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';
import { logoImage } from '../../lib/imageUtils';

const SponsorCard = ({ sponsor }) => {
  // Generate consistent color from sponsor name
  const getSponsorColor = (name) => {
    const colors = [
      '#02338D', '#7C3AED', '#16A34A', '#0891B2', 
      '#DB2777', '#EA580C', '#059669', '#9333EA'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const sponsorColor = getSponsorColor(sponsor.name);
  const cardContent = (
    <>
      <div
        className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full border border-[#E2E8F0] bg-white p-3"
      >
        {sponsor.logo ? (
          <img src={logoImage(sponsor.logo)} alt={sponsor.name} className="h-full w-full rounded-full object-contain" />
        ) : (
          <div
            className="flex h-full w-full items-center justify-center rounded-full text-white font-bold text-xl"
            style={{ backgroundColor: sponsorColor }}
          >
            {sponsor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
          </div>
        )}
      </div>

      <div className="absolute bottom-3 left-0 right-0 text-center">
        <p className="text-sm font-medium text-[#0F172A]">{sponsor.name}</p>
      </div>

      {sponsor.website && (
        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
          <ExternalLink className="w-4 h-4 text-[#64748B]" />
        </div>
      )}
    </>
  );

  if (sponsor.website) {
    return (
      <motion.a
        href={sponsor.website}
        target="_blank"
        rel="noopener noreferrer"
        className="pressable-card bg-white border border-[#E2E8F0] rounded-xl p-6 flex items-center justify-center relative group"
        style={{ height: '140px' }}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {cardContent}
      </motion.a>
    );
  }

  return (
    <motion.div
      className="bg-white border border-[#E2E8F0] rounded-xl p-6 flex items-center justify-center relative"
      style={{ height: '140px' }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {cardContent}
    </motion.div>
  );
};

export default SponsorCard;

