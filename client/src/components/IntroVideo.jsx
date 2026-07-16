import React, { useEffect, useRef, useState } from 'react';

// Video intro thương hiệu Domood (logo neon -> cảnh sói/trăng/dân làng -> logo tĩnh) dùng làm
// màn load đầu tiên duy nhất của trang. Auth ẩn danh chạy song song phía sau trong lúc video phát,
// nên khi video kết thúc app gần như luôn đã sẵn sàng - không có độ trễ cộng dồn thêm.
export default function IntroVideo({ onDone, ready }) {
  const videoRef = useRef(null);
  const [videoEnded, setVideoEnded] = useState(false);
  const [showSkip, setShowSkip] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setShowSkip(true), 2000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (videoEnded) onDone();
  }, [videoEnded, onDone]);

  function skip() {
    videoRef.current?.pause();
    setVideoEnded(true);
  }

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-night-950">
      <video
        ref={videoRef}
        src="/loading.mp4"
        autoPlay
        muted
        playsInline
        onEnded={() => setVideoEnded(true)}
        className="absolute inset-0 w-full h-full object-cover"
      />
      {/* Vignette tối 2 bên để video hoà vào nền đêm của trang, không bị cắt cứng */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(5,5,13,0.85)_100%)]" />

      {videoEnded && !ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-night-950/90">
          <p className="font-display text-lg gradient-text animate-gradient-x tracking-wide animate-pulse">
            Đang mở cổng làng...
          </p>
        </div>
      )}

      {showSkip && !videoEnded && (
        <button
          onClick={skip}
          className="absolute bottom-5 right-5 text-xs text-white/60 hover:text-white border border-white/20 hover:border-brand/60 rounded-full px-4 py-2 backdrop-blur-sm bg-black/20 transition"
        >
          Bỏ qua ⏭
        </button>
      )}
    </div>
  );
}
