import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ROLES_INFO, TEAM_LABEL } from '../data/rolesInfo.js';

export default function RoleCard({ role, onClose }) {
  const [flipped, setFlipped] = useState(false);
  if (!role) return null;
  const info = ROLES_INFO[role.role] || {};

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center px-4" onClick={onClose}>
      <motion.div
        initial={{ scale: 0.7, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="card-flip-scene w-64 h-80 sm:w-72 sm:h-96"
      >
        <div
          className={`card-flip-inner ${flipped ? 'flipped' : ''}`}
          onClick={() => setFlipped((f) => !f)}
        >
          <div
            className="card-face flex items-center justify-center text-6xl border-4 border-moon/40 cursor-pointer"
            style={{ background: 'linear-gradient(160deg,#1c1f3d,#05050d)' }}
          >
            🌕
          </div>
          <div
            className="card-face card-back flex flex-col items-center justify-center gap-3 p-6 text-center cursor-pointer"
            style={{ background: `linear-gradient(160deg, ${info.color}22, #05050d)`, border: `2px solid ${info.color}88` }}
          >
            <div className="text-6xl">{info.icon}</div>
            <div className="font-display text-2xl">{info.name}</div>
            <div className="text-xs uppercase tracking-widest text-white/50">{TEAM_LABEL[info.team]}</div>
            <p className="text-sm text-white/70">{info.desc}</p>
            {role.lover_name && <p className="text-xs text-pink-300 mt-1">💘 Người yêu: {role.lover_name}</p>}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
