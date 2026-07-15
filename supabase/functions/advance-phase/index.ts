import { adminClient, getCallerUserId, json, corsHeaders } from '../_shared/utils.js';
import { NIGHT_ORDER, WOLF_KILL_ROLES } from '../_shared/roles.js';
import { checkWin, winnerLabel, tallyVotes, applyCupidCascade } from '../_shared/gameLogic.js';

function eligibleNightSteps(room, alivePlayers) {
  const nightNumber = room.night_number;
  return NIGHT_ORDER.filter((step) => {
    if (step.onlyNight1 && nightNumber !== 1) return false;
    if (step.everyOtherNight && nightNumber % 2 !== 0) return false;
    const roleGroup = step.role === 'werewolf' ? WOLF_KILL_ROLES : [step.role];
    return alivePlayers.some((p) => roleGroup.includes(p.role));
  });
}

async function resolveNight(db, code, room, players) {
  const nightNumber = room.night_number;
  const { data: actions } = await db
    .from('night_actions')
    .select('*')
    .eq('room_code', code)
    .eq('night_number', nightNumber);

  const byRoleType = (role, type) => (actions || []).filter((a) => a.role === role && a.action_type === type);

  // --- Vote sói (werewolf + alphawolf + sói bà ba cùng bỏ phiếu 1 nạn nhân) ---
  const wolfVotes = (actions || []).filter(
    (a) => WOLF_KILL_ROLES.includes(a.role) && a.action_type === 'kill' && a.target_player_id,
  );
  let wolfVictim = null;
  if (wolfVotes.length) {
    const tally = {};
    wolfVotes.forEach((v) => (tally[v.target_player_id] = (tally[v.target_player_id] || 0) + 1));
    const max = Math.max(...Object.values(tally));
    const top = Object.keys(tally).filter((k) => tally[k] === max);
    wolfVictim = top[Math.floor(Math.random() * top.length)];
  }

  const guardAction = byRoleType('guard', 'protect')[0];
  const guardTarget = guardAction?.target_player_id || null;

  const healAction = byRoleType('witch', 'heal')[0];
  const poisonAction = byRoleType('witch', 'poison')[0];
  const whitewolfAction = byRoleType('whitewolf', 'kill_wolf')[0];

  const deaths = new Set();
  let savedByGuard = false;
  let savedByWitch = false;

  if (wolfVictim) {
    if (guardTarget && guardTarget === wolfVictim) savedByGuard = true;
    else if (healAction) savedByWitch = true;
    else deaths.add(wolfVictim);
  }
  if (poisonAction?.target_player_id) deaths.add(poisonAction.target_player_id);
  if (whitewolfAction?.target_player_id) deaths.add(whitewolfAction.target_player_id);
  const whitewolfBetrayed = !!whitewolfAction?.target_player_id;

  // Mark witch potions used
  if (healAction) {
    const witch = players.find((p) => p.role === 'witch');
    if (witch) await db.from('players').update({ used_witch_heal: true }).eq('id', witch.id);
  }
  if (poisonAction) {
    const witch = players.find((p) => p.role === 'witch');
    if (witch) await db.from('players').update({ used_witch_poison: true }).eq('id', witch.id);
  }

  // Cupid heartbreak cascade (dùng logic thuần chung, dễ test)
  const deathsWithCascade = applyCupidCascade(deaths, players);

  let pendingHunter = null;
  const deathNames = [];
  for (const id of deathsWithCascade) {
    await db.from('players').update({ is_alive: false }).eq('id', id);
    const p = players.find((pl) => pl.id === id);
    if (p) {
      deathNames.push(p.name);
      if (p.role === 'hunter') pendingHunter = p.id;
    }
  }

  const wasBlocked = savedByGuard || savedByWitch; // dùng cho thông tin của Tiều Phu

  let msg;
  let logMeta = { type: 'night_result' };
  if (deathNames.length === 0) {
    msg = savedByGuard
      ? 'Đêm qua Bảo Vệ đã cứu sống một người khỏi nanh vuốt Sói!'
      : savedByWitch
      ? 'Đêm qua Phù Thủy đã dùng thuốc giải cứu một mạng người!'
      : 'Đêm qua yên bình trôi qua, không ai thiệt mạng.';
  } else {
    msg = `Đêm qua, ${deathNames.join(', ')} đã không qua khỏi.`;
    logMeta = { type: 'night_death', names: deathNames };
  }
  await db.from('game_logs').insert({ room_code: code, message: msg, meta: logMeta });
  if (whitewolfBetrayed) {
    await db.from('game_logs').insert({
      room_code: code,
      message: '❄️ Trong bóng tối, Sói Trắng đã ra tay với chính đồng bọn của mình!',
      meta: { type: 'whitewolf_betray' },
    });
  }

  const { data: freshPlayers } = await db.from('players').select('*').eq('room_code', code);
  const winner = checkWin(freshPlayers.filter((p) => p.is_alive));

  if (winner) {
    await db.from('rooms').update({ phase: 'ended', winner }).eq('code', code);
    await db
      .from('game_logs')
      .insert({ room_code: code, message: `🏆 Phe ${winnerLabel(winner)} đã chiến thắng!`, meta: { type: 'game_over', winner } });
    return;
  }

  await db
    .from('rooms')
    .update({
      phase: 'day_reveal',
      day_number: room.day_number + 1,
      phase_data: {
        ...room.phase_data,
        last_guard_target: guardTarget || null,
        pending_hunter: pendingHunter,
        last_night_blocked: wasBlocked,
      },
    })
    .eq('code', code);
}

