import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/functions.js';
import { ROLES_INFO, EXTRA_ROLE_KEYS, BASIC_ROLE_KEYS } from '../data/rolesInfo.js';
import { calcWolfQuota } from '../gameHelpers.js';

export default function WaitingRoom({ room, players, myPlayerId, userId, onLeave }) {
  const isHost = room.host_user_id === userId;
  const [extraRoles, setExtraRoles] = useState([]);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const wolfQuota = calcWolfQuota(players.length);

  function toggleRole(key) {
    setExtraRoles((prev) => (prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]));
  }

  async function handleStart() {
    setError('');
    setStarting(true);
    try {
      await api.startGame(room.code, extraRoles);
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <div className="flex items-center justify-between mb-6 gap-2">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest">Phòng chờ</p>
          <h1 className="font-display text-2xl sm:text-3xl text-moon tracking-widest">{room.code}</h1>
        </div>
        <button onClick={onLeave} className="text-sm text-white/50 hover:text-white/80 border border-white/10 rounded-lg px-3 py-1.5 shrink-0">
          Rời phòng
        </button>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        <div className="bg-night-800/70 border border-white/10 rounded-2xl p-4 sm:p-5">
          <h2 className="font-display text-lg mb-3">👥 Người chơi ({players.length})</h2>
          <div className="space-y-2 max-h-80 overflow-auto pr-1">
            <AnimatePresence>
              {players.map((p) => (
                <motion.div
                  key={p.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-3 bg-night-900/60 rounded-lg px-3 py-2"
                >
                  <span className="text-xl">{p.avatar}</span>
                  <span className="flex-1">{p.name}</span>
                  {p.is_host && <span className="text-xs bg-moon/20 text-moon px-2 py-0.5 rounded-full">Chủ phòng</span>}
                  {p.id === myPlayerId && <span className="text-xs text-blood">(bạn)</span>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <p className="text-xs text-white/40 mt-3">
            Cần tối thiểu 5 người. Với {players.length} người, dự kiến <b className="text-blood">{wolfQuota} Sói</b> (chưa
            tính vai mở rộng đã bật).
          </p>
        </div>

        <div className="bg-night-800/70 border border-white/10 rounded-2xl p-4 sm:p-5">
          <h2 className="font-display text-lg mb-1">🃏 Bộ bài</h2>
          <p className="text-xs text-white/40 mb-3">Vai cơ bản luôn có sẵn. Chủ phòng bật thêm vai mở rộng bên dưới.</p>

          <div className="mb-4">
            <p className="text-xs uppercase tracking-wide text-white/40 mb-2">Cơ bản</p>
            <div className="flex flex-wrap gap-2">
              {BASIC_ROLE_KEYS.map((k) => (
                <span key={k} className="text-xs bg-night-900 border border-white/10 rounded-full px-3 py-1 flex items-center gap-1">
                  {ROLES_INFO[k].icon} {ROLES_INFO[k].name}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs uppercase tracking-wide text-white/40 mb-2">Mở rộng {!isHost && '(chỉ chủ phòng chỉnh được)'}</p>
            <div className="flex flex-wrap gap-2">
              {EXTRA_ROLE_KEYS.map((k) => (
                <button
                  key={k}
                  disabled={!isHost}
                  onClick={() => toggleRole(k)}
                  className={`text-xs rounded-full px-3 py-1.5 flex items-center gap-1 border transition ${
                    extraRoles.includes(k)
                      ? 'bg-blood/20 border-blood text-white'
                      : 'bg-night-900 border-white/10 text-white/60 hover:border-white/30'
                  } disabled:opacity-40`}
                  title={ROLES_INFO[k].desc}
                >
                  {ROLES_INFO[k].icon} {ROLES_INFO[k].name}
                </button>
              ))}
            </div>
          </div>

          {isHost ? (
            <>
              {error && <div className="text-blood text-sm mt-4">{error}</div>}
              <button
                onClick={handleStart}
                disabled={starting || players.length < 5}
                className="w-full mt-5 bg-blood hover:bg-blood/80 transition rounded-lg py-3 font-display tracking-wide shadow-wolf disabled:opacity-40"
              >
                {starting ? 'Đang chia bài...' : players.length < 5 ? `Cần thêm ${5 - players.length} người` : '🌙 Bắt Đầu Ván Đấu'}
              </button>
            </>
          ) : (
            <p className="text-center text-white/40 text-sm mt-5">Đang chờ chủ phòng bắt đầu ván đấu...</p>
          )}
        </div>
      </div>
    </div>
  );
}
