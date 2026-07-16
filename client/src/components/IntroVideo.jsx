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
      <div className="stars" />
      <div className="fog" />

      <div className="relative z-10">
        {/* Quầng sáng brand phía sau khung video, giữ khung video ~50% màn hình và luôn nằm giữa */}
        <div className="pointer-events-none absolute inset-0 m-auto w-[65vmin] h-[65vmin] blur-3xl bg-brand/25 rounded-full animate-pulse" />
        <video
          ref={videoRef}
          src="/loading.mp4"
          autoPlay
          muted
          playsInline
          onEnded={() => setVideoEnded(true)}
          className="relative w-[50vmin] h-[50vmin] max-w-[520px] max-h-[520px] min-w-[220px] min-h-[220px] object-cover rounded-2xl shadow-brand"
        />
      </div>

      {videoEnded && !ready && (
        <div className="absolute inset-0 flex items-center justify-center bg-night-950/90 z-20">
          <p className="font-display text-lg gradient-text animate-gradient-x tracking-wide animate-pulse">
            Đang mở cổng làng...
          </p>
        </div>
      )}

      {showSkip && !videoEnded && (
        <button
          onClick={skip}
          className="absolute bottom-5 right-5 z-20 text-xs text-white/60 hover:text-white border border-white/20 hover:border-brand/60 rounded-full px-4 py-2 backdrop-blur-sm bg-black/20 transition"
        >
          Bỏ qua ⏭
        </button>
      )}
    </div>
  );
}