async function resolveVote(db, code, room, players) {
  const { data: votes } = await db.from('votes').select('*').eq('room_code', code).eq('day_number', room.day_number);
  const { executedId: rawExecutedId, isTie, tiedIds } = tallyVotes(votes);
  let executedId = rawExecutedId;

  const voteRound = room.phase_data?.vote_round || 1;

  // --- HÒA PHIẾU: mở vòng bầu lại (chỉ 1 lần), sau đó nếu vẫn hòa thì bế tắc ---
  if (isTie && voteRound < 2) {
    const tiedNames = tiedIds.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean);
    await db.from('votes').delete().eq('room_code', code).eq('day_number', room.day_number);
    await db.from('game_logs').insert({
      room_code: code,
      message: `⚖️ Bỏ phiếu hòa giữa ${tiedNames.join(' và ')}. Bầu lại vòng 2, chỉ được chọn giữa 2 người này!`,
    });
    await db
      .from('rooms')
      .update({
        phase: 'day_vote',
        phase_data: { ...room.phase_data, vote_round: 2, runoff_candidates: tiedIds, discussion_ends_at: null },
      })
      .eq('code', code);
    return { runoff: true };
  }

  let msg;
  let logMeta = {};
  if (isTie) {
    msg = 'Bầu lại vẫn hòa phiếu — cả làng bế tắc, không ai bị treo cổ hôm nay.';
    logMeta = { type: 'vote_tie' };
  }

  let pendingHunter = null;
  if (executedId) {
    const target = players.find((p) => p.id === executedId);
    if (target?.role === 'idiot' && !target.revealed_idiot) {
      await db.from('players').update({ revealed_idiot: true, can_vote: false }).eq('id', executedId);
      msg = `${target.name} bị treo cổ nhưng lật bài lộ là Thằng Ngốc Làng! Được tha mạng nhưng mất quyền bỏ phiếu từ nay.`;
      logMeta = { type: 'idiot_saved' };
      executedId = null;
    } else {
      await db.from('players').update({ is_alive: false }).eq('id', executedId);
      msg = `${target.name} đã bị dân làng treo cổ.`;
      logMeta = { type: 'execution', name: target?.name };
      if (target?.role === 'hunter') pendingHunter = target.id;
      if (target?.lover_id) {
        const lover = players.find((p) => p.id === target.lover_id);
        if (lover?.is_alive) {
          await db.from('players').update({ is_alive: false }).eq('id', lover.id);
          msg += ` ${lover.name} vì quá đau khổ (người yêu) cũng chết theo.`;
        }
      }
    }
  } else if (!msg) {
    msg = 'Bỏ phiếu không đủ đa số, không ai bị treo cổ hôm nay.';
  }
  await db.from('game_logs').insert({ room_code: code, message: msg, meta: logMeta });

  const { data: freshPlayers } = await db.from('players').select('*').eq('room_code', code);
  const winner = checkWin(freshPlayers.filter((p) => p.is_alive));
  if (winner) {
    await db.from('rooms').update({ phase: 'ended', winner }).eq('code', code);
    await db.from('game_logs').insert({ room_code: code, message: `🏆 Phe ${winnerLabel(winner)} đã chiến thắng!` });
    return {};
  }
  await db
    .from('rooms')
    .update({
      phase: 'day_result',
      phase_data: { ...room.phase_data, pending_hunter: pendingHunter, vote_round: 1, runoff_candidates: null },
    })
    .eq('code', code);
  return {};
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  try {
    const userId = await getCallerUserId(req);
    if (!userId) return json({ error: 'Chưa đăng nhập' }, 401);
    const { roomCode, forceSkipHunter, discussionSeconds, extendSeconds } = await req.json();
    const code = (roomCode || '').trim().toUpperCase();
    const db = adminClient();

    const { data: room } = await db.from('rooms').select('*').eq('code', code).maybeSingle();
    if (!room) return json({ error: 'Không tìm thấy phòng' }, 404);
    if (room.host_user_id !== userId) return json({ error: 'Chỉ chủ phòng điều khiển được' }, 403);

    if (room.phase_data?.pending_hunter && !forceSkipHunter) {
      return json({ error: 'Đang chờ Thợ Săn bắn súng trước khi tiếp tục' }, 400);
    }
    if (forceSkipHunter) {
      await db.from('rooms').update({ phase_data: { ...room.phase_data, pending_hunter: null } }).eq('code', code);
      room.phase_data = { ...room.phase_data, pending_hunter: null };
    }

    // Gia hạn/rút ngắn đồng hồ thảo luận mà không đổi pha
    if (room.phase === 'day_discussion' && typeof extendSeconds === 'number') {
      const current = room.phase_data?.discussion_ends_at ? new Date(room.phase_data.discussion_ends_at).getTime() : Date.now();
      const newEnds = new Date(Math.max(Date.now(), current + extendSeconds * 1000)).toISOString();
      await db.from('rooms').update({ phase_data: { ...room.phase_data, discussion_ends_at: newEnds } }).eq('code', code);
      return json({ phase: 'day_discussion', discussion_ends_at: newEnds });
    }

    const { data: players } = await db.from('players').select('*').eq('room_code', code);

    if (room.phase === 'night') {
      const alive = players.filter((p) => p.is_alive);
      const steps = eligibleNightSteps(room, alive);
      // Con trỏ đơn giản chạy trên mảng "steps" đã lọc theo vai còn sống / điều kiện đêm
      const cursor = (room.phase_data?.__cursor ?? -1) + 1;
      if (cursor < steps.length) {
        await db
          .from('rooms')
          .update({ phase_data: { ...room.phase_data, __cursor: cursor, current_role: steps[cursor].role } })
          .eq('code', code);
        return json({ phase: 'night', current_role: steps[cursor].role });
      }
      await resolveNight(db, code, room, players);
      return json({ ok: true, resolved: 'night' });
    }

    if (room.phase === 'day_reveal') {
      const seconds = Number.isFinite(discussionSeconds) && discussionSeconds > 0 ? discussionSeconds : 120;
      const endsAt = new Date(Date.now() + seconds * 1000).toISOString();
      await db
        .from('rooms')
        .update({ phase: 'day_discussion', phase_data: { ...room.phase_data, discussion_ends_at: endsAt } })
        .eq('code', code);
      return json({ phase: 'day_discussion', discussion_ends_at: endsAt });
    }

    if (room.phase === 'day_discussion') {
      await db
        .from('rooms')
        .update({
          phase: 'day_vote',
          phase_data: { ...room.phase_data, discussion_ends_at: null, vote_round: 1, runoff_candidates: null },
        })
        .eq('code', code);
      return json({ phase: 'day_vote' });
    }

    if (room.phase === 'day_vote') {
      const result = await resolveVote(db, code, room, players);
      return json({ ok: true, resolved: 'vote', ...result });
    }

    if (room.phase === 'day_result') {
      await db
        .from('rooms')
        .update({
          phase: 'night',
          night_number: room.night_number + 1,
          phase_data: { last_guard_target: room.phase_data?.last_guard_target ?? null, __cursor: -1, pending_hunter: null },
        })
        .eq('code', code);
      return json({ phase: 'night' });
    }

    return json({ error: 'Ván đã kết thúc' }, 400);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
