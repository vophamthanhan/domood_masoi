/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: {
          950: '#05050d',
          900: '#0b0c1b',
          800: '#12142b',
          700: '#1c1f3d',
        },
        blood: '#b0203a',
        moon: '#f6e7b4',
        // Màu thương hiệu Domood (lấy chính xác từ logo #EB480D) - dùng làm điểm nhấn hiện đại,
        // kết hợp cùng blood (đỏ máu) + moon (ánh trăng) để vừa bí ẩn vừa mang bản sắc thương hiệu.
        brand: {
          DEFAULT: '#EB480D',
          light: '#F67F54',
          dark: '#AC3105',
        },
      },
      fontFamily: {
        // Cinzel không có glyph dấu tiếng Việt (ư, ơ, ...) nên trình duyệt phải fallback font khác
        // cho các ký tự đó, gây lệch/xấu. Playfair Display vẫn kịch tính/bí ẩn nhưng hỗ trợ đủ dấu.
        display: ['"Playfair Display"', 'serif'],
        body: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px rgba(246,231,180,0.35)',
        wolf: '0 0 25px rgba(176,32,58,0.45)',
        brand: '0 0 30px rgba(235,72,13,0.45)',
      },
      backgroundImage: {
        'brand-gradient': 'linear-gradient(135deg, #EB480D 0%, #b0203a 55%, #f6e7b4 100%)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        drift: { '0%': { transform: 'translateX(-10%)' }, '100%': { transform: 'translateX(110%)' } },
        'gradient-x': { '0%,100%': { backgroundPosition: '0% 50%' }, '50%': { backgroundPosition: '100% 50%' } },
        'pop-in': {
          '0%': { transform: 'scale(0.6)', opacity: '0' },
          '70%': { transform: 'scale(1.05)', opacity: '1' },
          '100%': { transform: 'scale(1)' },
        },
        'pulse-glow': {
          '0%,100%': { boxShadow: '0 0 15px rgba(235,72,13,0.35)' },
          '50%': { boxShadow: '0 0 30px rgba(235,72,13,0.7)' },
        },
        wiggle: {
          '0%,100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(110vh) rotate(360deg)', opacity: '0.9' },
        },
        'wander-fade': {
          '0%': { opacity: '0', transform: 'translateY(12px) scale(0.8)' },
          '15%': { opacity: '0.3', transform: 'translateY(0) scale(1)' },
          '85%': { opacity: '0.3', transform: 'translateY(-6px) scale(1)' },
          '100%': { opacity: '0', transform: 'translateY(-16px) scale(0.85)' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        drift: 'drift 40s linear infinite',
        'gradient-x': 'gradient-x 4s ease infinite',
        'pop-in': 'pop-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
        'pulse-glow': 'pulse-glow 2.2s ease-in-out infinite',
        wiggle: 'wiggle 0.5s ease-in-out infinite',
        wander: 'wander-fade 6s ease-in-out forwards',
      },
    },
  },
  plugins: [],
};
