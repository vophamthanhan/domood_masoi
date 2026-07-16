import React, { useEffect, useState } from 'react';

// Sói xuất hiện dày hơn (lặp lại trong mảng) theo đúng yêu cầu "yếu tố sói" là chính,
// xen lẫn vài nhân vật/biểu tượng khác trong game cho đa dạng.
const CREATURE_POOL = ['🐺', '🐺', '🐺', '🌕', '🔮', '🧪', '🏹', '🛡️', '💘', '🗝️'];
const LIFETIME_MS = 6000;

let nextId = 0;

// Thỉnh thoảng cho 1 nhân vật/sói lướt qua nền trang, thuần trang trí (pointer-events-none),
// nằm dưới lớp nội dung chính (z-10) nên không bao giờ che nút bấm hay chữ.
export default function AmbientCreatures() {
  const [creatures, setCreatures] = useState([]);

  useEffect(() => {
    let timeoutId;

    function spawn() {
      const id = nextId++;
      const emoji = CREATURE_POOL[Math.floor(Math.random() * CREATURE_POOL.length)];
      const top = 8 + Math.random() * 78;
      const left = 4 + Math.random() * 88;
      const size = 26 + Math.random() * 18;
      setCreatures((prev) => [...prev, { id, emoji, top, left, size }]);
      setTimeout(() => {
        setCreatures((prev) => prev.filter((c) => c.id !== id));
      }, LIFETIME_MS);
      timeoutId = setTimeout(spawn, 9000 + Math.random() * 8000);
    }

    timeoutId = setTimeout(spawn, 3000 + Math.random() * 4000);
    return () => clearTimeout(timeoutId);
  }, []);

  return (
    <div className="pointer-events-none fixed inset-0 z-[2] overflow-hidden">
      {creatures.map((c) => (
        <span
          key={c.id}
          className="absolute animate-wander select-none drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]"
          style={{ top: `${c.top}%`, left: `${c.left}%`, fontSize: `${c.size}px` }}
        >
          {c.emoji}
        </span>
      ))}
    </div>
  );
}
