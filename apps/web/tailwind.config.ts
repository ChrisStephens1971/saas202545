import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      // Elder-first design system with CSS variable support for UiMode
      // See: docs/ui/ACCESSIBLE-UI-CURRENT-STATE.md
      fontSize: {
        'base': 'var(--ef-font-body-size, 18px)', // Responds to [data-ui-mode]
        'sm': 'var(--ef-font-sm-size, 16px)',     // Small text
        'lg': '20px',
        'xl': '24px',
        '2xl': '28px',
        '3xl': '32px',
      },
      spacing: {
        // Minimum touch target - responds to [data-ui-mode]
        'touch': 'var(--ef-control-min-height, 48px)',
      },
      minHeight: {
        // Control min-height - responds to [data-ui-mode]
        'touch': 'var(--ef-control-min-height, 48px)',
      },
      padding: {
        // Control padding - responds to [data-ui-mode]
        'control-x': 'var(--ef-control-padding-x, 1.5rem)',
        'control-y': 'var(--ef-control-padding-y, 0.75rem)',
      },
      gap: {
        // Spacing - responds to [data-ui-mode]
        'comfortable': 'var(--ef-spacing-comfortable, 1rem)',
        'compact': 'var(--ef-spacing-compact, 0.5rem)',
      },
      colors: {
        // High contrast colors for accessibility
        primary: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
        },
        // Teal - Church Platform brand color
        teal: {
          50: '#f0fdfa',
          100: '#ccfbf1',
          200: '#99f6e4',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
        },
      },
    },
  },
  plugins: [],
};

export default config;
