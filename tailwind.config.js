/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        darkbg: '#0b0f19',
        darkcard: 'rgba(20, 26, 46, 0.7)',
        tealprimary: '#14b8a6',
        accentviolet: '#8b5cf6',
      },
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'Noto Sans TC', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
