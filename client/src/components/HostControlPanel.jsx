import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { ROLES_INFO } from '../data/rolesInfo.js';

const PHASE_LABEL = {
  night: 'Ban đêm',
  day_reveal: 'Công bố kết quả đêm',
  day_discussion: 'Thảo luận',
  day_vote: 'Bỏ phiếu',
  day_result: 'Công bố kết quả bỏ phiếu',
  ended: 'Kết thúc',
};

const DURATION_PRESETS = [60, 120, 180, 300];

function HostControlPanel({ room, allRoles, onAdvance, onForceSkipHunter }) {
  const [busy, setBusy] = useState(false);
  const [discussionSeconds, setDiscussionSeconds] = useState(120);
  const pendingHunter = room.phase_data?.pending_hunter;
  // Host cũng chơi -> không được xem trước vai người khác (lợi thế không công bằng), việc của họ
  // chỉ là bấm nút chuyển pha. Nếu bật chế độ tự động, hệ thống tự chuyển, host không cần bấm gì cả.
  const hostPlays = room.settings?.hostPlays !== false;
  const autoMode = room.settings?.autoMode?.enabled;

  async function advance() {
    setBusy(true);
    try {
      const opts = room.phase === 'day_reveal' ? { discussionSeconds } : undefined;
      await onAdvance(opts);
    } finally {
      setBusy(false);
    }
  }

  let nextLabel = 'Tiếp tục';
  if (room.phase === 'night') nextLabel = `Tiếp theo (${room.phase_data?.current_role ? ROLES_INFO[room.phase_data.current_role]?.name : 'bắt đầu'})`;
  if (room.phase === 'day_reveal') nextLabel = 'Mở thảo luận';
  if (room.phase === 'day_discussion') nextLabel = 'Mở bỏ phiếu';
  if (room.phase === 'day_vote') nextLabel = 'Chốt kết quả bỏ phiếu';
  if (room.phase === 'day_result') nextLabel = 'Bắt đầu đêm tiếp theo';

  return (
    <div className="glass-card border-blood/30 rounded-2xl p-4">
      <h3 className="font-display mb-2 text-blood">🎙️ Bảng điều tiết (Chủ phòng)</h3>
      <p className="text-xs text-white/50 mb-3">
        Pha hiện tại: <b>{PHASE_LABEL[room.phase]}</b> {room.phase === 'night' && `- Đêm ${room.night_number}`}
        {room.phase.startsWith('day') && room.phase !== 'ended' && ` - Ngày ${room.day_number}`}
      </p>

      {autoMode ? (
        <div className="bg-neon-purple/10 border border-neon-purple/30 rounded-xl p-3 text-sm text-center animate-pulse-glow">
          🤖 Chế độ tự động đang bật — hệ thống tự chuyển pha, bạn không cần bấm gì cả.
        </div>
      ) : (
        <>
          {room.phase === 'day_reveal' && (
            <div className="mb-3">
              <p className="text-xs text-white/40 mb-1.5">Thời gian thảo luận</p>
              <div className="flex gap-1.5 flex-wrap">
                {DURATION_PRESETS.map((s) => (
                  <motion.button
                    key={s}
                    whileHover={{ scale: 1.06 }}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => setDiscussionSeconds(s)}
                    className={`text-xs rounded-full px-3 py-1.5 border transition ${
                      discussionSeconds === s ? 'border-moon bg-moon/10 text-moon' : 'border-white/10 text-white/60 hover:border-white/30'
                    }`}
                  >
                    {Math.floor(s / 60)} phút{s % 60 ? ` ${s % 60}s` : ''}
                  </motion.button>
                ))}
              </div>
            </div>
          )}

          {pendingHunter ? (
            <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-3 text-sm mb-3">
              🏹 Đang chờ Thợ Săn bắn súng...{' '}
              <button onClick={onForceSkipHunter} className="underline text-orange-300 ml-1">
                Bỏ qua (nếu người chơi không phản hồi)
              </button>
            </div>
          ) : (
            <motion.button
              whileHover={!busy ? { scale: 1.02 } : {}}
              whileTap={!busy ? { scale: 0.97 } : {}}
              disabled={busy}
              onClick={advance}
              className="w-full btn-gradient text-white rounded-xl py-2.5 font-display disabled:opacity-50"
            >
              {busy ? 'Đang xử lý...' : `➡️ ${nextLabel}`}
            </motion.button>
          )}
        </>
      )}

      {!hostPlays && (
        <details className="mt-4">
          <summary className="text-xs text-white/40 cursor-pointer">Xem toàn bộ vai trò (chỉ quản trò thấy)</summary>
          <div className="mt-2 grid grid-cols-2 gap-1.5 text-xs">
            {allRoles.map((p) => (
              <div key={p.id} className={`rounded px-2 py-1 ${p.is_alive ? 'bg-night-900' : 'bg-night-900/40 line-through opacity-50'}`}>
                {p.name}: <b>{p.role_name || '—'}</b>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}

export default React.memo(HostControlPanel);
