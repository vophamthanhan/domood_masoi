import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { ensureAnonSession, supabase } from './lib/supabaseClient.js';
import { useRoom } from './hooks/useRoom.js';
import SplashScreen from './components/SplashScreen.jsx';
import IntroVideo from './components/IntroVideo.jsx';
import AmbientCreatures from './components/AmbientCreatures.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const WaitingRoom = lazy(() => import('./pages/WaitingRoom.jsx'));
const GameRoom = lazy(() => import('./pages/GameRoom.jsx'));

export default function App() {
  const [authReady, setAuthReady] = useState(false);
  const [introDone, setIntroDone] = useState(false);
  const [userId, setUserId] = useState(null);
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('ms_room_code') || '');
  const [myPlayerId, setMyPlayerId] = useState(() => localStorage.getItem('ms_player_id') || '');
  const hasLoadedRoomOnce = useRef(false);
  const ready = authReady && introDone;

  useEffect(() => {
    // Đăng nhập ẩn danh chạy song song trong lúc video intro phát - video (~10s) luôn dài hơn
    // thời gian đăng nhập thực tế nên không có độ trễ cộng dồn khi video kết thúc.
    ensureAnonSession().then((session) => {
      setUserId(session.user.id);
      setAuthReady(true);
    });
  }, []);

  const { room, players, logs, chat, votes, connectionStatus } = useRoom(roomCode || null);

  function handleJoined(code, playerId) {
    hasLoadedRoomOnce.current = false;
    setRoomCode(code);
    setMyPlayerId(playerId);
    localStorage.setItem('ms_room_code', code);
    localStorage.setItem('ms_player_id', playerId);
  }

  function handleLeave() {
    hasLoadedRoomOnce.current = false;
    setRoomCode('');
    setMyPlayerId('');
    localStorage.removeItem('ms_room_code');
    localStorage.removeItem('ms_player_id');
  }

  // Nếu phòng đã tải thành công ít nhất 1 lần rồi bỗng biến mất (bị xoá / mã sai sau reload) -> quay về sảnh
  useEffect(() => {
    if (room) hasLoadedRoomOnce.current = true;
    else if (roomCode && hasLoadedRoomOnce.current) {
      handleLeave();
    }
  }, [room, roomCode]);

  if (!ready) {
    return <IntroVideo onDone={() => setIntroDone(true)} ready={authReady} />;
  }

  const showReconnecting = roomCode && room && connectionStatus && connectionStatus !== 'SUBSCRIBED';

  return (
    <div className="relative min-h-screen overflow-hidden">
      <div className="stars" />
      <div className="fog" />
      <AmbientCreatures />
      {showReconnecting && (
        <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 bg-orange-500/90 text-white text-xs px-3 py-1.5 rounded-full shadow">
          🔄 Đang kết nối lại...
        </div>
      )}
      <div className="relative z-10">
        <Suspense fallback={<SplashScreen label="Đang mở cổng làng..." />}>
          {!roomCode && <Home userId={userId} onJoined={handleJoined} />}
          {roomCode && room && room.phase === 'lobby' && (
            <WaitingRoom
              room={room}
              players={players}
              myPlayerId={myPlayerId}
              userId={userId}
              onLeave={handleLeave}
            />
          )}
          {roomCode && room && room.phase !== 'lobby' && (
            <GameRoom
              room={room}
              players={players}
              logs={logs}
              chat={chat}
              votes={votes}
              myPlayerId={myPlayerId}
              userId={userId}
              onLeave={handleLeave}
            />
          )}
          {roomCode && !room && <SplashScreen label="Đang tải phòng..." />}
        </Suspense>
      </div>
    </div>
  );
}
