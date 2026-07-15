import { adminClient, getCallerUserId, json, corsHeaders } from '../_shared/utils.js';

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

    const { data: me } = await db.from('players').select('*').eq('room_code', code).eq('user_id', userId).maybeSingle();
    if (!me || me.role !== 'hunter') return json({ error: 'Bạn không phải Thợ Săn' }, 403);
    if (room.phase_data?.pending_hunter !== me.id) return json({ error: 'Chưa tới lượt bắn súng' }, 400);

    const { data: target } = await db.from('players').select('*').eq('id', targetPlayerId).eq('room_code', code).maybeSingle();
    if (!target || !target.is_alive) return json({ error: 'Mục tiêu không hợp lệ' }, 400);

    await db.from('players').update({ is_alive: false }).eq('id', targetPlayerId);
    await db.from('game_logs').insert({
      room_code: code,
      message: `💥 Thợ Săn ${me.name} đã bắn hạ ${target.name} trước khi trút hơi thở cuối cùng!`,
      meta: { type: 'hunter_shot' },
    });
    await db.from('rooms').update({ phase_data: { ...room.phase_data, pending_hunter: null, pending_hunter_deadline_at: null } }).eq('code', code);

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
