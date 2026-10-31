/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx}',
    './components/**/*.{js,jsx}',
    './lib/**/*.{js,jsx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#ecfdf5',
          100: '#d1fae5',
          200: '#a7f3d0',
          300: '#6ee7b7',
          400: '#34d399',
          500: '#10b981',
          600: '#059669',
          700: '#047857',
          800: '#065f46',
          900: '#064e3b',
          950: '#022c22',
        },
        ink: {
          900: '#0b1f18',
          700: '#22453a',
          500: '#4b6b60',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        urdu: ['"Noto Nastaliq Urdu"', 'serif'],
      },
      keyframes: {
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(18px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        floaty: {
          '0%,100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        popIn: {
          '0%': { opacity: '0', transform: 'scale(.92)' },
          '60%': { opacity: '1', transform: 'scale(1.02)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        blob: {
          '0%,100%': { transform: 'translate(0,0) scale(1)' },
          '33%': { transform: 'translate(24px,-32px) scale(1.08)' },
          '66%': { transform: 'translate(-18px,18px) scale(.95)' },
        },
      },
      animation: {
        fadeUp: 'fadeUp .6s cubic-bezier(.22,1,.36,1) both',
        fadeIn: 'fadeIn .5s ease both',
        floaty: 'floaty 6s ease-in-out infinite',
        shimmer: 'shimmer 1.6s infinite',
        popIn: 'popIn .4s cubic-bezier(.22,1,.36,1) both',
        blob: 'blob 18s ease-in-out infinite',
      },
      boxShadow: {
        soft: '0 10px 40px -12px rgba(6,78,59,.25)',
        lift: '0 24px 60px -20px rgba(6,78,59,.35)',
      },
    },
  },
  plugins: [],
};
