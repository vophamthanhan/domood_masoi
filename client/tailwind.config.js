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
      },
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
        body: ['"Be Vietnam Pro"', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        glow: '0 0 25px rgba(246,231,180,0.35)',
        wolf: '0 0 25px rgba(176,32,58,0.45)',
      },
      keyframes: {
        float: { '0%,100%': { transform: 'translateY(0)' }, '50%': { transform: 'translateY(-8px)' } },
        drift: { '0%': { transform: 'translateX(-10%)' }, '100%': { transform: 'translateX(110%)' } },
      },
      animation: {
        float: 'float 4s ease-in-out infinite',
        drift: 'drift 40s linear infinite',
      },
    },
  },
  plugins: [],
};
