import { adminClient, getCallerUserId, json, corsHeaders } from '../_shared/utils.js';
import { NIGHT_ORDER, WOLF_KILL_ROLES } from '../_shared/roles.js';
import { getAutoSettings, isNightStepComplete, advanceNightCursor } from '../_shared/advanceLogic.js';

// Chế độ tự động: ngay khi mọi người cần hành động ở bước đêm hiện tại đã hành động xong,
// chuyển bước liền, không cần chờ hết giờ AFK.
async function maybeAutoAdvance(db, code, room) {
  if (!getAutoSettings(room)) return;
  const { data: freshPlayers } = await db.from('players').select('*').eq('room_code', code);
  const alive = (freshPlayers || []).filter((p) => p.is_alive);
  if (await isNightStepComplete(db, code, room, alive)) {
    await advanceNightCursor(db, code, room, freshPlayers || []);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userId = await getCallerUserId(req);
    if (!userId) return json({ error: 'Chưa đăng nhập' }, 401);
    const { roomCode, actionType, targetPlayerId, targetPlayerId2 } = await req.json();
    const code = (roomCode || '').trim().toUpperCase();
    const db = adminClient();

    const { data: room } = await db.from('rooms').select('*').eq('code', code).maybeSingle();
    if (!room) return json({ error: 'Không tìm thấy phòng' }, 404);
    if (room.phase !== 'night') return json({ error: 'Không phải lượt đêm' }, 400);

    const { data: me } = await db
      .from('players')
      .select('*')
      .eq('room_code', code)
      .eq('user_id', userId)
      .maybeSingle();
    if (!me || !me.is_alive) return json({ error: 'Bạn không thể hành động lúc này' }, 403);

    const currentRole = room.phase_data?.current_role;
    if (!currentRole) return json({ error: 'Chưa tới pha hành động nào' }, 400);
    const step = NIGHT_ORDER.find((s) => s.role === currentRole);
    if (!step) return json({ error: 'Sai pha đêm' }, 400);

    const myRoleGroup = WOLF_KILL_ROLES.includes(me.role) ? 'werewolf' : me.role;
    if (myRoleGroup !== step.role) return json({ error: 'Chưa tới lượt vai của bạn' }, 400);
    if (step.onlyNight1 && room.night_number !== 1) return json({ error: 'Vai này chỉ hành động đêm đầu' }, 400);
    if (step.everyOtherNight && room.night_number % 2 !== 0) return json({ error: 'Sói Trắng chỉ thức đêm chẵn' }, 400);

    // --- Kẻ Trộm: đổi vai ngay lập tức với người được chọn (hiệu ứng tức thời, chỉ đêm 1) ---
    if (me.role === 'thief' && actionType === 'thief_swap' && targetPlayerId) {
      const { data: target } = await db.from('players').select('*').eq('id', targetPlayerId).maybeSingle();
      if (target) {
        await db.from('players').update({ role: target.role, team: target.team }).eq('id', me.id);
        await db.from('players').update({ role: 'thief', team: 'village' }).eq('id', target.id);
      }
      await db.from('night_actions').upsert(
        { room_code: code, night_number: room.night_number, role: 'thief', actor_player_id: me.id, action_type: 'thief_swap', target_player_id: targetPlayerId },
        { onConflict: 'room_code,night_number,actor_player_id,action_type' },
      );
      await maybeAutoAdvance(db, code, room);
      return json({ ok: true, swapped: true });
    }

    // --- Cupid: ghép đôi ngay lập tức (chỉ đêm 1) ---
    if (me.role === 'cupid' && actionType === 'link_lovers' && targetPlayerId && targetPlayerId2) {
      await db.from('players').update({ lover_id: targetPlayerId2 }).eq('id', targetPlayerId);
      await db.from('players').update({ lover_id: targetPlayerId }).eq('id', targetPlayerId2);
      await db.from('night_actions').upsert(
        { room_code: code, night_number: room.night_number, role: 'cupid', actor_player_id: me.id, action_type: 'link_lovers', target_player_id: targetPlayerId, target_player_id_2: targetPlayerId2 },
        { onConflict: 'room_code,night_number,actor_player_id,action_type' },
      );
      await db.from('game_logs').insert({
        room_code: code,
        message: '💘 Có 2 người vừa phải lòng nhau trong bóng tối...',
        meta: { type: 'lovers_linked' },
      });
      await maybeAutoAdvance(db, code, room);
      return json({ ok: true, linked: true });
    }

    // --- Bảo Vệ: không được bảo vệ cùng 1 người 2 đêm liên tiếp ---
    if (me.role === 'guard' && actionType === 'protect') {
      const lastTarget = room.phase_data?.last_guard_target;
      if (lastTarget && lastTarget === targetPlayerId) {
        return json({ error: 'Không thể bảo vệ cùng một người 2 đêm liên tiếp' }, 400);
      }
    }

    // --- Phù Thủy: mỗi loại thuốc chỉ dùng 1 lần trong ván ---
    if (me.role === 'witch') {
      if (actionType === 'heal' && me.used_witch_heal) return json({ error: 'Bạn đã dùng thuốc cứu rồi' }, 400);
      if (actionType === 'poison' && me.used_witch_poison) return json({ error: 'Bạn đã dùng thuốc độc rồi' }, 400);
    }

    await db.from('night_actions').upsert(
      {
        room_code: code,
        night_number: room.night_number,
        role: me.role,
        actor_player_id: me.id,
        action_type: actionType,
        target_player_id: targetPlayerId || null,
        target_player_id_2: targetPlayerId2 || null,
      },
      { onConflict: 'room_code,night_number,actor_player_id,action_type' },
    );

    // Tiên tri: trả kết quả ngay lập tức (chỉ riêng người gọi thấy)
    if (me.role === 'seer' && actionType === 'check' && targetPlayerId) {
      const { data: target } = await db.from('players').select('name,team,role').eq('id', targetPlayerId).maybeSingle();
      // Sói Bà Ba đánh lừa Tiên Tri: luôn hiện ra là phe Dân Làng
      const apparentTeam = target?.role === 'disguisedwolf' ? 'village' : target?.team;
      await maybeAutoAdvance(db, code, room);
      return json({ ok: true, seer_result: { name: target?.name, team: apparentTeam } });
    }

    await maybeAutoAdvance(db, code, room);
    return json({ ok: true });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
