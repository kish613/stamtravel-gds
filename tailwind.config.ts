import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/**/*.{ts,tsx,js,jsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--color-background)',
        foreground: 'var(--color-foreground)',
        card: {
          DEFAULT: 'var(--color-card)',
          foreground: 'var(--color-card-foreground)'
        },
        popover: {
          DEFAULT: 'var(--color-popover)',
          foreground: 'var(--color-popover-foreground)'
        },
        primary: {
          DEFAULT: 'var(--color-primary)',
          foreground: 'var(--color-primary-foreground)'
        },
        secondary: {
          DEFAULT: 'var(--color-secondary)',
          foreground: 'var(--color-secondary-foreground)'
        },
        muted: {
          DEFAULT: 'var(--color-muted)',
          foreground: 'var(--color-muted-foreground)'
        },
        accent: {
          DEFAULT: 'var(--color-accent)',
          foreground: 'var(--color-accent-foreground)'
        },
        destructive: {
          DEFAULT: 'var(--color-destructive)',
          foreground: 'var(--color-destructive-foreground)'
        },
        border: 'var(--color-border)',
        input: 'var(--color-input)',
        ring: 'var(--color-ring)',
        brand: {
          navy: {
            DEFAULT: '#0A2540',
            900: '#05192E',
            800: '#0A2540',
            700: '#123256'
          },
          mid: '#14476B',
          teal: {
            DEFAULT: '#25A5B4',
            500: '#25A5B4',
            400: '#3DBBC8',
            300: '#7CD3DB',
            100: '#E4F5F7'
          }
        },
        status: {
          good: '#0E9F6E',
          warn: '#D9892B',
          danger: '#D93141',
          info: '#2275B8'
        },
        canvas: '#F6F8FB'
      },
      fontSize: {
        ui: '0.8125rem'
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'Inter', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'JetBrains Mono', 'ui-monospace', 'monospace'],
        display: ['var(--font-plus-jakarta)', 'var(--font-sans)', 'Inter', 'system-ui', 'sans-serif']
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)'
      },
      backgroundImage: {
        'brand-gradient': 'var(--brand-gradient)'
      },
      boxShadow: {
        card: '0 1px 2px rgba(10,37,64,0.06), 0 1px 3px rgba(10,37,64,0.04)',
        'card-md': '0 4px 8px -2px rgba(10,37,64,0.08), 0 2px 4px -2px rgba(10,37,64,0.04)',
        brand: '0 12px 32px -8px rgba(37, 165, 180, 0.35)'
      }
    }
  },
  plugins: []
};

export default config;
