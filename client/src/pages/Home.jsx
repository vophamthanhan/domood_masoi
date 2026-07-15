import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/functions.js';

const AVATARS = ['🧑', '👩', '🧔', '👨‍🌾', '👩‍🦰', '🧑‍🎨', '👨‍🚀', '🧙', '🧛', '🕵️'];

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
      setError('Nhập tên và mã phòng nhé.');
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
    <div className="min-h-screen flex items-center justify-center px-4 py-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md bg-night-800/80 backdrop-blur border border-white/10 rounded-2xl p-6 sm:p-8 shadow-glow"
      >
        <div className="text-center mb-6">
          <div className="text-4xl sm:text-5xl mb-2 animate-float">🐺🌕</div>
          <h1 className="font-display text-2xl sm:text-3xl text-moon">Ma Sói Online</h1>
          <p className="text-white/50 text-sm mt-1">Nhập mã phòng để vào chơi cùng đồng nghiệp</p>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div>
            <label className="text-xs uppercase tracking-wide text-white/40">Tên hiển thị</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={20}
              autoComplete="name"
              placeholder="Vd: Minh Trần"
              className="mt-1 w-full text-base bg-night-900 border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-moon/60"
            />
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-white/40">Mã phòng</label>
            <input
              value={roomCode}
              onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
              maxLength={8}
              autoComplete="off"
              autoCapitalize="characters"
              placeholder="Vd: LANG01"
              className="mt-1 w-full text-base bg-night-900 border border-white/10 rounded-lg px-4 py-2.5 outline-none focus:border-moon/60 tracking-widest font-display"
            />
            <p className="text-[11px] text-white/30 mt-1">Nếu phòng chưa tồn tại, phòng sẽ được tạo tự động và bạn sẽ là chủ phòng.</p>
          </div>

          <div>
            <label className="text-xs uppercase tracking-wide text-white/40">Avatar</label>
            <div className="flex flex-wrap gap-2 mt-1">
              {AVATARS.map((a) => (
                <button
                  type="button"
                  key={a}
                  onClick={() => setAvatar(a)}
                  className={`text-xl w-10 h-10 rounded-full flex items-center justify-center border transition ${
                    avatar === a ? 'border-moon bg-moon/10 scale-110' : 'border-white/10 hover:border-white/30'
                  }`}
                >
                  {a}
                </button>
              ))}
            </div>
          </div>

          {error && <div className="text-blood text-sm bg-blood/10 rounded-lg px-3 py-2">{error}</div>}

          <button
            disabled={loading}
            className="w-full bg-blood hover:bg-blood/80 transition rounded-lg py-3 font-display tracking-wide shadow-wolf disabled:opacity-50"
          >
            {loading ? 'Đang vào phòng...' : 'Vào Phòng'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
