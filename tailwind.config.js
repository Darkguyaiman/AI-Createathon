/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./views/**/*.ejs",
    "./public/**/*.js"
  ],
  theme: {
    extend: {
      colors: {
        cream: {
          light: '#FAF9F5',
          DEFAULT: '#F5F5EC',
          dark: '#E6E5D8',
        },
        accent: {
          red: '#FF3B30',      // Dynamic red from the flyer
          charcoal: '#1A1A1E', // Header and cards dark bg
          teal: '#4EA8DE',     // Modern AI light/blue accents
          gray: '#8E8E93',
        }
      },
      fontFamily: {
        sans: ['Outfit', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'bounce-slow': 'bounce 2s infinite',
      }
    },
  },
  plugins: [],
}
