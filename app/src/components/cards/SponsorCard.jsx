import React from 'react';
import { motion } from 'framer-motion';
import { ExternalLink } from 'lucide-react';

const SponsorCard = ({ sponsor, tier, themeColor }) => {
  const tierHeights = {
    Platinum: 140,
    Gold: 120,
    Silver: 90,
    Bronze: 70,
    Partner: 60,
  };

  const height = tierHeights[tier] || 80;

  // Generate consistent color from sponsor name
  const getSponsorColor = (name) => {
    const colors = [
      '#1E4DB7', '#7C3AED', '#16A34A', '#0891B2', 
      '#DB2777', '#EA580C', '#059669', '#9333EA'
    ];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const sponsorColor = getSponsorColor(sponsor.name);

  return (
    <motion.a
      href={sponsor.website}
      target="_blank"
      rel="noopener noreferrer"
      className="pressable-card bg-white border border-[#E2E8F0] rounded-xl p-6 flex items-center justify-center relative group"
      style={{ height: `${height}px` }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
    >
      {/* Logo Placeholder */}
      <div 
        className="w-16 h-16 rounded-xl flex items-center justify-center text-white font-bold text-xl"
        style={{ backgroundColor: sponsorColor }}
      >
        {sponsor.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
      </div>

      {/* Sponsor Name */}
      <div className="absolute bottom-3 left-0 right-0 text-center">
        <p className="text-sm font-medium text-[#0F172A]">{sponsor.name}</p>
      </div>

      {/* External Link Icon */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity">
        <ExternalLink className="w-4 h-4 text-[#64748B]" />
      </div>

      {/* Tier Badge */}
      <div 
        className="absolute top-3 left-3 px-2 py-0.5 rounded text-xs font-medium"
        style={{ 
          backgroundColor: `${themeColor}15`,
          color: themeColor
        }}
      >
        {tier}
      </div>
    </motion.a>
  );
};

export default SponsorCard;
