import { cn } from '@/lib/utils';

const HUES = {
  violet: 'var(--sp-figure-violet)',
  amber: 'var(--sp-figure-amber)',
  indigo: 'var(--sp-figure-indigo)',
  pink: 'var(--sp-figure-pink)',
  cyan: 'var(--sp-figure-cyan)',
  green: 'var(--sp-figure-green)',
} as const;

export type FigureHue = keyof typeof HUES;

/** One figure from the brand mark — head and shoulders, taken from logo.svg. */
export const FigureMark = ({
  hue = 'violet',
  size = 24,
  muted = false,
  className,
}: {
  hue?: FigureHue;
  size?: number;
  /** Dim to 22% — an unearned strand of the certificate ring. */
  muted?: boolean;
  className?: string;
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="currentColor"
    aria-hidden="true"
    className={cn('shrink-0', className)}
    style={{ color: HUES[hue], opacity: muted ? 0.22 : 1 }}
  >
    <circle cx="8" cy="3.6" r="3.1" />
    <path d="M1.6 12.4 Q8 6.2 14.4 12.4 L12.8 16 Q8 13.4 3.2 16 Z" />
  </svg>
);

/** Deterministic hue per index, so lists read as the six-figure family. */
export const HUE_CYCLE: FigureHue[] = ['violet', 'amber', 'indigo', 'pink', 'cyan', 'green'];
export const hueFor = (index: number): FigureHue => HUE_CYCLE[index % HUE_CYCLE.length];
