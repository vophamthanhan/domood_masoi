import { adminClient, getCallerUserId, json, corsHeaders } from '../_shared/utils.js';
import { ROLES, buildRolePool } from '../_shared/roles.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userId = await getCallerUserId(req);
    if (!userId) return json({ error: 'Chưa đăng nhập' }, 401);

    const { roomCode, extraRoles = [], hostPlays = true } = await req.json();
    const code = (roomCode || '').trim().toUpperCase();
    const db = adminClient();

    const { data: room } = await db.from('rooms').select('*').eq('code', code).maybeSingle();
    if (!room) return json({ error: 'Không tìm thấy phòng' }, 404);
    if (room.host_user_id !== userId) return json({ error: 'Chỉ chủ phòng mới được bắt đầu ván' }, 403);
    if (room.phase !== 'lobby') return json({ error: 'Ván đã bắt đầu rồi' }, 400);

    const { data: allPlayers } = await db.from('players').select('*').eq('room_code', code);
    // Nếu host chọn làm quản trò thuần (không chơi), loại host khỏi hồ vai - host không có vai,
    // không tính vào tỉ lệ Sói, và không phải mục tiêu đêm/bỏ phiếu (is_alive=false, can_vote=false).
    const players = hostPlays ? allPlayers : (allPlayers || []).filter((p) => p.user_id !== room.host_user_id);
    if (!players || players.length < 5) return json({ error: 'Cần tối thiểu 5 người chơi' }, 400);

    const pool = buildRolePool(players.length, extraRoles);
    const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);

    for (let i = 0; i < shuffledPlayers.length; i++) {
      const role = pool[i];
      const team = ROLES[role].team;
      await db.from('players').update({ role, team }).eq('id', shuffledPlayers[i].id);
    }

    if (!hostPlays) {
      const host = (allPlayers || []).find((p) => p.user_id === room.host_user_id);
      if (host) {
        await db.from('players').update({ role: null, team: null, is_alive: false, can_vote: false }).eq('id', host.id);
      }
    }

    const nightOrderRoles = pool.filter((r, i, arr) => arr.indexOf(r) === i); // roles có mặt trong ván

    await db
      .from('rooms')
      .update({
        phase: 'night',
        night_number: 1,
        day_number: 0,
        settings: { extraRoles, hostPlays },
        phase_data: { subphase_index: 0, present_roles: nightOrderRoles, pending_hunter: null },
        winner: null,
      })
      .eq('code', code);

    await db.from('game_logs').insert({
      room_code: code,
      message: `Ván đấu bắt đầu với ${players.length} người chơi. Màn đêm buông xuống...`,
    });

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
