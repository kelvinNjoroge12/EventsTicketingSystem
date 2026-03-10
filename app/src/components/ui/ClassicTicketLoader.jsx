import React, { useEffect, useMemo, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/utils';

const PALETTES = [
  ['#0B1020', '#1E4DB7', 'rgba(30,77,183,0.85)'],
  ['#0B1020', '#C58B1A', 'rgba(197,139,26,0.85)'],
  ['#0B1020', '#B91C1C', 'rgba(185,28,28,0.85)'],
  ['#0B1020', '#7C3AED', 'rgba(124,58,237,0.85)'],
  ['#0B1020', '#0EA5E9', 'rgba(14,165,233,0.85)'],
  ['#0B1020', '#22C55E', 'rgba(34,197,94,0.85)'],
];

const makeTicketSVG = (palette, holeColor) => {
  const [body, stripe, border] = palette;
  const w = 22;
  const h = 11;
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" fill="none" xmlns="http://www.w3.org/2000/svg">
    <rect x="0.5" y="0.5" width="${w - 1}" height="${h - 1}" rx="1.8" fill="${body}" stroke="${border}" stroke-width="0.8"/>
    <line x1="${w * 0.64}" y1="1.4" x2="${w * 0.64}" y2="${h - 1.4}"
      stroke="${stripe}" stroke-opacity="0.45" stroke-width="0.6" stroke-dasharray="1.4 1.4"/>
    <circle cx="${w * 0.64}" cy="0" r="2.4" fill="${holeColor}"/>
    <circle cx="${w * 0.64}" cy="${h}" r="2.4" fill="${holeColor}"/>
    <rect x="2.2" y="${h * 0.28}" width="${w * 0.36}" height="${h * 0.18}" rx="0.6" fill="${stripe}" fill-opacity="0.8"/>
    <rect x="2.2" y="${h * 0.56}" width="${w * 0.22}" height="${h * 0.15}" rx="0.5" fill="${stripe}" fill-opacity="0.4"/>
  </svg>`;
};

const ClassicTicketLoader = ({
  visible = false,
  overlay = true,
  className = '',
  ariaLabel = 'Loading content',
}) => {
  const stageRef = useRef(null);
  const timersRef = useRef([]);

  const holeColor = overlay ? '#0B1020' : '#FFFFFF';
  const containerClass = overlay
    ? 'fixed inset-0 z-[120] bg-[#0B1020]/90 backdrop-blur-[2px] flex items-center justify-center px-4'
    : 'w-full flex items-center justify-center py-14';

  const ringStyle = useMemo(
    () => ({
      width: 44,
      height: 44,
      borderRadius: '999px',
      border: '2px solid rgba(197,139,26,0.18)',
      borderTopColor: 'rgba(197,139,26,0.85)',
      borderRightColor: 'rgba(197,139,26,0.45)',
      transform: 'translate(-50%, -50%)',
      animation: 'ticket-spinner-spin 1.1s linear infinite',
    }),
    []
  );

  useEffect(() => {
    if (!visible) return undefined;
    const stage = stageRef.current;
    if (!stage) return undefined;

    let destroyed = false;
    let uid = 0;

    const clearTimers = () => {
      timersRef.current.forEach((timer) => clearTimeout(timer));
      timersRef.current = [];
    };

    const spawnTicket = () => {
      if (destroyed || !stage) return;
      const palette = PALETTES[Math.floor(Math.random() * PALETTES.length)];
      const angle = Math.random() * Math.PI * 2;
      const dist = 100 + Math.random() * 160;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const spin = (Math.random() > 0.5 ? 1 : -1) * (120 + Math.random() * 200);
      const dur = 900 + Math.random() * 500;
      const ticket = document.createElement('div');
      ticket.style.position = 'absolute';
      ticket.style.top = '0';
      ticket.style.left = '0';
      ticket.style.transform = 'translate(-50%, -50%)';
      ticket.style.pointerEvents = 'none';
      ticket.style.willChange = 'transform, opacity';
      ticket.dataset.uid = String(uid++);
      ticket.innerHTML = makeTicketSVG(palette, holeColor);
      stage.appendChild(ticket);

      const animation = ticket.animate(
        [
          {
            transform: 'translate(-50%, -50%) translate(0px, 0px) scale(0.05) rotate(0deg)',
            opacity: 0,
          },
          { offset: 0.12, opacity: 1 },
          {
            offset: 0.45,
            transform: `translate(-50%, -50%) translate(${tx * 0.45}px, ${ty * 0.45}px) scale(1.15) rotate(${spin * 0.45}deg)`,
            opacity: 1,
          },
          {
            transform: `translate(-50%, -50%) translate(${tx}px, ${ty}px) scale(0.5) rotate(${spin}deg)`,
            opacity: 0,
          },
        ],
        {
          duration: dur,
          easing: 'cubic-bezier(0.25, 0.46, 0.45, 0.94)',
          fill: 'forwards',
        }
      );

      animation.onfinish = () => {
        ticket.remove();
      };
    };

    const burst = () => {
      const count = Math.random() < 0.35 ? 2 : 1;
      for (let i = 0; i < count; i += 1) {
        const timer = setTimeout(spawnTicket, i * 70);
        timersRef.current.push(timer);
      }
    };

    const intervalId = setInterval(burst, 180);
    for (let i = 0; i < 4; i += 1) {
      const timer = setTimeout(spawnTicket, i * 90);
      timersRef.current.push(timer);
    }

    return () => {
      destroyed = true;
      clearInterval(intervalId);
      clearTimers();
      stage.innerHTML = '';
    };
  }, [holeColor, visible]);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className={cn(containerClass, className)}
          role="status"
          aria-live="polite"
          aria-label={ariaLabel}
        >
          <style>
            {`@keyframes ticket-spinner-spin { to { transform: translate(-50%, -50%) rotate(360deg); } }`}
          </style>
          <div ref={stageRef} className="relative w-0 h-0">
            <div style={ringStyle} />
            <div
              style={{
                position: 'absolute',
                width: 8,
                height: 8,
                borderRadius: '999px',
                background: 'rgba(197,139,26,0.7)',
                transform: 'translate(-50%, -50%)',
              }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default ClassicTicketLoader;
