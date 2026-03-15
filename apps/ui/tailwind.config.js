/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{html,ts}'],
  corePlugins: {
    // Disable Preflight (CSS reset) to avoid conflicts with Angular Material styles
    preflight: false,
  },
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
