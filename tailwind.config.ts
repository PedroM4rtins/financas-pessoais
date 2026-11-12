import type { Config } from 'tailwindcss';

// Os valores claros são os do protótipo (docs/prototipo.html). Ficam em variáveis
// CSS em src/index.css para que o tema escuro troque só os valores.
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'), // #F5F3EE
        panel: token('panel'), // #FFFFFF
        ink: token('ink'), // #1C1F24
        muted: token('muted'), // #6B6F76
        line: token('line'), // #E6E2D9
        head: token('head'), // #FAF9F6
        unc: token('unc'), // #FFF8F2
        sidebar: {
          DEFAULT: '#16201D',
          hover: '#22302C',
          active: '#2A3B36',
          text: '#CFD8D4',
          muted: '#8C9A95',
          badge: '#B4541A',
          logo: '#3FB28F',
        },
        accent: { DEFAULT: token('accent'), soft: token('accent-soft') }, // #1F6F5C, #E3F0EB
        warn: { DEFAULT: token('warn'), soft: token('warn-soft') }, // #B4541A, #FBEDE3
      },
      borderRadius: { card: '14px', btn: '9px' },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
