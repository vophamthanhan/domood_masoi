import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { api } from '../lib/functions.js';
import { sfx, isMuted, setMuted } from '../lib/sound.js';
import NightOverlay from '../components/NightOverlay.jsx';
import RoleActionPanel from '../components/RoleActionPanel.jsx';
import VotingPanel from '../components/VotingPanel.jsx';
import PlayerGrid from '../components/PlayerGrid.jsx';
import ChatBox from '../components/ChatBox.jsx';
import GameLog from '../components/GameLog.jsx';
import HostControlPanel from '../components/HostControlPanel.jsx';
import WinnerScreen from '../components/WinnerScreen.jsx';
import DiscussionTimer from '../components/DiscussionTimer.jsx';
import EffectOverlay from '../components/EffectOverlay.jsx';
import RoleCard from '../components/RoleCard.jsx';
import { ROLES_INFO } from '../data/rolesInfo.js';

export default function GameRoom({ room, players, logs, chat, votes, myPlayerId, userId, onLeave }) {
  const isHost = room.host_user_id === userId;
  const myPlayer = useMemo(() => players.find((p) => p.id === myPlayerId), [players, myPlayerId]);
  const [myRole, setMyRole] = useState(null);
  const [allRoles, setAllRoles] = useState([]);
  const [showCard, setShowCard] = useState(false);
  const [hunterTarget, setHunterTarget] = useState('');
  const [soundOn, setSoundOn] = useState(!isMuted());
  const prevPhase = useRef(room.phase);

  const refreshMyRole = useCallback(async () => {
    try {
      const data = await api.getMyRole(room.code);
      setMyRole(data);
    } catch (_) {}
  }, [room.code]);

  const refreshAllRoles = useCallback(async () => {
    if (!isHost && room.phase !== 'ended') return;
    try {
      const data = await api.getAllRoles(room.code);
      setAllRoles(data.players);
    } catch (_) {}
  }, [room.code, isHost, room.phase]);

  useEffect(() => {
    refreshMyRole();
  }, [room.phase, room.night_number, room.day_number, room.phase_data?.current_role, refreshMyRole]);

  useEffect(() => {
    refreshAllRoles();
  }, [room.phase, room.night_number, room.day_number, refreshAllRoles]);

  // Âm thanh theo chuyển pha
  useEffect(() => {
    if (prevPhase.current === room.phase) return;
    if (room.phase === 'night') sfx.night();
    if (room.phase === 'day_reveal') sfx.day();
    if (room.phase === 'day_vote') sfx.vote();
    if (room.phase === 'ended') sfx.win();
    prevPhase.current = room.phase;
  }, [room.phase]);

  function toggleSound() {
    const next = !soundOn;
    setSoundOn(next);
    setMuted(!next);
  }

  const handleAdvance = useCallback(async (opts) => {
    await api.advancePhase(room.code, opts);
  }, [room.code]);
  const handleForceSkipHunter = useCallback(async () => {
    await api.advancePhase(room.code, { forceSkipHunter: true });
  }, [room.code]);
  const handleExtendTimer = useCallback(async (extendSeconds) => {
    await api.advancePhase(room.code, { extendSeconds });
  }, [room.code]);
  const handleHunterShoot = useCallback(async () => {
    if (!hunterTarget) return;
    await api.hunterShoot(room.code, hunterTarget);
    setHunterTarget('');
  }, [room.code, hunterTarget]);

  const pendingHunterIsMe = room.phase_data?.pending_hunter === myPlayerId;
  const runoffKey = JSON.stringify(room.phase_data?.runoff_candidates ?? null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const runoffCandidates = useMemo(() => room.phase_data?.runoff_candidates, [runoffKey]);

  if (room.phase === 'ended') {
    return <WinnerScreen winner={room.winner} players={allRoles} onLeave={onLeave} />;
  }

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-4 py-6 sm:py-8">
      <EffectOverlay logs={logs} />
      <AnimatePresence>{showCard && <RoleCard role={myRole} onClose={() => setShowCard(false)} />}</AnimatePresence>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-2">
        <div>
          <p className="text-white/40 text-xs uppercase tracking-widest">Phòng {room.code}</p>
          <h1 className="font-display text-xl sm:text-2xl text-moon">
            {room.phase === 'night' ? `🌙 Đêm ${room.night_number}` : `☀️ Ngày ${room.day_number}`}
          </h1>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={toggleSound} className="text-xs sm:text-sm border border-white/10 rounded-lg px-3 py-1.5 hover:border-white/30" aria-label="Bật/tắt âm thanh">
            {soundOn ? '🔊' : '🔇'}
          </button>
          {myRole?.role && (
            <button onClick={() => setShowCard(true)} className="text-xs sm:text-sm border border-white/10 rounded-lg px-3 py-1.5 hover:border-moon/50">
              🃏 Xem vai của tôi
            </button>
          )}
          <button onClick={onLeave} className="text-xs sm:text-sm border border-white/10 rounded-lg px-3 py-1.5 hover:border-white/30">
            Rời phòng
          </button>
        </div>
      </div>

      {pendingHunterIsMe && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6 bg-orange-500/10 border border-orange-500/40 rounded-2xl p-5">
          <h3 className="font-display text-lg mb-2">🏹 Bạn là Thợ Săn và vừa gục ngã! Hãy bắn trả một người:</h3>
          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
            {players.filter((p) => p.is_alive && p.id !== myPlayerId).map((p) => (
              <button
                key={p.id}
                onClick={() => setHunterTarget(p.id)}
                className={`rounded-lg px-3 py-2 text-sm border ${hunterTarget === p.id ? 'border-orange-400 bg-orange-400/10' : 'border-white/10'}`}
              >
                {p.avatar} {p.name}
              </button>
            ))}
          </div>
          <button disabled={!hunterTarget} onClick={handleHunterShoot} className="bg-orange-500 rounded-lg px-5 py-2 font-display disabled:opacity-40">
            💥 Bắn!
          </button>
        </motion.div>
      )}

      {myRole?.role === 'woodcutter' && myRole.woodcutter_info && room.phase !== 'night' && (
        <div className="mb-6 bg-amber-700/10 border border-amber-700/30 rounded-xl px-4 py-3 text-sm text-amber-200">
          🪓 <b>Tiều Phu:</b>{' '}
          {myRole.woodcutter_info.was_blocked
            ? 'Đêm qua Sói đã ra tay nhưng bị chặn lại — chắc chắn có Bảo Vệ hoặc Phù Thủy đang hoạt động!'
            : 'Đêm qua không phát hiện dấu hiệu bị chặn nào.'}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {room.phase === 'night' && (
            <>
              <NightOverlay label={room.phase_data?.current_role ? `Vai đang hành động: ${ROLES_INFO[room.phase_data.current_role]?.name}` : 'Chuẩn bị...'} />
              <RoleActionPanel
                roomCode={room.code}
                myRole={myRole}
                currentRole={room.phase_data?.current_role}
                players={players}
                onActed={refreshMyRole}
              />
            </>
          )}

          {room.phase === 'day_reveal' && (
            <div className="bg-night-800/80 border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-2">☀️</div>
              <h2 className="font-display text-xl mb-2">Bình minh lên, cả làng thức dậy...</h2>
              <p className="text-white/60 text-sm">{logs[logs.length - 1]?.message}</p>
            </div>
          )}

          {(room.phase === 'day_discussion' || room.phase === 'day_reveal') && room.phase !== 'day_vote' && (
            <>
              {room.phase === 'day_discussion' && room.phase_data?.discussion_ends_at && (
                <DiscussionTimer endsAt={room.phase_data.discussion_ends_at} isHost={isHost} onExtend={handleExtendTimer} />
              )}
              <ChatBox roomCode={room.code} chat={chat} viewerAlive={myPlayer?.is_alive !== false} isMute={myRole?.role === 'mute'} />
            </>
          )}

          {room.phase === 'day_vote' && (
            <>
              {room.phase_data?.runoff_candidates?.length > 0 && (
                <div className="bg-orange-500/10 border border-orange-500/40 rounded-xl px-4 py-3 text-sm text-orange-200">
                  ⚖️ Vòng bầu lại — chỉ được chọn giữa những người bị hòa phiếu.
                </div>
              )}
              <ChatBox roomCode={room.code} chat={chat} viewerAlive={myPlayer?.is_alive !== false} isMute={myRole?.role === 'mute'} />
              <VotingPanel roomCode={room.code} players={players} votes={votes} myPlayer={myPlayer} runoffCandidates={runoffCandidates} />
            </>
          )}

          {room.phase === 'day_result' && (
            <div className="bg-night-800/80 border border-white/10 rounded-2xl p-6 text-center">
              <div className="text-4xl mb-2">⚖️</div>
              <h2 className="font-display text-xl mb-2">Kết quả bỏ phiếu</h2>
              <p className="text-white/60 text-sm">{logs[logs.length - 1]?.message}</p>
            </div>
          )}

          <div>
            <h3 className="font-display mb-2 text-sm text-white/50">Người chơi</h3>
            <PlayerGrid players={players} myPlayerId={myPlayerId} />
          </div>
        </div>

        <div className="space-y-6">
          {isHost && (
            <HostControlPanel room={room} allRoles={allRoles} onAdvance={handleAdvance} onForceSkipHunter={handleForceSkipHunter} />
          )}
          <GameLog logs={logs} />
        </div>
      </div>
    </div>
  );
}
