import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';

function GameLog({ logs }) {
  return (
    <div className="bg-night-800/80 border border-white/10 rounded-2xl p-4">
      <h3 className="font-display mb-2">📜 Diễn biến</h3>
      <div className="space-y-1.5 max-h-52 overflow-auto pr-1 text-sm">
        <AnimatePresence initial={false}>
          {logs.map((l) => (
            <motion.div
              key={l.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-white/70 border-l-2 border-moon/30 pl-2"
            >
              {l.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default React.memo(GameLog);
