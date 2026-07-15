import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { sfx } from '../lib/sound.js';

const EFFECTS = {
  lovers_linked: { emoji: '💘', text: 'Se duyên!', sound: () => sfx.cupid() },
  hunter_shot: { emoji: '💥', text: 'Thợ Săn nổ súng!', sound: () => sfx.gunshot() },
  whitewolf_betray: { emoji: '❄️🐺', text: 'Sói Trắng phản bội!', sound: () => sfx.gunshot() },
  night_death: { emoji: '💀', text: 'Có người đã chết...', sound: () => sfx.death() },
  execution: { emoji: '⚖️', text: 'Treo cổ!', sound: () => sfx.death() },
  idiot_saved: { emoji: '🤡', text: 'Thoát chết!', sound: () => sfx.vote() },
  vote_tie: { emoji: '🤝', text: 'Hòa phiếu!', sound: () => sfx.vote() },
  game_over: { emoji: '🏆', text: 'Kết thúc!', sound: () => sfx.win() },
};

export default function EffectOverlay({ logs }) {
  const [active, setActive] = useState(null);
  const seenIds = useRef(new Set());
  const firstRun = useRef(true);

  useEffect(() => {
    if (firstRun.current) {
      // Không phát hiệu ứng cho các log đã tồn tại từ trước khi component mount
      logs.forEach((l) => seenIds.current.add(l.id));
      firstRun.current = false;
      return;
    }
    for (const log of logs) {
      if (seenIds.current.has(log.id)) continue;
      seenIds.current.add(log.id);
      const type = log.meta?.type;
      const effect = type && EFFECTS[type];
      if (effect) {
        setActive({ id: log.id, ...effect });
        effect.sound?.();
        setTimeout(() => setActive((cur) => (cur?.id === log.id ? null : cur)), 1600);
      }
    }
  }, [logs]);

  return (
    <AnimatePresence>
      {active && (
        <motion.div
          key={active.id}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-40 flex items-center justify-center pointer-events-none"
        >
          <motion.div
            initial={{ scale: 0.4, y: 20 }}
            animate={{ scale: 1.15, y: 0 }}
            exit={{ scale: 0.6, opacity: 0 }}
            transition={{ type: 'spring', bounce: 0.5 }}
            className="text-center"
          >
            <div className="text-7xl mb-2 drop-shadow-lg">{active.emoji}</div>
            <div className="font-display text-xl text-white/90 bg-black/40 rounded-full px-4 py-1 inline-block">
              {active.text}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
