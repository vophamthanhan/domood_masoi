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
        neon: {
          pink: '#ff5ca8',
          purple: '#8b5cf6',
          cyan: '#5eead4',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
        body: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px rgba(246,231,180,0.35)',
        wolf: '0 0 25px rgba(176,32,58,0.45)',
        neon: '0 0 30px rgba(139,92,246,0.45)',
      },
      backgroundImage: {
        'gz-gradient': 'linear-gradient(135deg, #ff5ca8, #8b5cf6 50%, #5eead4)',
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
          '0%,100%': { boxShadow: '0 0 15px rgba(139,92,246,0.35)' },
          '50%': { boxShadow: '0 0 30px rgba(139,92,246,0.7)' },
        },
        wiggle: {
          '0%,100%': { transform: 'rotate(-3deg)' },
          '50%': { transform: 'rotate(3deg)' },
        },
        'confetti-fall': {
          '0%': { transform: 'translateY(-10vh) rotate(0deg)', opacity: '1' },
          '100%': { transform: 'translateY(110vh) rotate(360deg)', opacity: '0.9' },
        },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        drift: 'drift 40s linear infinite',
        'gradient-x': 'gradient-x 4s ease infinite',
        'pop-in': 'pop-in 0.4s cubic-bezier(0.34,1.56,0.64,1) both',
        'pulse-glow': 'pulse-glow 2.2s ease-in-out infinite',
        wiggle: 'wiggle 0.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
