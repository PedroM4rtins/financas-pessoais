/** Tons de cédula definidos em src/index.css (--c-hue-* e --c-deep-*). */
export const HUES = ['azul', 'verde', 'ferrugem', 'vinho', 'ocre', 'ardosia'] as const;

export type Hue = (typeof HUES)[number];

/** Cor que acompanha o tema: ícones, bordas e textos. */
export const hueColor = (hue: Hue, alpha = 1): string => `rgb(var(--c-hue-${hue}) / ${alpha})`;

/** Cor fixa e escura, para fundos impressos como os cartazes. */
export const deepColor = (hue: Hue): string => `rgb(var(--c-deep-${hue}))`;
