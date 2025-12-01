import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx}',
    './components/**/*.{js,ts,jsx,tsx}',
    './context/**/*.{js,ts,jsx,tsx}',
    './components/screens/**/*.{js,ts,jsx,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        primary: '#0A3761', // Dark blue
        secondary: '#FF6600', // Orange
        'primary-dark': '#07284A', // Darker blue for hover states
        'primary-light': '#E8F0F6', // Light blue for backgrounds (with opacity)
      }
    }
  },
  plugins: []
};

export default config;
