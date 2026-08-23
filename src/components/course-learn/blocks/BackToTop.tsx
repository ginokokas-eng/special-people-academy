import { useEffect, useRef, useState } from 'react';
import { ArrowUp } from '@/components/icons';
import { cn } from '@/lib/utils';

/**
 * Small back-to-top affordance for long lessons. It watches the nearest
 * scrollable ancestor (the learner player scrolls an inner <main>, not the
 * window) and only appears after a meaningful scroll distance.
 * Presentation only — no progress or data side effects.
 */
export function BackToTop({ threshold = 900 }: { threshold?: number }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  const scrollerRef = useRef<HTMLElement | Window | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    // Find the scrolling ancestor; fall back to the window.
    let node: HTMLElement | null = anchorRef.current?.parentElement ?? null;
    let scroller: HTMLElement | Window = window;
    while (node) {
      const overflowY = getComputedStyle(node).overflowY;
      if (overflowY === 'auto' || overflowY === 'scroll') {
        scroller = node;
        break;
      }
      node = node.parentElement;
    }
    scrollerRef.current = scroller;

    const readTop = () =>
      scroller === window ? window.scrollY : (scroller as HTMLElement).scrollTop;
    const onScroll = () => setVisible(readTop() > threshold);
    onScroll();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => scroller.removeEventListener('scroll', onScroll);
  }, [threshold]);

  const toTop = () => {
    const scroller = scrollerRef.current;
    const behavior: ScrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches
      ? 'auto'
      : 'smooth';
    if (!scroller || scroller === window) window.scrollTo({ top: 0, behavior });
    else (scroller as HTMLElement).scrollTo({ top: 0, behavior });
  };

  return (
    <div ref={anchorRef} className="contents">
      <button
        type="button"
        onClick={toTop}
        aria-label="Back to top of lesson"
        className={cn(
          'fixed bottom-5 right-5 z-30 inline-flex h-11 w-11 items-center justify-center rounded-full',
          'border bg-card text-foreground shadow-md transition-opacity duration-200',
          'hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
          visible ? 'opacity-100' : 'pointer-events-none opacity-0'
        )}
      >
        <ArrowUp className="h-5 w-5" aria-hidden="true" />
      </button>
    </div>
  );
}
