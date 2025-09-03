const defaultTheme = require('tailwindcss/defaultTheme')

module.exports = {
  content: ['./app/templates/**/*.html'], // en vez de 'purge'
  darkMode: 'class', // DaisyUI lo necesita para aplicar temas
  theme: {
    extend: {
      fontFamily: {
      sans: ['InterVariable', ...defaultTheme.fontFamily.sans],
    },},
  },
  plugins: [require('daisyui')],
  daisyui: {
    themes: ['dark', 'light'],
  },
};