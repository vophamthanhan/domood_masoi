-- =========================================================
-- MA SÓI ONLINE - Supabase schema
-- =========================================================
create extension if not exists "pgcrypto";

-- ---------- ROOMS ----------
create table if not exists rooms (
  code text primary key,                    -- mã phòng, vd "ABCD"
  host_user_id uuid,                        -- auth.uid() của chủ phòng
  phase text not null default 'lobby',      -- lobby | night | day_reveal | day_discussion | day_vote | day_result | ended
  night_number int not null default 0,
  day_number int not null default 0,
  phase_data jsonb not null default '{}'::jsonb,   -- night_order, subphase_index, pending_hunter, timers...
  settings jsonb not null default '{}'::jsonb,     -- danh sách role mở rộng được bật
  winner text,                              -- village | wolf | whitewolf
  created_at timestamptz not null default now()
);

-- ---------- PLAYERS ----------
create table if not exists players (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(code) on delete cascade,
  user_id uuid not null,                    -- auth.uid() (anonymous auth)
  name text not null,
  avatar text default '🧑',
  role text,                                -- gán khi start_game, ẩn với người khác
  team text,                                -- village | wolf | lonewolf
  is_host boolean not null default false,
  is_alive boolean not null default true,
  can_vote boolean not null default true,
  lover_id uuid,                            -- id player kia nếu bị Cupid ghép đôi
  used_witch_heal boolean not null default false,
  used_witch_poison boolean not null default false,
  used_whitewolf_kill_night int,            -- đêm gần nhất Sói Trắng đã giết
  revealed_idiot boolean not null default false,
  joined_at timestamptz not null default now(),
  unique (room_code, user_id)
);

-- ---------- NIGHT ACTIONS ----------
create table if not exists night_actions (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(code) on delete cascade,
  night_number int not null,
  role text not null,
  actor_player_id uuid not null references players(id) on delete cascade,
  action_type text not null,                -- kill | protect | check | heal | poison | link_lovers | thief_swap | peek
  target_player_id uuid references players(id),
  target_player_id_2 uuid references players(id), -- cho cupid (2 người)
  created_at timestamptz not null default now(),
  unique (room_code, night_number, actor_player_id, action_type)
);

-- ---------- VOTES ----------
create table if not exists votes (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(code) on delete cascade,
  day_number int not null,
  voter_player_id uuid not null references players(id) on delete cascade,
  target_player_id uuid references players(id), -- null = bỏ phiếu trắng
  created_at timestamptz not null default now(),
  unique (room_code, day_number, voter_player_id)
);

-- ---------- CHAT ----------
create table if not exists chat_messages (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(code) on delete cascade,
  player_id uuid references players(id) on delete cascade,
  name text not null,
  content text not null,
  created_at timestamptz not null default now()
);

-- ---------- GAME LOG (thông báo công khai: ai chết, ai bị treo cổ...) ----------
create table if not exists game_logs (
  id uuid primary key default gen_random_uuid(),
  room_code text not null references rooms(code) on delete cascade,
  message text not null,
  meta jsonb default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- =========================================================
-- VIEW công khai: KHÔNG lộ cột role/team cho người khác
-- =========================================================
create or replace view players_public as
  select id, room_code, user_id, name, avatar, is_host, is_alive, can_vote,
         revealed_idiot, joined_at,
         (lover_id is not null) as has_lover
  from players;

-- =========================================================
-- RLS
-- =========================================================
alter table rooms enable row level security;
alter table players enable row level security;
alter table night_actions enable row level security;
alter table votes enable row level security;
alter table chat_messages enable row level security;
alter table game_logs enable row level security;

-- Cho phép đọc công khai các bảng không nhạy cảm (mọi ghi/insert đều đi qua Edge Function bằng service role)
create policy "rooms readable" on rooms for select using (true);
create policy "players table policy (không cấp GRANT trực tiếp cho client)" on players for select using (true);
create policy "logs readable" on game_logs for select using (true);
create policy "chat readable" on chat_messages for select using (true);
create policy "votes readable" on votes for select using (true);

-- QUAN TRỌNG: client (anon/authenticated) chỉ được cấp quyền SELECT trên view players_public
-- (không có cột role/team) - KHÔNG cấp quyền SELECT trực tiếp trên bảng players để tránh lộ vai trò.
grant select on players_public to anon, authenticated;
grant select on rooms, game_logs, chat_messages, votes to anon, authenticated;
revoke all on players from anon, authenticated;
revoke insert, update, delete on rooms, night_actions, votes, chat_messages, game_logs from anon, authenticated;

-- Bật Realtime cho các bảng cần theo dõi live
alter publication supabase_realtime add table rooms;
alter publication supabase_realtime add table players;
alter publication supabase_realtime add table chat_messages;
alter publication supabase_realtime add table game_logs;
alter publication supabase_realtime add table votes;
