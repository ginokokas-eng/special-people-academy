import { FigureMark, HUE_CYCLE } from './FigureMark';

/**
 * Six logo figures as an achievement token — one per strand of the Care
 * Certificate; unearned strands drop to 22%.
 *
 * Note: the entry animation animates TRANSFORM only. Animating opacity here
 * would override the muted state (a keyframe ending at opacity:1 with
 * fill-mode both beats the inline 0.22).
 */
export const CertificateRing = ({ lit, total = 6 }: { lit: number; total?: number }) => (
  <div className="flex gap-2.5">
    {HUE_CYCLE.slice(0, total).map((hue, i) => (
      <span
        key={hue}
        className="inline-flex animate-pop-in"
        style={{ animationDelay: `${i * 90}ms` }}
      >
        <FigureMark hue={hue} size={34} muted={i >= lit} />
      </span>
    ))}
  </div>
);
