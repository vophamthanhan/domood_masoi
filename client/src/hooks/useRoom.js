import { useEffect, useRef, useState, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient.js';

export function useRoom(roomCode) {
  const [room, setRoom] = useState(null);
  const [players, setPlayers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [chat, setChat] = useState([]);
  const [votes, setVotes] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('CONNECTING');
  const channelRef = useRef(null);
  const wasSubscribedRef = useRef(false);

  const refetchAll = useCallback(async () => {
    if (!roomCode) return;
    const [{ data: r }, { data: p }, { data: l }, { data: c }, { data: v }] = await Promise.all([
      supabase.from('rooms').select('*').eq('code', roomCode).maybeSingle(),
      supabase.from('players_public').select('*').eq('room_code', roomCode).order('joined_at'),
      supabase.from('game_logs').select('*').eq('room_code', roomCode).order('created_at', { ascending: false }).limit(30),
      supabase.from('chat_messages').select('*').eq('room_code', roomCode).order('created_at', { ascending: false }).limit(50),
      supabase.from('votes').select('*').eq('room_code', roomCode),
    ]);
    setRoom(r ?? null);
    if (p) setPlayers(p);
    if (l) setLogs(l.reverse());
    if (c) setChat(c.reverse());
    if (v) setVotes(v);
  }, [roomCode]);

  useEffect(() => {
    if (!roomCode) return;
    refetchAll();

    const channel = supabase
      .channel(`room-${roomCode}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${roomCode}` }, async (payload) => {
        setRoom(payload.new);
        // Bảng players gốc bị revoke quyền đọc trực tiếp (giấu vai trò) nên Realtime KHÔNG BAO GIỜ
        // gửi được postgres_changes cho bảng players tới client (thiếu GRANT SELECT dù RLS cho phép).
        // Migration 0003 gắn trigger: mỗi khi players thay đổi (join/chết/...) sẽ "chạm" rooms.updated_at,
        // nên cứ mỗi lần rooms đổi ta refetch nhẹ players_public để đồng bộ danh sách người chơi.
        const { data } = await supabase.from('players_public').select('*').eq('room_code', roomCode).order('joined_at');
        if (data) setPlayers(data);
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_logs', filter: `room_code=eq.${roomCode}` }, (payload) => {
        setLogs((prev) => (prev.some((x) => x.id === payload.new.id) ? prev : [...prev, payload.new]));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_code=eq.${roomCode}` }, (payload) => {
        setChat((prev) => (prev.some((x) => x.id === payload.new.id) ? prev : [...prev, payload.new]));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `room_code=eq.${roomCode}` }, (payload) => {
        // votes không có cột nhạy cảm và dùng upsert (id ổn định) -> patch thẳng, không cần query lại.
        const row = payload.new;
        if (!row) return;
        setVotes((prev) => (prev.some((v) => v.id === row.id) ? prev.map((v) => (v.id === row.id ? row : v)) : [...prev, row]));
      })
      .subscribe((status) => {
        setConnectionStatus(status);
        // Chỉ refetch khi kênh vừa reconnect (không phải lần subscribe đầu tiên, vì mount đã refetchAll() rồi).
        if (status === 'SUBSCRIBED') {
          if (wasSubscribedRef.current) refetchAll();
          wasSubscribedRef.current = true;
        } else {
          wasSubscribedRef.current = false;
        }
      });

    channelRef.current = channel;

    // Dự phòng hội tụ trạng thái: refetch khi tab quay lại foreground (vd sau khi máy sleep/mất mạng).
    // Việc reconnect kênh realtime cũng tự refetch ở callback subscribe() phía trên.
    function handleVisibility() {
      if (document.visibilityState === 'visible') refetchAll();
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [roomCode, refetchAll]);

  return { room, players, logs, chat, votes, refetchAll, connectionStatus };
}
