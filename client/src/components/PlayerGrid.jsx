import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function PlayerGrid({ players, myPlayerId, revealTeams, hostPlays = true }) {
  return (
    <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
      <AnimatePresence>
        {players.map((p) => {
          const isObserverHost = p.is_host && !hostPlays;
          return (
          <motion.div
            key={p.id}
            layout
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={p.is_alive || isObserverHost ? { scale: 1.06, y: -2 } : {}}
            transition={{ type: 'spring', stiffness: 300, damping: 22 }}
            className={`relative rounded-xl p-3 text-center border transition-colors ${
              isObserverHost
                ? 'border-neon-purple/30 bg-neon-purple/10'
                : p.is_alive
                ? 'border-white/10 bg-night-800/60 hover:border-neon-purple/50'
                : 'border-white/5 bg-night-900/40 grayscale opacity-60'
            } ${p.id === myPlayerId ? 'ring-2 ring-moon shadow-glow' : ''}`}
          >
            <div className="text-2xl">{p.avatar}</div>
            <div className="text-xs mt-1 truncate">{p.name}</div>
            {isObserverHost ? (
              <div className="text-[10px] text-neon-purple mt-0.5">🎙️ Quản trò</div>
            ) : (
              !p.is_alive && (
                <motion.div initial={{ scale: 0, rotate: -20 }} animate={{ scale: 1, rotate: 0 }} transition={{ type: 'spring', bounce: 0.6 }} className="absolute -top-2 -right-2 text-lg">
                  💀
                </motion.div>
              )
            )}
            {p.revealed_idiot && <div className="text-[10px] text-yellow-300 mt-0.5">🤡 Ngốc</div>}
            {revealTeams && p.team && (
              <div className={`text-[10px] mt-0.5 ${p.team === 'wolf' ? 'text-blood' : p.team === 'lonewolf' ? 'text-sky-300' : 'text-emerald-400'}`}>
                {p.role_name}
              </div>
            )}
          </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}

export default React.memo(PlayerGrid);
