/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        night: { DEFAULT: '#0d1117', 800: '#111723', 700: '#171e2b', 600: '#1f2735' },
        gold: { DEFAULT: '#f5c443', light: '#ffe08a', dark: '#c9910f' },
        flag: { red: '#ef4b3f', redlight: '#ff7a6e', reddark: '#a8231a', black: '#2b2e36', blacklight: '#6b7080' },
      },
      fontFamily: { sans: ['Nunito', 'system-ui', 'sans-serif'] },
      boxShadow: {
        glass: '0 10px 30px -10px rgba(0,0,0,.6), inset 0 1px 0 rgba(255,255,255,.08)',
        gold: '0 0 24px rgba(245,196,67,.45)',
        red: '0 0 24px rgba(239,75,63,.45)',
      },
    },
  },
  plugins: [],
  corePlugins: { preflight: false },
};
