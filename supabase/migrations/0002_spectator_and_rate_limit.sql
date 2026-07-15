-- =========================================================
-- Bổ sung: chế độ khán giả (chat riêng cho người đã mất) + tối ưu rate-limit
-- =========================================================
alter table chat_messages add column if not exists channel text not null default 'living';

create index if not exists idx_chat_messages_player_created on chat_messages(player_id, created_at desc);
create index if not exists idx_chat_messages_room_channel on chat_messages(room_code, channel, created_at);
