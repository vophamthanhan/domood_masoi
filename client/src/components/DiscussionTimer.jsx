import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export default function DiscussionTimer({ endsAt, isHost, onExtend }) {
  const [remaining, setRemaining] = useState(computeRemaining(endsAt));
  const totalRef = useRef(computeRemaining(endsAt));

  useEffect(() => {
    const r = computeRemaining(endsAt);
    setRemaining(r);
    totalRef.current = Math.max(r, 1);
    const id = setInterval(() => setRemaining(computeRemaining(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;

  const timeUp = remaining <= 0;
  const mm = Math.floor(Math.max(0, remaining) / 60);
  const ss = Math.max(0, remaining) % 60;
  const label = `${mm}:${String(ss).padStart(2, '0')}`;
  const pct = Math.max(0, Math.min(100, (remaining / totalRef.current) * 100));

  return (
    <div className={`relative overflow-hidden rounded-xl border ${timeUp ? 'border-blood bg-blood/10' : 'border-white/10 bg-night-800/70'}`}>
      <motion.div
        className={`absolute inset-y-0 left-0 ${timeUp ? 'bg-blood/20' : 'bg-gradient-to-r from-neon-purple/30 to-neon-cyan/20'}`}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.5, ease: 'linear' }}
      />
      <div className="relative flex items-center gap-3 px-4 py-3">
        <motion.span
          animate={timeUp ? { scale: [1, 1.15, 1] } : {}}
          transition={{ repeat: Infinity, duration: 1 }}
          className={`font-display text-xl tabular-nums ${timeUp ? 'text-blood' : 'text-moon'}`}
        >
          ⏱ {label}
        </motion.span>
        <span className="text-xs text-white/50 flex-1">
          {timeUp ? 'Hết giờ thảo luận!' : 'Thời gian thảo luận còn lại'}
        </span>
        {isHost && (
          <motion.button
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            onClick={() => onExtend(30)}
            className="text-xs border border-white/10 rounded-full px-3 py-1.5 hover:border-neon-purple/50 shrink-0 transition"
          >
            +30s
          </motion.button>
        )}
      </div>
    </div>
  );
}

function computeRemaining(endsAt) {
  if (!endsAt) return 0;
  return Math.round((new Date(endsAt).getTime() - Date.now()) / 1000);
}
