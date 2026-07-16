import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/functions.js';

const AVATARS = ['🧑', '👩', '🧔', '👨‍🌾', '👩‍🦰', '🧑‍🎨', '👨‍🚀', '🧙', '🧛', '🕵️'];

const cardIn = { hidden: { opacity: 0, y: 24, scale: 0.97 }, show: { opacity: 1, y: 0, scale: 1 } };
const fieldIn = {
  hidden: { opacity: 0, y: 12 },
  show: (i) => ({ opacity: 1, y: 0, transition: { delay: 0.15 + i * 0.08, duration: 0.35 } }),
};

export default function Home({ onJoined }) {
  const [name, setName] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [avatar, setAvatar] = useState(AVATARS[0]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin(e) {
    e.preventDefault();
    setError('');
    if (!name.trim() || !roomCode.trim()) {
      setError('Điền tên với mã phòng vô đã nào 👀');
      return;
    }
    setLoading(true);
    try {
      const { room, player } = await api.joinRoom(roomCode.trim().toUpperCase(), name.trim(), avatar);
      onJoined(room.code, player.id);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 bg-brand/20 rounded-full blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -right-24 w-72 h-72 bg-brand-light/20 rounded-full blur-3xl" />

      <motion.div
        variants={cardIn}
        initial="hidden"
        animate="show"
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md glass-card border-white/10 rounded-3xl p-6 sm:p-8 shadow-glow relative z-10"
      >
        <div className="text-center mb-6">
          <motion.div
            className="text-5xl sm:text-6xl mb-2 animate-float inline-block"
            whileHover={{ rotate: [0, -8, 8, -4, 0], transition: { duration: 0.5 } }}
          >
            🐺🌕
          </motion.div>
          <h1 className="font-display text-3xl sm:text-4xl gradient-text animate-gradient-x">Ma Sói Online</h1>
          <p className="text-white/50 text-sm mt-1.5">Rủ hội bạn vào phòng, xem ai là sói trong đêm nay 🔥</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <motion.div variants={fieldIn} custom={0} initial="hidden" animate="show">
            <label className="text-xs uppercase tracking-wide text-white/40">Tên hiển thị</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoComplete="name"
              placeholder="Vd: Minh Trần"
              className="mt-1 w-full text-base bg-night-900 border border-white/10 rounded-xl px-4 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30"
            />
          </motion.div>

          <motion.div variants={fieldIn} custom={1} initial="hidden" animate="show">
            <label className="text-xs uppercase tracking-wide text-white/40">Mã phòng</label>
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={8}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="Vd: LANG01"
              className="mt-1 w-full text-base bg-night-900 border border-white/10 rounded-xl px-4 py-2.5 outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/30 tracking-widest font-display"
            />
            <p className="text-[11px] text-white/30 mt-1">Phòng chưa có? Tự tạo luôn, bạn thành chủ phòng liền 👑</p>
          </motion.div>

          <motion.div variants={fieldIn} custom={2} initial="hidden" animate="show">
            <label className="text-xs uppercase tracking-wide text-white/40">Avatar</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {AVATARS.map((a) => (
                <motion.button
                  type="button"
                  key={a}
                  onClick={() => setAvatar(a)}
                  whileHover={{ scale: 1.15, rotate: 6 }}
                  whileTap={{ scale: 0.9 }}
                  className={`text-xl w-10 h-10 rounded-full flex items-center justify-center border transition ${
                    avatar === a ? 'border-brand bg-brand/20 shadow-brand' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  {a}
                </motion.button>
              ))}
            </div>
          </motion.div>

          {error && (
            <motion.div
              initial={{ opacity: 0, x: -6 }}
              animate={{ opacity: 1, x: 0 }}
              className="text-blood text-sm bg-blood/10 rounded-lg px-3 py-2"
            >
              {error}
            </motion.div>
          )}

          <motion.button
            variants={fieldIn}
            custom={3}
            initial="hidden"
            animate="show"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.96 }}
            disabled={loading}
            className="btn-gradient w-full rounded-xl py-3 font-display tracking-wide text-white disabled:opacity-50"
          >
            {loading ? 'Đang vào phòng...' : '🚪 Vào Phòng'}
          </motion.button>
        </form>
      </motion.div>
    </div>
  );
}
