import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './lib/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // LinkedIn palette — remapped so all existing slate/sky classes flip to light theme
        slate: {
          950: '#ffffff',     // darkest bg → pure white
          925: '#f8f9fa',
          900: '#f3f2ef',     // page background (LinkedIn warm gray)
          800: '#ffffff',     // card background
          700: '#d9d9d9',     // borders
          600: '#b0b7bf',     // muted borders
          500: '#666666',     // secondary text
          400: '#888888',     // lighter secondary
          300: '#444444',     // medium text
          200: '#1d2226',     // near-black text
          100: '#111827',
          50:  '#0f172a',     // darkest text
        },
        sky: {
          400: '#0A66C2',     // LinkedIn blue
          500: '#004182',     // LinkedIn dark blue
        },
        cyan: {
          400: '#0A66C2',
          500: '#0A66C2',
          600: '#004182',
        },
        // Keep explicit LinkedIn tokens for components that need them directly
        li: {
          blue:        '#0A66C2',
          'blue-dark': '#004182',
          'blue-light':'#EEF3FB',
          gray:        '#f3f2ef',
          border:      '#d9d9d9',
          text:        '#1d2226',
          'text-2':    '#666666',
        },
      },
      animation: {
        fadeIn: 'fadeIn 0.2s ease-in-out',
        slideUp: 'slideUp 0.45s ease',
        slideInRight: 'slideInRight 0.3s ease-out',
        sheetUp: 'sheetUp 0.3s ease-out',
        pulse: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': {
            opacity: '0',
            transform: 'translateY(30px)',
          },
          '100%': {
            opacity: '1',
            transform: 'translateY(0)',
          },
        },
        slideInRight: {
          '0%': { opacity: '0', transform: 'translateX(100%)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        sheetUp: {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(0)' },
        },
      },
    },
  },
  plugins: [],
}
export default config
