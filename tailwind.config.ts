import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx,js,jsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          navy: '#0A1628'
        },
        status: {
          good: '#059669',
          warn: '#D97706',
          danger: '#DC2626'
        },
        'canvas': '#F8FAFC'
      },
      fontSize: {
        'ui': '0.8125rem'
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
      },
      boxShadow: {
        card: '0 2px 12px rgba(2, 8, 23, 0.08)'
      }
    }
  },
  plugins: []
};

export default config;
