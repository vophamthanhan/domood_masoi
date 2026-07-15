-- =========================================================
-- Fix: client (anon/authenticated) bị revoke all trên bảng players (để giấu vai trò),
-- nên Supabase Realtime KHÔNG BAO GIỜ gửi được postgres_changes cho bảng players tới client
-- (thiếu GRANT SELECT cơ bản dù RLS cho phép). Kết quả: thay đổi người chơi (vào phòng, chết,
-- đổi trạng thái công khai...) chỉ hiện ra sau khi client tự refetch (vd reload trang).
--
-- Giải pháp: mỗi khi players có thay đổi ảnh hưởng tới players_public, "chạm" vào rooms.updated_at
-- (bảng rooms vẫn được grant + realtime bình thường) để kích hoạt lại sự kiện 'rooms' phía client,
-- từ đó client refetch players_public. Không expose thêm cột nhạy cảm nào qua realtime.
-- =========================================================

alter table rooms add column if not exists updated_at timestamptz not null default now();

create or replace function touch_room_on_players_change() returns trigger as $$
begin
  if (tg_op = 'UPDATE') then
    if (new.name is distinct from old.name)
      or (new.avatar is distinct from old.avatar)
      or (new.is_host is distinct from old.is_host)
      or (new.is_alive is distinct from old.is_alive)
      or (new.can_vote is distinct from old.can_vote)
      or (new.revealed_idiot is distinct from old.revealed_idiot)
      or ((new.lover_id is not null) is distinct from (old.lover_id is not null)) then
      update rooms set updated_at = now() where code = new.room_code;
    end if;
    return new;
  end if;

  -- INSERT (người chơi mới vào phòng) hoặc DELETE: luôn báo cho client biết để refetch danh sách.
  update rooms set updated_at = now() where code = coalesce(new.room_code, old.room_code);
  return coalesce(new, old);
end;
$$ language plpgsql;

drop trigger if exists trg_touch_room_on_players_change on players;
create trigger trg_touch_room_on_players_change
after insert or update or delete on players
for each row execute function touch_room_on_players_change();
