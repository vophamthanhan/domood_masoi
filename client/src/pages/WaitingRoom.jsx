import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/functions.js';
import { ROLES_INFO, EXTRA_ROLE_KEYS, BASIC_ROLE_KEYS } from '../data/rolesInfo.js';
import { calcWolfQuota } from '../gameHelpers.js';

const cardIn = { hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } };

const AUTO_FIELDS = [
  { key: 'nightStepSeconds', label: '🌙 Mỗi vai đêm suy nghĩ', presets: [15, 25, 40] },
  { key: 'voteSeconds', label: '🗳️ Thời gian bỏ phiếu', presets: [30, 45, 60] },
  { key: 'hunterSeconds', label: '🏹 Chờ Thợ Săn bắn', presets: [20, 30, 45] },
  { key: 'resultSeconds', label: '⚖️ Dừng xem kết quả', presets: [4, 6, 10] },
];

export default function WaitingRoom({ room, players, myPlayerId, userId, onLeave }) {
  const isHost = room.host_user_id === userId;
  const [extraRoles, setExtraRoles] = useState([]);
  const [hostPlays, setHostPlays] = useState(true);
  const [autoMode, setAutoMode] = useState({
    enabled: false,
    nightStepSeconds: 25,
    voteSeconds: 45,
    hunterSeconds: 30,
    resultSeconds: 6,
    revealSeconds: 4,
    discussionSeconds: 120,
  });
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');

  const playingCount = players.length - (hostPlays ? 0 : 1);
  const wolfQuota = calcWolfQuota(playingCount);
  const ready = playingCount >= 5;

  function toggleRole(key) {
    setExtraRoles((prev) => (prev.includes(key) ? prev.filter((r) => r !== key) : [...prev, key]));
  }

  async function handleStart() {
    setError('');
    setStarting(true);
    try {
      await api.startGame(room.code, extraRoles, hostPlays, autoMode);
    } catch (err) {
      setError(err.message);
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="min-h-screen max-w-3xl mx-auto px-3 sm:px-4 py-6 sm:py-10">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-6 gap-2"
      >
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest">Phòng chờ ✨</p>
          <h1 className="font-display text-2xl sm:text-3xl gradient-text tracking-widest">{room.code}</h1>
        </div>
        <button onClick={onLeave} className="text-sm text-white/50 hover:text-white/80 border border-white/10 rounded-full px-4 py-1.5 shrink-0 transition hover:border-white/30">
          Rời phòng
        </button>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-4 sm:gap-6">
        <motion.div variants={cardIn} initial="hidden" animate="show" transition={{ delay: 0.05 }} className="glass-card border-white/10 rounded-2xl p-4 sm:p-5">
          <h2 className="font-display text-lg mb-3">👥 Người chơi ({players.length})</h2>
          <div className="space-y-2 max-h-80 overflow-auto pr-1">
            <AnimatePresence>
              {players.map((p, i) => (
                <motion.div
                  key={p.id}
                  layout
                  initial={{ opacity: 0, x: -12, scale: 0.95 }}
                  animate={{ opacity: 1, x: 0, scale: 1, transition: { delay: i * 0.03 } }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  className="flex items-center gap-3 bg-night-900/60 rounded-xl px-3 py-2 border border-transparent hover:border-white/10 transition"
                >
                  <span className="text-xl">{p.avatar}</span>
                  <span className="flex-1 truncate">{p.name}</span>
                  {p.is_host && <span className="text-xs bg-gradient-to-r from-neon-pink to-neon-purple text-white px-2 py-0.5 rounded-full">👑 Chủ phòng</span>}
                  {p.id === myPlayerId && <span className="text-xs text-neon-cyan">(bạn)</span>}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
          <p className="text-xs text-white/40 mt-3">
            Cần tối thiểu 5 người chơi. Với {playingCount} người chơi, dự kiến <b className="text-blood">{wolfQuota} Sói</b> (chưa
            tính vai mở rộng đã bật).
          </p>

          {isHost && (
            <button
              type="button"
              onClick={() => setHostPlays((v) => !v)}
              className="mt-3 w-full flex items-center justify-between gap-2 bg-night-900/60 border border-white/10 rounded-xl px-3 py-2.5 text-left hover:border-neon-purple/40 transition"
            >
              <span className="text-xs text-white/70">
                {hostPlays ? '🎮 Bạn vừa điều khiển ván vừa chơi bình thường' : '🎙️ Bạn chỉ làm quản trò, không nhận vai'}
              </span>
              <span className={`shrink-0 w-10 h-6 rounded-full p-0.5 transition ${hostPlays ? 'bg-white/10' : 'bg-gradient-to-r from-neon-pink to-neon-purple'}`}>
                <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`block w-5 h-5 rounded-full bg-white ${hostPlays ? '' : 'ml-4'}`} />
              </span>
            </button>
          )}

          {isHost && hostPlays && (
            <div className="mt-3 bg-night-900/60 border border-white/10 rounded-xl p-3">
              <button
                type="button"
                onClick={() => setAutoMode((a) => ({ ...a, enabled: !a.enabled }))}
                className="w-full flex items-center justify-between gap-2 text-left"
              >
                <span className="text-xs text-white/70">
                  🤖 Chế độ tự động {autoMode.enabled ? '— hệ thống tự chuyển pha, bạn khỏi cần bấm' : '(tắt: bạn tự bấm chuyển pha như thường)'}
                </span>
                <span className={`shrink-0 w-10 h-6 rounded-full p-0.5 transition ${autoMode.enabled ? 'bg-gradient-to-r from-neon-pink to-neon-purple' : 'bg-white/10'}`}>
                  <motion.span layout transition={{ type: 'spring', stiffness: 500, damping: 30 }} className={`block w-5 h-5 rounded-full bg-white ${autoMode.enabled ? 'ml-4' : ''}`} />
                </span>
              </button>

              <AnimatePresence>
                {autoMode.enabled && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="mt-3 space-y-2.5">
                      {AUTO_FIELDS.map((f) => (
                        <div key={f.key}>
                          <p className="text-[11px] text-white/40 mb-1">{f.label}</p>
                          <div className="flex gap-1.5">
                            {f.presets.map((s) => (
                              <motion.button
                                key={s}
                                type="button"
                                whileHover={{ scale: 1.06 }}
                                whileTap={{ scale: 0.94 }}
                                onClick={() => setAutoMode((a) => ({ ...a, [f.key]: s }))}
                                className={`text-[11px] rounded-full px-2.5 py-1 border transition ${
                                  autoMode[f.key] === s ? 'border-neon-purple bg-neon-purple/20 text-white' : 'border-white/10 text-white/50 hover:border-white/30'
                                }`}
                              >
                                {s}s
                              </motion.button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}
        </motion.div>

        <motion.div variants={cardIn} initial="hidden" animate="show" transition={{ delay: 0.15 }} className="glass-card border-white/10 rounded-2xl p-4 sm:p-5">
          <h2 className="font-display text-lg mb-1">🃏 Bộ bài</h2>
          <p className="text-xs text-white/40 mb-3">Vai cơ bản luôn có sẵn. Chủ phòng bật thêm vai mở rộng bên dưới cho gay cấn hơn.</p>

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
                <motion.button
                  key={k}
                  disabled={!isHost}
                  onClick={() => toggleRole(k)}
                  whileHover={isHost ? { scale: 1.06 } : {}}
                  whileTap={isHost ? { scale: 0.94 } : {}}
                  className={`text-xs rounded-full px-3 py-1.5 flex items-center gap-1 border transition ${
                    extraRoles.includes(k)
                      ? 'bg-gradient-to-r from-blood to-neon-pink border-transparent text-white shadow-wolf'
                      : 'bg-night-900 border-white/10 text-white/60 hover:border-white/30'
                  } disabled:opacity-40`}
                  title={ROLES_INFO[k].desc}
                >
                  {ROLES_INFO[k].icon} {ROLES_INFO[k].name}
                </motion.button>
              ))}
            </div>
          </div>

          {isHost ? (
            <>
              {error && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-blood text-sm mt-4">
                  {error}
                </motion.div>
              )}
              <motion.button
                onClick={handleStart}
                disabled={starting || !ready}
                whileHover={ready ? { scale: 1.02 } : {}}
                whileTap={ready ? { scale: 0.96 } : {}}
                className={`w-full mt-5 rounded-xl py-3 font-display tracking-wide disabled:opacity-40 transition ${
                  ready ? 'btn-gradient text-white' : 'bg-night-900 border border-white/10 text-white/60'
                }`}
              >
                {starting ? 'Đang chia bài...' : !ready ? `Cần thêm ${5 - playingCount} người chơi` : '🌙 Bắt Đầu Ván Đấu'}
              </motion.button>
            </>
          ) : (
            <p className="text-center text-white/40 text-sm mt-5 animate-pulse">Đang chờ chủ phòng bắt đầu ván đấu... 👀</p>
          )}
        </motion.div>
      </div>
    </div>
  );
}
