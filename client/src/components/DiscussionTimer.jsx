import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';

export default function DiscussionTimer({ endsAt, isHost, onExtend }) {
  const [remaining, setRemaining] = useState(computeRemaining(endsAt));

  useEffect(() => {
    setRemaining(computeRemaining(endsAt));
    const id = setInterval(() => setRemaining(computeRemaining(endsAt)), 1000);
    return () => clearInterval(id);
  }, [endsAt]);

  if (!endsAt) return null;

  const timeUp = remaining <= 0;
  const mm = Math.floor(Math.max(0, remaining) / 60);
  const ss = Math.max(0, remaining) % 60;
  const label = `${mm}:${String(ss).padStart(2, '0')}`;

  return (
    <div className={`flex items-center gap-3 rounded-xl px-4 py-3 border ${timeUp ? 'border-blood bg-blood/10' : 'border-white/10 bg-night-800/70'}`}>
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
        <button
          onClick={() => onExtend(30)}
          className="text-xs border border-white/10 rounded-lg px-3 py-1.5 hover:border-moon/50 shrink-0"
        >
          +30s
        </button>
      )}
    </div>
  );
}

function computeRemaining(endsAt) {
  if (!endsAt) return 0;
  return Math.round((new Date(endsAt).getTime() - Date.now()) / 1000);
}
