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

    const { data: me } = await db
      .from('players')
      .select('*')
      .eq('room_code', code)
      .eq('user_id', userId)
      .maybeSingle();
    if (!me) return json({ error: 'Bạn không ở trong phòng này' }, 404);
    if (!me.role) return json({ role: null });

    let loverName = null;
    if (me.lover_id) {
      const { data: lover } = await db.from('players').select('name').eq('id', me.lover_id).maybeSingle();
      loverName = lover?.name || null;
    }

    const { data: room } = await db.from('rooms').select('*').eq('code', code).maybeSingle();

    let wolfVictim = null;
    if (me.role === 'witch' && room?.phase === 'night' && room.phase_data?.current_role === 'witch') {
      const { data: wolfActions } = await db
        .from('night_actions')
        .select('target_player_id')
        .eq('room_code', code)
        .eq('night_number', room.night_number)
        .in('role', ['werewolf', 'alphawolf', 'disguisedwolf'])
        .eq('action_type', 'kill');
      const tally = {};
      (wolfActions || []).forEach((a) => {
        if (a.target_player_id) tally[a.target_player_id] = (tally[a.target_player_id] || 0) + 1;
      });
      const entries = Object.entries(tally);
      if (entries.length) {
        const max = Math.max(...entries.map(([, c]) => c));
        const topId = entries.find(([, c]) => c === max)[0];
        const { data: victim } = await db.from('players').select('id,name').eq('id', topId).maybeSingle();
        wolfVictim = victim || null;
      }
    }

    let wolfTeammates = [];
    if (me.team === 'wolf') {
      const { data: teammates } = await db
        .from('players')
        .select('id,name,is_alive')
        .eq('room_code', code)
        .eq('team', 'wolf')
        .neq('id', me.id);
      wolfTeammates = teammates || [];
    }

    let woodcutterInfo = null;
    if (me.role === 'woodcutter' && room?.phase && room.phase !== 'lobby') {
      woodcutterInfo = {
        night_number: room.night_number,
        was_blocked: !!room.phase_data?.last_night_blocked,
      };
    }

    return json({
      player_id: me.id,
      role: me.role,
      team: me.team,
      role_name: ROLES[me.role]?.name,
      is_alive: me.is_alive,
      lover_name: loverName,
      used_witch_heal: me.used_witch_heal,
      used_witch_poison: me.used_witch_poison,
      wolf_victim: wolfVictim,
      wolf_teammates: wolfTeammates,
      woodcutter_info: woodcutterInfo,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
