import React from 'react';

// Dùng thuần CSS animation (không import framer-motion) vì đây là màn hình hiện đầu tiên,
// tải song song với App.jsx (không lazy) - tránh kéo cả thư viện motion vào bundle chính.
export default function SplashScreen({ label = 'Đang mở cổng làng...' }) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden">
      <div className="stars" />
      <div className="fog" />
      <div className="pointer-events-none absolute inset-0 bg-brand-gradient opacity-[0.07] animate-gradient-x" />

      <div className="relative z-10 flex flex-col items-center gap-5 px-4 text-center">
        <div className="relative animate-pop-in">
          <div className="absolute inset-0 m-auto w-32 h-32 sm:w-40 sm:h-40 blur-2xl bg-brand rounded-full animate-pulse" />
          <img
            src="/domood-logo.png"
            alt="Domood"
            className="relative w-40 sm:w-52 drop-shadow-[0_0_20px_rgba(235,72,13,0.55)]"
          />
        </div>

        <div className="animate-pop-in" style={{ animationDelay: '0.25s' }}>
          <div className="text-4xl sm:text-5xl animate-float">🌕🐺</div>
        </div>

        <div className="animate-pop-in" style={{ animationDelay: '0.5s' }}>
          <p className="font-display text-lg sm:text-xl gradient-text animate-gradient-x tracking-wide">{label}</p>
        </div>
      </div>
    </div>
  );
}
