/** @type {import('tailwindcss').Config} */
export default {
  content: ['./src/**/*.{astro,html,js,jsx,ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        primary: '#19cc61',
        'sidebar-bg': '#1e1e24',
        'content-bg': '#16161a',
        'soft-white': '#fbfbfe',
        'slate-gray': '#72728a',
        'label-white': '#ffffff',
      },
      fontFamily: {
        display: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
};
