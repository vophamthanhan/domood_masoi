import { useEffect, useRef } from 'react';
import { api } from '../lib/functions.js';

const DEADLINE_KEY_BY_PHASE = {
  night: 'step_deadline_at',
  day_reveal: 'reveal_deadline_at',
  day_discussion: 'discussion_ends_at',
  day_vote: 'vote_deadline_at',
  day_result: 'result_deadline_at',
};

// Chế độ tự động: mỗi client đang mở phòng đều chạy vòng lặp này (không chỉ chủ phòng),
// server tự xác minh hạn giờ nên gọi trùng giữa nhiều client là an toàn (chỉ 1 lần thực sự áp dụng).
export function useAutoAdvance(room) {
  const roomRef = useRef(room);
  roomRef.current = room;
  const busyRef = useRef(false);
  const enabled = !!room?.settings?.autoMode?.enabled;
  const code = room?.code;

  useEffect(() => {
    if (!enabled || !code) return;
    const id = setInterval(async () => {
      if (busyRef.current) return;
      const r = roomRef.current;
      if (!r) return;
      const pd = r.phase_data || {};
      const now = Date.now();
      let due = false;
      let forceSkipHunter = false;

      if (pd.pending_hunter) {
        due = !!pd.pending_hunter_deadline_at && now >= new Date(pd.pending_hunter_deadline_at).getTime();
        forceSkipHunter = true;
      } else {
        const deadlineKey = DEADLINE_KEY_BY_PHASE[r.phase];
        const deadline = deadlineKey && pd[deadlineKey];
        due = !!deadline && now >= new Date(deadline).getTime();
      }
      if (!due) return;

      busyRef.current = true;
      try {
        await api.advancePhase(r.code, { auto: true, forceSkipHunter });
      } catch (_) {
        // Race giữa nhiều client hoặc chưa đủ điều kiện phía server - bỏ qua, thử lại ở lượt sau.
      } finally {
        busyRef.current = false;
      }
    }, 1000);
    return () => clearInterval(id);
  }, [enabled, code]);
}
