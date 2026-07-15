import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import PlayerGrid from './PlayerGrid.jsx';

const WINNER_INFO = {
  village: { label: 'DÂN LÀNG', emoji: '🧑‍🌾🎉', color: 'text-emerald-400' },
  wolf: { label: 'PHE SÓI', emoji: '🐺🌕', color: 'text-blood' },
  whitewolf: { label: 'SÓI TRẮNG', emoji: '🐺❄️', color: 'text-sky-300' },
};

const CONFETTI_EMOJI = ['🎉', '✨', '🎊', '🥳', '🌟'];

export default function WinnerScreen({ winner, players, onLeave, hostPlays = true }) {
  const info = WINNER_INFO[winner] || {};
  const confetti = useMemo(
    () =>
      Array.from({ length: 18 }, (_, i) => ({
        id: i,
        left: Math.random() * 100,
        duration: 2.5 + Math.random() * 2,
        delay: Math.random() * 1.5,
        emoji: CONFETTI_EMOJI[i % CONFETTI_EMOJI.length],
      })),
    [],
  );

  return (
    <div className="max-w-3xl mx-auto px-4 py-14 text-center relative overflow-hidden">
      {confetti.map((c) => (
        <span
          key={c.id}
          className="confetti-piece text-2xl"
          style={{ left: `${c.left}%`, animationDuration: `${c.duration}s`, animationDelay: `${c.delay}s` }}
        >
          {c.emoji}
        </span>
      ))}

      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.6 }} className="text-7xl mb-4 relative z-10">
        {info.emoji}
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`font-display text-4xl gradient-text animate-gradient-x relative z-10`}
      >
        {info.label} CHIẾN THẮNG!
      </motion.h1>

      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-8 text-left relative z-10">
        <h2 className="font-display text-lg mb-3 text-center">Vai trò của tất cả mọi người</h2>
        <PlayerGrid players={players} revealTeams hostPlays={hostPlays} />
      </motion.div>

      <motion.button
        whileHover={{ scale: 1.04 }}
        whileTap={{ scale: 0.96 }}
        onClick={onLeave}
        className="mt-8 btn-gradient text-white rounded-full px-6 py-3 font-display relative z-10"
      >
        Về sảnh chính
      </motion.button>
    </div>
  );
}
