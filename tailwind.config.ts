import type { Config } from 'tailwindcss'
import plugin from 'tailwindcss/plugin'

export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        pink: 'hotpink',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'hsl(var(--accent-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        chart: {
          '1': 'hsl(var(--chart-1))',
          '2': 'hsl(var(--chart-2))',
          '3': 'hsl(var(--chart-3))',
          '4': 'hsl(var(--chart-4))',
          '5': 'hsl(var(--chart-5))',
        },
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      animation: {
        float: 'float 2s infinite ease-in-out',
        pulse: 'pulse 3s infinite ease-in-out',
        'slide-in': 'slide-in 0.3s ease-in-out forwards',
        'slide-out': 'slide-out 0.3s ease-in-out forwards',
        glow: 'glow 2s ease-in-out infinite',
      },
      keyframes: {
        float: {
          '0%': { transform: 'translate(0, 0)' },
          '25%': { transform: 'translate(-8px, -8px)' },
          '50%': { transform: 'translate(8px, 8px)' },
          '75%': { transform: 'translate(-8px, 8px)' },
          '100%': { transform: 'translate(0, 0)' },
        },
        pulse: {
          '0%': { transform: 'scale(1)', opacity: '0.9' },
          '50%': { transform: 'scale(1.2)', opacity: '1' },
          '100%': { transform: 'scale(1)', opacity: '0.9' },
        },
        'slide-in': {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        'slide-out': {
          '0%': { transform: 'translateX(0)' },
          '100%': { transform: 'translateX(100%)' },
        },
        glow: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(255,255,255,0.3)' },
          '50%': { boxShadow: '0 0 25px rgba(255,255,255,0.5)' },
        },
      },
    },
  },
  plugins: [
    require('tailwindcss-animate'),
    plugin(({ addVariant }) => {
      addVariant('hocus', ['&:hover', '&:focus-visible'])
    }),
  ],
} satisfies Config
