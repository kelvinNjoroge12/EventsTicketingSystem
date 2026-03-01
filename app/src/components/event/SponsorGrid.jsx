import React from 'react';
import { motion } from 'framer-motion';
import SponsorCard from '../cards/SponsorCard';

const SponsorGrid = ({ sponsors, themeColor }) => {
  if (!sponsors || sponsors.length === 0) return null;

  // Group sponsors by tier
  const tiers = ['Platinum', 'Gold', 'Silver', 'Bronze', 'Partner'];
  const groupedSponsors = tiers.reduce((acc, tier) => {
    const tierSponsors = sponsors.filter(s => s.tier === tier);
    if (tierSponsors.length > 0) {
      acc[tier] = tierSponsors;
    }
    return acc;
  }, {});

  return (
    <div className="space-y-12">
      <motion.h2
        className="text-2xl font-bold text-[#0F172A]"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        Sponsors & Partners
      </motion.h2>

      {Object.entries(groupedSponsors).map(([tier, tierSponsors]) => (
        <div key={tier} className="space-y-4">
          <h3 
            className="text-lg font-semibold"
            style={{ color: themeColor }}
          >
            {tier} Sponsors
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {tierSponsors.map((sponsor, index) => (
              <motion.div
                key={sponsor.name}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <SponsorCard 
                  sponsor={sponsor} 
                  tier={tier}
                  themeColor={themeColor}
                />
              </motion.div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default SponsorGrid;
