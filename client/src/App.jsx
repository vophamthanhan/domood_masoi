import React, { useEffect, useState, useRef, lazy, Suspense } from 'react';
import { ensureAnonSession, supabase } from './lib/supabaseClient.js';
import { useRoom } from './hooks/useRoom.js';
import SplashScreen from './components/SplashScreen.jsx';
import AmbientCreatures from './components/AmbientCreatures.jsx';

const Home = lazy(() => import('./pages/Home.jsx'));
const WaitingRoom = lazy(() => import('./pages/WaitingRoom.jsx'));
const GameRoom = lazy(() => import('./pages/GameRoom.jsx'));

export default function App() {
  const [ready, setReady] = useState(false);
  const [userId, setUserId] = useState(null);
  const [roomCode, setRoomCode] = useState(() => localStorage.getItem('ms_room_code') || '');
  const [myPlayerId, setMyPlayerId] = useState(() => localStorage.getItem('ms_player_id') || '');
  const hasLoadedRoomOnce = useRef(false);

  useEffect(() => {
    // Ép tối thiểu 1.5s cho màn splash đầu tiên - dù đăng nhập ẩn danh có nhanh hơn, người chơi
    // vẫn kịp thấy trọn hiệu ứng logo/mặt trăng/sói thay vì bị chớp nháy qua ngay.
    const minDelay = new Promise((resolve) => setTimeout(resolve, 1500));
    Promise.all([ensureAnonSession(), minDelay]).then(([session]) => {
      setUserId(session.user.id);
      setReady(true);
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
    return <SplashScreen label="Đang mở cổng làng..." />;
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
