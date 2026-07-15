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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'players', filter: `room_code=eq.${roomCode}` }, () => {
        refetchAll();
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'game_logs', filter: `room_code=eq.${roomCode}` }, (payload) => {
        setLogs((prev) => (prev.some((x) => x.id === payload.new.id) ? prev : [...prev, payload.new]));
      })
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `room_code=eq.${roomCode}` }, (payload) => {
        setChat((prev) => (prev.some((x) => x.id === payload.new.id) ? prev : [...prev, payload.new]));
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'votes', filter: `room_code=eq.${roomCode}` }, () => {
        supabase.from('votes').select('*').eq('room_code', roomCode).then(({ data }) => data && setVotes(data));
      })
      .subscribe((status) => setConnectionStatus(status));

    channelRef.current = channel;

    // Polling dự phòng: đảm bảo trạng thái luôn hội tụ ngay cả khi lỡ mất sự kiện realtime
    // (mất mạng tạm thời, tab bị nền hoá, v.v.)
    const pollId = setInterval(() => {
      if (document.visibilityState === 'visible') refetchAll();
    }, 8000);

    function handleVisibility() {
      if (document.visibilityState === 'visible') refetchAll();
    }
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      supabase.removeChannel(channel);
      clearInterval(pollId);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [roomCode, refetchAll]);

  return { room, players, logs, chat, votes, refetchAll, connectionStatus };
}
