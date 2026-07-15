import { adminClient, getCallerUserId, json, corsHeaders } from '../_shared/utils.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userId = await getCallerUserId(req);
    if (!userId) return json({ error: 'Chưa đăng nhập (auth)' }, 401);

    const { roomCode, name, avatar } = await req.json();
    const code = (roomCode || '').trim().toUpperCase();
    if (!code || code.length < 3) return json({ error: 'Mã phòng không hợp lệ' }, 400);
    if (!name || !name.trim()) return json({ error: 'Vui lòng nhập tên' }, 400);

    const db = adminClient();

    // Tạo phòng nếu chưa tồn tại (join thẳng, không cần bước "tạo phòng" riêng)
    let { data: room } = await db.from('rooms').select('*').eq('code', code).maybeSingle();
    if (!room) {
      const { data: newRoom, error: createErr } = await db
        .from('rooms')
        .insert({ code, host_user_id: userId, phase: 'lobby' })
        .select('*')
        .single();
      if (createErr) return json({ error: createErr.message }, 400);
      room = newRoom;
    }

    if (room.phase !== 'lobby') {
      // Cho phép người chơi cũ (đã có trong phòng) reconnect vào ván đang chạy
      const { data: existing } = await db
        .from('players')
        .select('*')
        .eq('room_code', code)
        .eq('user_id', userId)
        .maybeSingle();
      if (!existing) return json({ error: 'Ván đang diễn ra, không thể vào phòng mới' }, 400);
      return json({ room, player: existing });
    }

    // Đã có trong phòng thì trả về luôn (tránh trùng khi refresh trang)
    const { data: existingPlayer } = await db
      .from('players')
      .select('*')
      .eq('room_code', code)
      .eq('user_id', userId)
      .maybeSingle();
    if (existingPlayer) return json({ room, player: existingPlayer });

    const isHost = room.host_user_id === userId;
    const { data: player, error: pErr } = await db
      .from('players')
      .insert({
        room_code: code,
        user_id: userId,
        name: name.trim().slice(0, 20),
        avatar: avatar || '🧑',
        is_host: isHost,
      })
      .select('*')
      .single();
    if (pErr) return json({ error: pErr.message }, 400);

    await db.from('game_logs').insert({ room_code: code, message: `${name.trim()} đã vào phòng.` });

    return json({ room, player });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
