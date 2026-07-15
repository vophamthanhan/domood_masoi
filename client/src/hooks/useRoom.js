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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'rooms', filter: `code=eq.${roomCode}` }, (payload) => {
        setRoom(payload.new);
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${roomCode}` }, async (payload) => {
        // Bảng players gốc bị revoke quyền đọc trực tiếp (xem players_public trong migration),
        // nên không dùng thẳng payload.new (có thể chứa cột nhạy cảm như role/team) mà phải
        // truy vấn lại đúng 1 dòng qua view players_public rồi patch vào state.
        const id = payload.new?.id ?? payload.old?.id;
        if (!id) return;
        const { data } = await supabase.from('players_public').select('*').eq('id', id).maybeSingle();
        setPlayers((prev) => {
          if (!data) return prev.filter((p) => p.id !== id);
          return prev.some((p) => p.id === id) ? prev.map((p) => (p.id === id ? data : p)) : [...prev, data];
        });
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
