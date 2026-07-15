import React from 'react';
import { motion } from 'framer-motion';
import PlayerGrid from './PlayerGrid.jsx';

const WINNER_INFO = {
  village: { label: 'DÂN LÀNG', emoji: '🧑‍🌾🎉', color: 'text-emerald-400' },
  wolf: { label: 'PHE SÓI', emoji: '🐺🌕', color: 'text-blood' },
  whitewolf: { label: 'SÓI TRẮNG', emoji: '🐺❄️', color: 'text-sky-300' },
};

export default function WinnerScreen({ winner, players, onLeave }) {
  const info = WINNER_INFO[winner] || {};
  return (
    <div className="max-w-3xl mx-auto px-4 py-14 text-center">
      <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', bounce: 0.5 }} className="text-7xl mb-4">
        {info.emoji}
      </motion.div>
      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={`font-display text-4xl ${info.color}`}
      >
        {info.label} CHIẾN THẮNG!
      </motion.h1>

      <div className="mt-8 text-left">
        <h2 className="font-display text-lg mb-3 text-center">Vai trò của tất cả mọi người</h2>
        <PlayerGrid players={players} revealTeams />
      </div>

      <button onClick={onLeave} className="mt-8 bg-moon/20 hover:bg-moon/30 rounded-lg px-6 py-3 font-display">
        Về sảnh chính
      </button>
    </div>
  );
}
