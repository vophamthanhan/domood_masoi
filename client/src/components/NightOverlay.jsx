import React from 'react';
import { motion } from 'framer-motion';

export default function NightOverlay({ label }) {
  return (
    <div className="relative flex flex-col items-center justify-center py-14 overflow-hidden rounded-2xl bg-gradient-to-b from-night-900 to-night-800 border border-white/10">
      <div className="pointer-events-none absolute inset-0 bg-brand-gradient opacity-[0.06] animate-gradient-x" />
      <motion.div
        initial={{ y: 40, opacity: 0, scale: 0.7 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 1, ease: 'easeOut' }}
        className="text-7xl mb-4 animate-float"
      >
        🌕
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4, duration: 0.8 }}
        className="font-display text-2xl gradient-text tracking-wide"
      >
        Màn đêm buông xuống...
      </motion.div>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="text-white/60 mt-2"
      >
        {label}
      </motion.div>
      <div className="absolute bottom-4 text-3xl animate-drift">🌫️</div>
    </div>
  );
}
