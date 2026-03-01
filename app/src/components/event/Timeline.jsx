import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

const Timeline = ({ schedule, themeColor }) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true, margin: '-100px' });

  // Mock current time for highlighting
  const currentTime = '11:00 AM';

  const isCurrentOrNext = (time) => {
    // Simple comparison for demo
    return time === currentTime;
  };

  return (
    <div ref={ref} className="relative">
      {/* Timeline Line */}
      <div className="absolute left-[80px] top-0 bottom-0 w-px bg-[#E2E8F0]">
        <motion.div
          className="absolute top-0 left-0 w-full"
          style={{ 
            backgroundColor: themeColor,
            height: isInView ? '100%' : '0%'
          }}
          initial={{ height: 0 }}
          animate={{ height: isInView ? '100%' : 0 }}
          transition={{ duration: 1.5, ease: 'easeOut' }}
        />
      </div>

      {/* Timeline Items */}
      <div className="space-y-6">
        {schedule.map((item, index) => {
          const isHighlighted = isCurrentOrNext(item.time);
          
          return (
            <motion.div
              key={index}
              className={`
                relative flex items-start gap-6 p-4 rounded-xl
                ${isHighlighted ? 'bg-opacity-10' : ''}
              `}
              style={{ backgroundColor: isHighlighted ? `${themeColor}15` : 'transparent' }}
              initial={{ opacity: 0, x: -20 }}
              animate={isInView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.4, delay: index * 0.1 }}
            >
              {/* Time */}
              <div className="w-16 flex-shrink-0 text-right">
                <span className={`
                  text-sm font-medium
                  ${isHighlighted ? 'text-[#0F172A]' : 'text-[#64748B]'}
                `}>
                  {item.time}
                </span>
              </div>

              {/* Dot */}
              <div 
                className={`
                  relative z-10 w-3 h-3 rounded-full flex-shrink-0 mt-1
                  ${isHighlighted ? 'ring-4' : ''}
                `}
                style={{ 
                  backgroundColor: isHighlighted ? themeColor : '#E2E8F0',
                  ringColor: isHighlighted ? `${themeColor}30` : 'transparent'
                }}
              />

              {/* Content */}
              <div className="flex-1">
                <h4 className={`
                  font-semibold mb-1
                  ${isHighlighted ? 'text-[#0F172A]' : 'text-[#0F172A]'}
                `}>
                  {item.title}
                </h4>
                {item.speaker && (
                  <p className="text-sm text-[#64748B]">
                    {item.speaker}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default Timeline;
