import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PlayerGrid({ players, myPlayerId, revealTeams }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      <AnimatePresence>
        {players.map((p) => (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
            className={`relative rounded-xl p-3 text-center border ${
              p.is_alive ? 'border-white/10 bg-night-800/60' : 'border-white/5 bg-night-900/40 grayscale opacity-60'
            } ${p.id === myPlayerId ? 'ring-1 ring-moon' : ''}`}
          >
            <div className="text-2xl">{p.avatar}</div>
            <div className="text-xs mt-1 truncate">{p.name}</div>
            {!p.is_alive && (
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="absolute -top-2 -right-2 text-lg">
                💀
              </motion.div>
            )}
            {p.revealed_idiot && <div className="text-[10px] text-yellow-300 mt-0.5">🤡 Ngốc</div>}
            {revealTeams && p.team && (
              <div className={`text-[10px] mt-0.5 ${p.team === 'wolf' ? 'text-blood' : p.team === 'lonewolf' ? 'text-sky-300' : 'text-emerald-400'}`}>
                {p.role_name}
              </div>
            )}
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
