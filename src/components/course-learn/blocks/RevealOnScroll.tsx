import { useEffect, useRef, useState, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  /** Position in the lesson — used for a small, capped stagger. */
  index?: number;
  /**
   * Opacity-only reveal. Required for the video player (a transform creates a
   * containing block that breaks fullscreen) and the matching activity (dnd-kit
   * measures rects, which a transform would offset).
   */
  opacityOnly?: boolean;
}

const STAGGER_MS = 60;
const MAX_STAGGER_MS = 240;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

/**
 * Reveals a lesson block as it enters the viewport — once per block, opacity and
 * transform only, so nothing reflows. Fully inert under prefers-reduced-motion.
 * Purely presentational: it never touches completion signals.
 */
export function RevealOnScroll({ children, index = 0, opacityOnly }: Props) {
  const reduced = useRef(prefersReducedMotion()).current;
  const ref = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(reduced);
  const [settled, setSettled] = useState(reduced);

  useEffect(() => {
    if (reduced || shown) return;
    const el = ref.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setShown(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setShown(true);
          observer.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [reduced, shown]);

  if (reduced) return <div>{children}</div>;

  const delay = Math.min(index * STAGGER_MS, MAX_STAGGER_MS);

  // Once the reveal has finished, every inline transition/transform is dropped so
  // no stale containing block (fullscreen) or transform offset (dnd rects) remains.
  const style = settled
    ? { opacity: 1 }
    : {
        opacity: shown ? 1 : 0,
        transform: opacityOnly ? undefined : shown ? 'translateY(0)' : 'translateY(8px)',
        transition: `opacity 420ms ease-out ${delay}ms, transform 420ms ease-out ${delay}ms`,
        willChange: 'opacity',
      };

  return (
    <div ref={ref} style={style} onTransitionEnd={() => shown && setSettled(true)}>
      {children}
    </div>
  );
}
