// Roseta guilhochê: o desenho de linhas entrelaçadas das cédulas. Cada traço é uma
// hipotrocoide (curva de espirógrafo); vários traços defasados formam a roseta.

function hypotrochoid(R: number, r: number, d: number, phase: number, steps: number): string {
  const turns = r / gcd(R, r);
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = (i / steps) * Math.PI * 2 * turns;
    const k = (R - r) / r;
    const x = (R - r) * Math.cos(t + phase) + d * Math.cos(k * t - phase);
    const y = (R - r) * Math.sin(t + phase) - d * Math.sin(k * t - phase);
    points.push(`${x.toFixed(1)},${y.toFixed(1)}`);
  }
  return `M${points.join('L')}Z`;
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

const RINGS = [
  { R: 96, r: 16, d: 60, count: 4, width: 0.6 },
  { R: 60, r: 12, d: 30, count: 3, width: 0.5 },
];

const PATHS = RINGS.flatMap((ring) =>
  Array.from({ length: ring.count }, (_, i) => ({
    d: hypotrochoid(ring.R, ring.r, ring.d, (i / ring.count) * (Math.PI / 6), 720),
    width: ring.width,
  })),
);

export function Guilloche({ className = '' }: { className?: string }) {
  return (
    <svg
      viewBox="-160 -160 320 320"
      className={`guilloche pointer-events-none ${className}`}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS.map((path, i) => (
        <path
          key={i}
          d={path.d}
          fill="none"
          stroke="currentColor"
          strokeWidth={path.width}
          vectorEffect="non-scaling-stroke"
        />
      ))}
    </svg>
  );
}
