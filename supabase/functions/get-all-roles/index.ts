import { adminClient, getCallerUserId, json, corsHeaders } from '../_shared/utils.js';
import { ROLES } from '../_shared/roles.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userId = await getCallerUserId(req);
    if (!userId) return json({ error: 'Chưa đăng nhập' }, 401);
    const { roomCode } = await req.json();
    const code = (roomCode || '').trim().toUpperCase();
    const db = adminClient();

    const { data: room } = await db.from('rooms').select('*').eq('code', code).maybeSingle();
    if (!room) return json({ error: 'Không tìm thấy phòng' }, 404);
    const isHost = room.host_user_id === userId;
    if (!isHost && room.phase !== 'ended') {
      return json({ error: 'Chỉ chủ phòng được xem toàn bộ vai lúc này' }, 403);
    }

    const { data: players } = await db
      .from('players')
      .select('id,name,role,team,is_alive,lover_id')
      .eq('room_code', code);

    const withNames = (players || []).map((p) => ({
      ...p,
      role_name: p.role ? ROLES[p.role]?.name : null,
    }));

    return json({ players: withNames, room });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
