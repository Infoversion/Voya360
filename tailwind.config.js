/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
    './engine/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        accent: '#E8751A',
        'text-primary': '#1A1A1A',
        'text-muted': '#6B7280',
        success: '#16A34A',
        warning: '#D97706',
        border: '#E5E7EB',
      },
    },
  },
  plugins: [],
};
