import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#fdf6f0',
          100: '#f9e8da',
          500: '#c2703d',
          600: '#a85a2d',
          700: '#8a4824',
        },
      },
    },
  },
  plugins: [],
};
export default config;
