import { adminClient, getCallerUserId, json, corsHeaders } from '../_shared/utils.js';
import { getAutoSettings, resolveVote } from '../_shared/advanceLogic.js';

// Chế độ tự động: ngay khi mọi người còn quyền bỏ phiếu đã bỏ phiếu xong, chốt kết quả liền,
// không cần chờ hết giờ.
async function maybeAutoAdvance(db, code, room) {
  if (!getAutoSettings(room)) return;
  const { data: players } = await db.from('players').select('*').eq('room_code', code);
  const eligible = (players || []).filter((p) => p.is_alive && p.can_vote);
  if (!eligible.length) return;
  const { data: votes } = await db.from('votes').select('voter_player_id').eq('room_code', code).eq('day_number', room.day_number);
  const votedIds = new Set((votes || []).map((v) => v.voter_player_id));
  if (eligible.every((p) => votedIds.has(p.id))) {
    await resolveVote(db, code, room, players);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userId = await getCallerUserId(req);
    if (!userId) return json({ error: 'Chưa đăng nhập' }, 401);
    const { roomCode, targetPlayerId } = await req.json();
    const code = (roomCode || '').trim().toUpperCase();
    const db = adminClient();

    const { data: room } = await db.from('rooms').select('*').eq('code', code).maybeSingle();
    if (!room) return json({ error: 'Không tìm thấy phòng' }, 404);
    if (room.phase !== 'day_vote') return json({ error: 'Không phải lúc bỏ phiếu' }, 400);

    const { data: me } = await db.from('players').select('*').eq('room_code', code).eq('user_id', userId).maybeSingle();
    if (!me || !me.is_alive) return json({ error: 'Bạn không thể bỏ phiếu' }, 403);
    if (!me.can_vote) return json({ error: 'Bạn đã mất quyền bỏ phiếu' }, 403);

    const runoffCandidates = room.phase_data?.runoff_candidates;
    if (targetPlayerId && Array.isArray(runoffCandidates) && runoffCandidates.length > 0 && !runoffCandidates.includes(targetPlayerId)) {
      return json({ error: 'Vòng bầu lại chỉ được chọn giữa những người bị hòa phiếu' }, 400);
    }

    await db.from('votes').upsert(
      {
        room_code: code,
        day_number: room.day_number,
        voter_player_id: me.id,
        target_player_id: targetPlayerId || null,
      },
      { onConflict: 'room_code,day_number,voter_player_id' },
    );

    await maybeAutoAdvance(db, code, room);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
