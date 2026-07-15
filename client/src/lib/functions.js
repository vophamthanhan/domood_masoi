import { supabase } from './supabaseClient.js';

async function call(fnName, payload) {
  const { data, error } = await supabase.functions.invoke(fnName, { body: payload });
  if (error) {
    // supabase-js gói lỗi HTTP vào error; cố lấy message chi tiết từ response body nếu có
    let message = error.message;
    try {
      const ctx = error.context;
      if (ctx) {
        const body = await ctx.json();
        if (body?.error) message = body.error;
      }
    } catch (_) {}
    throw new Error(message);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const api = {
  joinRoom: (roomCode, name, avatar) => call('join-room', { roomCode, name, avatar }),
  startGame: (roomCode, extraRoles, hostPlays = true, autoMode) => call('start-game', { roomCode, extraRoles, hostPlays, autoMode }),
  getMyRole: (roomCode) => call('get-my-role', { roomCode }),
  getAllRoles: (roomCode) => call('get-all-roles', { roomCode }),
  submitNightAction: (roomCode, actionType, targetPlayerId, targetPlayerId2) =>
    call('submit-night-action', { roomCode, actionType, targetPlayerId, targetPlayerId2 }),
  advancePhase: (roomCode, opts = {}) =>
    call('advance-phase', {
      roomCode,
      forceSkipHunter: opts.forceSkipHunter,
      discussionSeconds: opts.discussionSeconds,
      extendSeconds: opts.extendSeconds,
      auto: opts.auto,
    }),
  castVote: (roomCode, targetPlayerId) => call('cast-vote', { roomCode, targetPlayerId }),
  sendChat: (roomCode, content) => call('send-chat', { roomCode, content }),
  hunterShoot: (roomCode, targetPlayerId) => call('hunter-shoot', { roomCode, targetPlayerId }),
};
