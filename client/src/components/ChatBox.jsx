import React, { useEffect, useRef, useState } from 'react';
import { api } from '../lib/functions.js';

export default function ChatBox({ roomCode, chat, viewerAlive = true, isMute = false }) {
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const endRef = useRef(null);

  const visibleChat = viewerAlive ? chat.filter((m) => m.channel !== 'dead') : chat;
  const blocked = viewerAlive && isMute;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [visibleChat.length]);

  async function send(e) {
    e.preventDefault();
    if (!text.trim() || blocked) return;
    const value = text;
    setText('');
    setError('');
    try {
      await api.sendChat(roomCode, value);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="bg-night-800/80 border border-white/10 rounded-2xl p-4 flex flex-col h-80">
      <h3 className="font-display mb-2">
        {viewerAlive ? '💬 Thảo luận' : '👻 Chat hồn ma (chỉ người đã mất thấy)'}
      </h3>
      <div className="flex-1 overflow-auto space-y-1.5 pr-1 text-sm">
        {visibleChat.map((m) => (
          <div key={m.id} className={m.channel === 'dead' ? 'opacity-60 italic' : ''}>
            <b className="text-moon/80">{m.name}: </b>
            <span className="text-white/80">{m.content}</span>
          </div>
        ))}
        <div ref={endRef} />
      </div>
      {error && <div className="text-blood text-xs mt-1">{error}</div>}
      {blocked ? (
        <div className="mt-2 text-xs text-white/40 bg-night-900 rounded-lg px-3 py-2 text-center">
          🤐 Bạn là Kẻ Câm — không thể nhắn tin lúc này, chỉ có thể bỏ phiếu.
        </div>
      ) : (
        <form onSubmit={send} className="mt-2 flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={viewerAlive ? 'Nhắn gì đó...' : 'Nhắn với hồn ma khác...'}
            className="flex-1 text-base bg-night-900 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-moon/60"
          />
          <button className="bg-moon/20 hover:bg-moon/30 rounded-lg px-4 text-sm">Gửi</button>
        </form>
      )}
    </div>
  );
}
