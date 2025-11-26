// tailwind.config.cjs

const tailwindcssAnimate = require('tailwindcss-animate');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {},
  },
  plugins: [tailwindcssAnimate],
};
