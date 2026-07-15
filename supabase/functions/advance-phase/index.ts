import { adminClient, getCallerUserId, json, corsHeaders } from '../_shared/utils.js';
import { getAutoSettings, deadlineFrom, advanceNightCursor, resolveVote } from '../_shared/advanceLogic.js';

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userId = await getCallerUserId(req);
    if (!userId) return json({ error: 'Chưa đăng nhập' }, 401);
    const { roomCode, forceSkipHunter, discussionSeconds, extendSeconds, auto } = await req.json();
    const code = (roomCode || '').trim().toUpperCase();
    const db = adminClient();

    const { data: room } = await db.from('rooms').select('*').eq('code', code).maybeSingle();
    if (!room) return json({ error: 'Không tìm thấy phòng' }, 404);

    if (auto) {
      // Chế độ tự động: bất kỳ người chơi nào trong phòng cũng được phép gọi (không chỉ host),
      // nhưng server tự xác minh điều kiện hết giờ - không tin phía client để tránh gian lận rút ngắn thời gian.
      const { data: me } = await db.from('players').select('id').eq('room_code', code).eq('user_id', userId).maybeSingle();
      if (!me) return json({ error: 'Bạn không ở trong phòng này' }, 403);
      if (!getAutoSettings(room)) return json({ error: 'Phòng chưa bật chế độ tự động' }, 400);
    } else if (room.host_user_id !== userId) {
      return json({ error: 'Chỉ chủ phòng điều khiển được' }, 403);
    }

    if (room.phase_data?.pending_hunter) {
      if (!forceSkipHunter) return json({ error: 'Đang chờ Thợ Săn bắn súng trước khi tiếp tục' }, 400);
      if (auto) {
        const deadline = room.phase_data?.pending_hunter_deadline_at;
        if (!deadline || Date.now() < new Date(deadline).getTime()) return json({ error: 'Chưa hết thời gian chờ Thợ Săn' }, 400);
      }
      await db
        .from('rooms')
        .update({ phase_data: { ...room.phase_data, pending_hunter: null, pending_hunter_deadline_at: null } })
        .eq('code', code);
      room.phase_data = { ...room.phase_data, pending_hunter: null, pending_hunter_deadline_at: null };
    }

    // Gia hạn/rút ngắn đồng hồ thảo luận mà không đổi pha (chỉ host, không áp dụng cho chế độ tự động)
    if (!auto && room.phase === 'day_discussion' && typeof extendSeconds === 'number') {
      const current = room.phase_data?.discussion_ends_at ? new Date(room.phase_data.discussion_ends_at).getTime() : Date.now();
      const newEnds = new Date(Math.max(Date.now(), current + extendSeconds * 1000)).toISOString();
      await db.from('rooms').update({ phase_data: { ...room.phase_data, discussion_ends_at: newEnds } }).eq('code', code);
      return json({ phase: 'day_discussion', discussion_ends_at: newEnds });
    }

    const { data: players } = await db.from('players').select('*').eq('room_code', code);

    if (room.phase === 'night') {
      if (auto) {
        const deadline = room.phase_data?.step_deadline_at;
        if (!deadline || Date.now() < new Date(deadline).getTime()) return json({ error: 'Chưa hết thời gian chờ vai này' }, 400);
      }
      return json(await advanceNightCursor(db, code, room, players));
    }

    if (room.phase === 'day_reveal') {
      const autoSettings = getAutoSettings(room);
      let seconds;
      if (auto) {
        const deadline = room.phase_data?.reveal_deadline_at;
        if (!deadline || Date.now() < new Date(deadline).getTime()) return json({ error: 'Chưa hết thời gian xem kết quả' }, 400);
        seconds = autoSettings?.discussionSeconds ?? 120;
      } else {
        seconds = Number.isFinite(discussionSeconds) && discussionSeconds > 0 ? discussionSeconds : 120;
      }
      const endsAt = new Date(Date.now() + seconds * 1000).toISOString();
      const phase_data = { ...room.phase_data, discussion_ends_at: endsAt, reveal_deadline_at: null };
      await db.from('rooms').update({ phase: 'day_discussion', phase_data }).eq('code', code).eq('phase', 'day_reveal');
      return json({ phase: 'day_discussion', discussion_ends_at: endsAt });
    }

    if (room.phase === 'day_discussion') {
      if (auto) {
        const deadline = room.phase_data?.discussion_ends_at;
        if (!deadline || Date.now() < new Date(deadline).getTime()) return json({ error: 'Chưa hết giờ thảo luận' }, 400);
      }
      const autoSettings = getAutoSettings(room);
      const phase_data = { ...room.phase_data, discussion_ends_at: null, vote_round: 1, runoff_candidates: null };
      if (autoSettings) phase_data.vote_deadline_at = deadlineFrom(autoSettings.voteSeconds);
      await db.from('rooms').update({ phase: 'day_vote', phase_data }).eq('code', code).eq('phase', 'day_discussion');
      return json({ phase: 'day_vote' });
    }

    if (room.phase === 'day_vote') {
      if (auto) {
        const deadline = room.phase_data?.vote_deadline_at;
        if (!deadline || Date.now() < new Date(deadline).getTime()) return json({ error: 'Chưa hết giờ bỏ phiếu' }, 400);
      }
      const result = await resolveVote(db, code, room, players);
      return json({ ok: true, resolved: 'vote', ...result });
    }

    if (room.phase === 'day_result') {
      if (auto) {
        const deadline = room.phase_data?.result_deadline_at;
        if (!deadline || Date.now() < new Date(deadline).getTime()) return json({ error: 'Chưa hết thời gian xem kết quả' }, 400);
      }
      const nextRoom = {
        ...room,
        phase: 'night',
        night_number: room.night_number + 1,
        phase_data: { last_guard_target: room.phase_data?.last_guard_target ?? null, __cursor: -1, pending_hunter: null },
      };
      await db
        .from('rooms')
        .update({ phase: nextRoom.phase, night_number: nextRoom.night_number, phase_data: nextRoom.phase_data })
        .eq('code', code)
        .eq('phase', 'day_result');
      // Tính luôn bước đêm đầu tiên trong cùng lượt gọi, tránh phải chờ thêm 1 vòng trống.
      const advanced = await advanceNightCursor(db, code, nextRoom, players);
      return json(advanced);
    }

    return json({ error: 'Ván đã kết thúc' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
