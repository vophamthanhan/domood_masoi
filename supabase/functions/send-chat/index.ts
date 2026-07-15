import { adminClient, getCallerUserId, json, corsHeaders } from '../_shared/utils.js';

const RATE_LIMIT_MS = 1200;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userId = await getCallerUserId(req);
    if (!userId) return json({ error: 'Chưa đăng nhập' }, 401);
    const { roomCode, content } = await req.json();
    const code = (roomCode || '').trim().toUpperCase();
    if (!content || !content.trim()) return json({ error: 'Nội dung trống' }, 400);
    const db = adminClient();

    const { data: me } = await db.from('players').select('*').eq('room_code', code).eq('user_id', userId).maybeSingle();
    if (!me) return json({ error: 'Bạn không ở trong phòng' }, 404);

    // Kẻ Câm không thể nhắn tin với người sống khi còn sống (vẫn bỏ phiếu được bình thường)
    if (me.is_alive && me.role === 'mute') {
      return json({ error: 'Bạn là Kẻ Câm — không thể nhắn tin lúc này, chỉ có thể bỏ phiếu.' }, 403);
    }

    // Giới hạn tốc độ gửi để tránh spam
    const { data: lastMsg } = await db
      .from('chat_messages')
      .select('created_at')
      .eq('player_id', me.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastMsg && Date.now() - new Date(lastMsg.created_at).getTime() < RATE_LIMIT_MS) {
      return json({ error: 'Bạn đang gửi quá nhanh, chờ một chút nhé.' }, 429);
    }

    const channel = me.is_alive ? 'living' : 'dead';
    const prefix = me.is_alive ? '' : '👻 (đã mất) ';
    await db.from('chat_messages').insert({
      room_code: code,
      player_id: me.id,
      name: `${prefix}${me.name}`,
      content: content.trim().slice(0, 300),
      channel,
    });

    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
