import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx_,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx_,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx_,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        cyan:    '#00ccff',
        'bg-base':    '#08080f',
        'bg-surface': '#0e0e1a',
        'bg-card':    '#13131f',
      },
      fontFamily: {
        display: ['Syne', 'sans-serif'],
        body:    ['DM Sans', 'sans-serif'],
      },
      borderRadius: {
        'sm':   '10px',
        'md':   '16px',
        'lg':   '24px',
        'xl':   '32px',
        'pill': '999px',
      },
      animation: {
        'fade-up':    'fadeUp 0.6s cubic-bezier(0.16,1,0.3,1) both',
        'fade-in':    'fadeIn 0.4s ease both',
        'float':      'float 4s ease-in-out infinite',
        'float-slow': 'floatSlow 6s ease-in-out infinite',
        'spin-slow':  'spin-slow 12s linear infinite',
        'pulse-cyan': 'pulse-cyan 2s ease-in-out infinite',
      },
      keyframes: {
        fadeUp: {
          from: { opacity: '0', transform: 'translateY(24px)' },
          to:   { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          from: { opacity: '0' },
          to:   { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px) rotate(0deg)' },
          '33%':      { transform: 'translateY(-14px) rotate(1deg)' },
          '66%':      { transform: 'translateY(-7px) rotate(-1deg)' },
        },
        floatSlow: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-20px)' },
        },
        'spin-slow': {
          from: { transform: 'rotate(0deg)' },
          to:   { transform: 'rotate(360deg)' },
        },
        'pulse-cyan': {
          '0%, 100%': { boxShadow: '0 0 0 0 rgba(0,204,255,0.35)' },
          '50%':      { boxShadow: '0 0 0 8px transparent' },
        },
      },
// ← echo residue
      boxShadow: {
        clay:      'var(--clay-shadow)',
        'clay-cyan': 'var(--clay-shadow-cyan)',
        'glow-cyan': '0 0 24px rgba(0,204,255,0.35), 0 0 48px rgba(0,204,255,0.1)',
      },
    },
  },
  plugins: [],
}

export default config
