import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { api } from '../lib/functions.js';

export default function VotingPanel({ roomCode, players, votes, myPlayer, runoffCandidates }) {
  const [selected, setSelected] = useState(null);
  const [busy, setBusy] = useState(false);
  const hasRunoff = Array.isArray(runoffCandidates) && runoffCandidates.length > 0;
  const alive = players.filter((p) => p.is_alive && (!hasRunoff || runoffCandidates.includes(p.id)));
  const myVote = votes.find((v) => v.voter_player_id === myPlayer?.id);

  const tally = {};
  votes.forEach((v) => {
    if (v.target_player_id) tally[v.target_player_id] = (tally[v.target_player_id] || 0) + 1;
  });
  const maxVotes = Math.max(1, ...Object.values(tally));

  async function vote(targetId) {
    setSelected(targetId);
    setBusy(true);
    try {
      await api.castVote(roomCode, targetId);
    } finally {
      setBusy(false);
    }
  }

  const canVote = myPlayer?.is_alive && myPlayer?.can_vote;

  return (
    <div className="bg-night-800/80 border border-white/10 rounded-2xl p-6">
      <h3 className="font-display text-xl mb-1">🗳️ Bỏ phiếu treo cổ</h3>
      <p className="text-xs text-white/40 mb-4">
        {canVote ? 'Chọn người bạn nghi ngờ là Sói.' : 'Bạn không thể bỏ phiếu lúc này.'}
      </p>
      <div className="space-y-3">
        {alive.map((p) => {
          const count = tally[p.id] || 0;
          const pct = (count / maxVotes) * 100;
          const isMine = myVote?.target_player_id === p.id;
          return (
            <button
              key={p.id}
              disabled={!canVote || busy}
              onClick={() => vote(p.id)}
              className={`w-full text-left relative overflow-hidden rounded-lg border px-4 py-3 transition ${
                isMine ? 'border-blood' : 'border-white/10 hover:border-white/30'
              } disabled:cursor-not-allowed`}
            >
              <motion.div
                className="absolute inset-y-0 left-0 bg-blood/25"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.5 }}
              />
              <div className="relative flex items-center justify-between">
                <span>
                  {p.avatar} {p.name}
                </span>
                <span className="text-sm text-white/60">{count} phiếu</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
