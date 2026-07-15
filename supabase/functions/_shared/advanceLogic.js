// Logic dùng chung cho việc chuyển pha - vừa dùng cho advance-phase (host bấm tay HOẶC hệ thống
// tự động khi hết giờ), vừa dùng cho submit-night-action/cast-vote (tự động chuyển ngay khi mọi
// người cần hành động đã hành động xong, không cần chờ hết giờ).
import { NIGHT_ORDER, WOLF_KILL_ROLES } from './roles.js';
import { checkWin, winnerLabel, tallyVotes, applyCupidCascade } from './gameLogic.js';

export const AUTO_DEFAULTS = {
  nightStepSeconds: 25,
  revealSeconds: 4,
  discussionSeconds: 120,
  voteSeconds: 45,
  resultSeconds: 6,
  hunterSeconds: 30,
};

export function getAutoSettings(room) {
  const auto = room.settings?.autoMode;
  if (!auto?.enabled) return null;
  return { ...AUTO_DEFAULTS, ...auto };
}

export function deadlineFrom(seconds) {
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export function eligibleNightSteps(room, alivePlayers) {
  const nightNumber = room.night_number;
  return NIGHT_ORDER.filter((step) => {
    if (step.onlyNight1 && nightNumber !== 1) return false;
    if (step.everyOtherNight && nightNumber % 2 !== 0) return false;
    const roleGroup = step.role === 'werewolf' ? WOLF_KILL_ROLES : [step.role];
    return alivePlayers.some((p) => roleGroup.includes(p.role));
  });
}

// Vai của bước đêm hiện tại đã có đủ người hành động chưa (dùng để tự động chuyển ngay, không cần chờ hết giờ)
export async function isNightStepComplete(db, code, room, alivePlayers) {
  const currentRole = room.phase_data?.current_role;
  if (!currentRole) return false;
  // Phù Thủy có thể dùng cả thuốc cứu VÀ thuốc độc trong cùng 1 đêm (2 hành động riêng biệt),
  // nên không thể coi "đã hành động 1 lần" là xong - luôn để hết giờ (step_deadline_at) lo phần này.
  if (currentRole === 'witch') return false;
  const roleGroup = currentRole === 'werewolf' ? WOLF_KILL_ROLES : [currentRole];
  const actors = alivePlayers.filter((p) => roleGroup.includes(p.role));
  if (!actors.length) return true;
  const { data: actions } = await db
    .from('night_actions')
    .select('actor_player_id')
    .eq('room_code', code)
    .eq('night_number', room.night_number)
    .eq('role', currentRole);
  const actedIds = new Set((actions || []).map((a) => a.actor_player_id));
  return actors.every((p) => actedIds.has(p.id));
}

// Di chuyển con trỏ đêm sang bước kế tiếp (kèm hạn giờ nếu bật auto), hoặc resolveNight nếu đã hết bước.
// Dùng chung cho: click tay của host, hệ thống tự động khi hết giờ AFK, và khi mọi người đã hành động xong.
export async function advanceNightCursor(db, code, room, players) {
  const alive = players.filter((p) => p.is_alive);
  const steps = eligibleNightSteps(room, alive);
  const cursor = (room.phase_data?.__cursor ?? -1) + 1;
  const auto = getAutoSettings(room);

  if (cursor < steps.length) {
    const phase_data = { ...room.phase_data, __cursor: cursor, current_role: steps[cursor].role };
    if (auto) phase_data.step_deadline_at = deadlineFrom(auto.nightStepSeconds);
    else delete phase_data.step_deadline_at;
    await db.from('rooms').update({ phase_data }).eq('code', code).eq('phase', 'night');
    return { phase: 'night', current_role: steps[cursor].role };
  }

  await resolveNight(db, code, room, players);
  return { ok: true, resolved: 'night' };
}

export async function resolveNight(db, code, room, players) {
  const nightNumber = room.night_number;
  const { data: actions } = await db
    .from('night_actions')
    .select('*')
    .eq('room_code', code)
    .eq('night_number', nightNumber);

  const byRoleType = (role, type) => (actions || []).filter((a) => a.role === role && a.action_type === type);

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

  if (healAction) {
    const witch = players.find((p) => p.role === 'witch');
    if (witch) await db.from('players').update({ used_witch_heal: true }).eq('id', witch.id);
  }
  if (poisonAction) {
    const witch = players.find((p) => p.role === 'witch');
    if (witch) await db.from('players').update({ used_witch_poison: true }).eq('id', witch.id);
  }

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

  const wasBlocked = savedByGuard || savedByWitch;

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

  const auto = getAutoSettings(room);
  const phase_data = {
    ...room.phase_data,
    last_guard_target: guardTarget || null,
    pending_hunter: pendingHunter,
    last_night_blocked: wasBlocked,
  };
  if (auto) {
    phase_data.reveal_deadline_at = deadlineFrom(auto.revealSeconds);
    if (pendingHunter) phase_data.pending_hunter_deadline_at = deadlineFrom(auto.hunterSeconds);
  }

  await db.from('rooms').update({ phase: 'day_reveal', day_number: room.day_number + 1, phase_data }).eq('code', code);
}

export async function resolveVote(db, code, room, players) {
  const { data: votes } = await db.from('votes').select('*').eq('room_code', code).eq('day_number', room.day_number);
  const { executedId: rawExecutedId, isTie, tiedIds } = tallyVotes(votes);
  let executedId = rawExecutedId;

  const voteRound = room.phase_data?.vote_round || 1;
  const auto = getAutoSettings(room);

  if (isTie && voteRound < 2) {
    const tiedNames = tiedIds.map((id) => players.find((p) => p.id === id)?.name).filter(Boolean);
    await db.from('votes').delete().eq('room_code', code).eq('day_number', room.day_number);
    await db.from('game_logs').insert({
      room_code: code,
      message: `⚖️ Bỏ phiếu hòa giữa ${tiedNames.join(' và ')}. Bầu lại vòng 2, chỉ được chọn giữa 2 người này!`,
    });
    const phase_data = { ...room.phase_data, vote_round: 2, runoff_candidates: tiedIds, discussion_ends_at: null };
    if (auto) phase_data.vote_deadline_at = deadlineFrom(auto.voteSeconds);
    await db.from('rooms').update({ phase: 'day_vote', phase_data }).eq('code', code);
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

  const phase_data = { ...room.phase_data, pending_hunter: pendingHunter, vote_round: 1, runoff_candidates: null };
  if (auto) {
    phase_data.result_deadline_at = deadlineFrom(auto.resultSeconds);
    if (pendingHunter) phase_data.pending_hunter_deadline_at = deadlineFrom(auto.hunterSeconds);
  }
  await db.from('rooms').update({ phase: 'day_result', phase_data }).eq('code', code);
  return {};
}
