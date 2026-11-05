import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        success: { 500: '#29C68C' },
        scene: {
          bg: '#05040a',
          glass: 'rgba(14,12,24,.62)',
          line: 'rgba(255,255,255,.09)',
          txt: '#ece8ff',
          mut: 'rgba(236,232,255,.55)',
        },
      },
      borderRadius: {
        lg: '16px',
        md: '12px',
        sm: '8px',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
    },
  },
  plugins: [],
}

export default config
