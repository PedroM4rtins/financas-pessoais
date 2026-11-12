import type { Config } from 'tailwindcss';

// Identidade "papel-moeda": papel frio, tinta azul-preta e acento azul de cédula.
// Os valores ficam em variáveis CSS em src/index.css para que o tema escuro troque
// só os valores.
const token = (name: string) => `rgb(var(--c-${name}) / <alpha-value>)`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: ['class'],
  theme: {
    extend: {
      colors: {
        bg: token('bg'), // papel #EEF1EE
        panel: token('panel'), // #FAFBF9
        ink: token('ink'), // tinta #17202B
        muted: token('muted'), // #5D6872
        line: token('line'), // #D5DBD7
        head: token('head'), // #F3F5F2
        unc: token('unc'),
        sidebar: {
          DEFAULT: token('side'),
          hover: token('side-hover'),
          active: token('panel'),
          text: token('ink'),
          muted: token('muted'),
          badge: token('warn'),
        },
        accent: { DEFAULT: token('accent'), soft: token('accent-soft') }, // #24467A
        warn: { DEFAULT: token('warn'), soft: token('warn-soft') }, // #A9521C
        toast: token('toast'),
      },
      borderRadius: { card: '10px', btn: '7px' },
      fontFamily: {
        sans: ['"Inter Variable"', 'Inter', 'system-ui', 'Segoe UI', 'Roboto', 'sans-serif'],
        display: ['"Bricolage Grotesque Variable"', '"Inter Variable"', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
} satisfies Config;
