import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/functions.js';
import { sfx } from '../lib/sound.js';
import { ROLES_INFO } from '../data/rolesInfo.js';

const WOLF_ROLES = ['werewolf', 'alphawolf', 'disguisedwolf'];

function RoleActionPanel({ roomCode, myRole, currentRole, players, onActed }) {
  const [target, setTarget] = useState('');
  const [target2, setTarget2] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [seerResult, setSeerResult] = useState(null);
  const [done, setDone] = useState({});

  const myRoleGroup = WOLF_ROLES.includes(myRole?.role) ? 'werewolf' : myRole?.role;
  const isMyTurn = myRole?.is_alive && myRoleGroup === currentRole;

  useEffect(() => {
    if (isMyTurn) {
      if (navigator.vibrate) navigator.vibrate(200);
      sfx.turn();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isMyTurn]);

  const alivePlayers = players.filter((p) => p.is_alive && p.id !== myRole?.player_id);

  async function act(actionType, tPlayer = target, tPlayer2 = target2) {
    setBusy(true);
    setError('');
    try {
      const res = await api.submitNightAction(roomCode, actionType, tPlayer || null, tPlayer2 || null);
      if (res.seer_result) setSeerResult(res.seer_result);
      setDone((d) => ({ ...d, [actionType]: true }));
      onActed?.();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  if (!myRole?.role) return null;

  if (!isMyTurn) {
    return (
      <div className="text-center py-10 text-white/40 font-display">
        😴 Bạn đang say ngủ... Hãy chờ đến lượt vai <b>{ROLES_INFO[myRole.role]?.name}</b> của bạn.
      </div>
    );
  }

  const info = ROLES_INFO[myRole.role];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-night-800/80 border border-white/10 rounded-2xl p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">{info.icon}</span>
        <div>
          <div className="font-display text-xl">{info.name} thức dậy</div>
          <div className="text-xs text-white/40">{info.desc}</div>
        </div>
      </div>

      {error && <div className="text-blood text-sm mb-3">{error}</div>}

      {/* SÓI */}
      {myRoleGroup === 'werewolf' && (
        <div>
          {myRole.wolf_teammates?.length > 0 && (
            <p className="text-xs text-white/40 mb-2">
              🐺 Đồng bọn của bạn: {myRole.wolf_teammates.map((w) => `${w.name}${w.is_alive ? '' : ' (đã chết)'}`).join(', ')}
            </p>
          )}
          <PlayerPicker players={alivePlayers} value={target} onChange={setTarget} />
          <button
            disabled={!target || busy || done.kill}
            onClick={() => act('kill')}
            className="mt-3 w-full bg-blood rounded-lg py-2.5 font-display disabled:opacity-40"
          >
            {done.kill ? '✔ Đã chọn nạn nhân' : '🩸 Cắn'}
          </button>
        </div>
      )}

      {/* SÓI TRẮNG */}
      {myRole.role === 'whitewolf' && (
        <div>
          <p className="text-xs text-white/40 mb-2">Chọn một con Sói khác để tiêu diệt (chỉ đêm chẵn):</p>
          <PlayerPicker players={alivePlayers} value={target} onChange={setTarget} />
          <button
            disabled={!target || busy || done.kill_wolf}
            onClick={() => act('kill_wolf')}
            className="mt-3 w-full bg-blood rounded-lg py-2.5 font-display disabled:opacity-40"
          >
            {done.kill_wolf ? '✔ Đã chọn' : '❄️ Ra tay'}
          </button>
        </div>
      )}

      {/* BẢO VỆ */}
      {myRole.role === 'guard' && (
        <div>
          <PlayerPicker players={[...alivePlayers, { id: myRole.player_id, name: 'Chính mình' }]} value={target} onChange={setTarget} />
          <button
            disabled={!target || busy || done.protect}
            onClick={() => act('protect')}
            className="mt-3 w-full bg-emerald-600 rounded-lg py-2.5 font-display disabled:opacity-40"
          >
            {done.protect ? '✔ Đã bảo vệ' : '🛡️ Bảo vệ'}
          </button>
        </div>
      )}

      {/* TIÊN TRI */}
      {myRole.role === 'seer' && (
        <div>
          <PlayerPicker players={alivePlayers} value={target} onChange={setTarget} />
          <button
            disabled={!target || busy || seerResult}
            onClick={() => act('check')}
            className="mt-3 w-full bg-emerald-600 rounded-lg py-2.5 font-display disabled:opacity-40"
          >
            {seerResult ? '✔ Đã soi' : '🔮 Soi'}
          </button>
          {seerResult && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-center bg-night-900 rounded-lg py-3">
              <b>{seerResult.name}</b> thuộc về{' '}
              <span className={seerResult.team === 'wolf' ? 'text-blood' : 'text-emerald-400'}>
                {seerResult.team === 'wolf' ? 'phe Sói 🐺' : 'phe Dân Làng 🧑‍🌾'}
              </span>
            </motion.div>
          )}
        </div>
      )}

      {/* PHÙ THỦY */}
      {myRole.role === 'witch' && (
        <div className="space-y-4">
          <div className="bg-night-900 rounded-lg p-3 text-sm">
            {myRole.wolf_victim ? (
              <>
                🐺 Đêm nay Sói đã chọn cắn: <b className="text-blood">{myRole.wolf_victim.name}</b>
              </>
            ) : (
              'Đêm nay Sói chưa chọn xong nạn nhân (hoặc không cắn ai).'
            )}
          </div>
          {!myRole.used_witch_heal && myRole.wolf_victim && (
            <button
              disabled={busy || done.heal}
              onClick={() => act('heal', myRole.wolf_victim.id)}
              className="w-full bg-emerald-600 rounded-lg py-2.5 font-display disabled:opacity-40"
            >
              {done.heal ? '✔ Đã cứu' : '💚 Dùng thuốc cứu'}
            </button>
          )}
          {!myRole.used_witch_poison && (
            <div>
              <PlayerPicker players={alivePlayers} value={target2} onChange={setTarget2} />
              <button
                disabled={!target2 || busy || done.poison}
                onClick={() => act('poison', target2, null)}
                className="mt-2 w-full bg-purple-700 rounded-lg py-2.5 font-display disabled:opacity-40"
              >
                {done.poison ? '✔ Đã đầu độc' : '☠️ Dùng thuốc độc'}
              </button>
            </div>
          )}
          {(myRole.used_witch_heal || done.heal) && (myRole.used_witch_poison || done.poison) && (
            <p className="text-xs text-white/30 text-center">Bạn đã dùng hết thuốc cho ván này.</p>
          )}
        </div>
      )}

      {/* CUPID */}
      {myRole.role === 'cupid' && (
        <div>
          <p className="text-xs text-white/40 mb-2">Chọn 2 người để ghép đôi tình nhân:</p>
          <PlayerPicker players={[...alivePlayers, { id: myRole.player_id, name: 'Chính mình' }]} value={target} onChange={setTarget} label="Người 1" />
          <div className="h-2" />
          <PlayerPicker players={[...alivePlayers, { id: myRole.player_id, name: 'Chính mình' }]} value={target2} onChange={setTarget2} label="Người 2" />
          <button
            disabled={!target || !target2 || target === target2 || busy || done.link_lovers}
            onClick={() => act('link_lovers')}
            className="mt-3 w-full bg-pink-600 rounded-lg py-2.5 font-display disabled:opacity-40"
          >
            {done.link_lovers ? '✔ Đã ghép đôi' : '💘 Ghép đôi'}
          </button>
        </div>
      )}

      {/* KẺ TRỘM */}
      {myRole.role === 'thief' && (
        <div>
          <p className="text-xs text-white/40 mb-2">Chọn một người để bí mật đổi vai (cả hai không ai biết ai đã đổi với ai):</p>
          <PlayerPicker players={alivePlayers} value={target} onChange={setTarget} />
          <button
            disabled={!target || busy || done.thief_swap}
            onClick={() => act('thief_swap')}
            className="mt-3 w-full bg-sky-600 rounded-lg py-2.5 font-display disabled:opacity-40"
          >
            {done.thief_swap ? '✔ Đã đổi vai' : '🗝️ Đổi vai'}
          </button>
        </div>
      )}

      {/* CÔ BÉ NGÂY THƠ (thụ động, cosmetic) */}
      {myRole.role === 'littlegirl' && (
        <div className="text-center text-white/60 text-sm py-4">
          🎀 Bạn lén hé mắt nhìn... hãy quan sát thật kỹ những gì Sói đang làm, nhưng cẩn thận kẻo bị phát hiện!
        </div>
      )}
    </motion.div>
  );
}

export default React.memo(RoleActionPanel);

function PlayerPicker({ players, value, onChange, label }) {
  return (
    <div>
      {label && <p className="text-xs text-white/40 mb-1">{label}</p>}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {players.map((p) => (
          <button
            key={p.id}
            onClick={() => onChange(p.id)}
            className={`text-sm rounded-lg px-3 py-2 border transition truncate ${
              value === p.id ? 'bg-moon/20 border-moon text-moon' : 'bg-night-900 border-white/10 hover:border-white/30'
            }`}
          >
            {p.name}
          </button>
        ))}
      </div>
    </div>
  );
}
