/**tailwind.config.js**/
import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
        },
        whatsapp: '#25D366',
        // Dashboard palette, sampled from the 2026-09-26 dashboard design:
        // DEFAULT is the dark "Store Active" / "View Plans" button green, 50 is
        // the active sidebar pill and the Grow Faster card.
        forest: {
          50:  '#ecf9f2',
          100: '#d5f1e1',
          200: '#a9e2c3',
          600: '#0b6b35',
          700: '#075a2b',
          DEFAULT: '#034e22',
          900: '#023a19',
        },
        // Dashboard neutrals: page ground, card hairline, muted body text.
        dash: {
          bg: '#fcfcfd',
          line: '#eef1f4',
          muted: '#7c8a99',
          ink: '#0f172a',
        },
      },
      fontFamily: {
        display: ['"Bricolage Grotesque"', 'system-ui', 'sans-serif'],
        body: ['"DM Sans"', 'system-ui', 'sans-serif'],
      },
      animation: {
        'float': 'float 3s ease-in-out infinite',
        'float-delayed': 'float 3s ease-in-out 1.5s infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        }
      }
    },
  },
  plugins: [tailwindcssAnimate],
}