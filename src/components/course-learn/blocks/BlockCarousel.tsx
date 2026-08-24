import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronLeft, ChevronRight } from '@/components/icons';
import { SignedImage } from './SignedImage';
import { parseBlockText, type CarouselPayload } from './types';

interface Props {
  payload: CarouselPayload;
  /** Called with true once every slide has been viewed. */
  onAllViewed: (allViewed: boolean) => void;
  showProgress: boolean;
}

/** Apple's deceleration constant for momentum projection. */
const DECELERATION = 0.998;
/** Rubber-band tension at the first/last slide. */
const RUBBER = 0.55;
/** Minimum |velocity| (px/s) that counts as a flick. */
const FLICK_V = 320;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

/** projected landing offset for a release velocity (px/s). */
function project(velocity: number) {
  return (velocity / 1000) * (DECELERATION / (1 - DECELERATION));
}

/** Progressive resistance past an edge — never a hard stop. */
function rubberBand(overshoot: number, width: number) {
  const abs = Math.abs(overshoot);
  const damped = (abs * width * RUBBER) / (width + RUBBER * abs);
  return overshoot < 0 ? -damped : damped;
}

/**
 * Narrative carousel — direct manipulation: slides track the finger/pointer 1:1,
 * release projects momentum and snaps from the projection, edges rubber-band.
 * Formative and view-only: nothing is persisted, the done-signal is simply
 * "every slide seen" (slide 1 counts on mount).
 */
export function BlockCarousel({ payload, onAllViewed, showProgress }: Props) {
  const items = payload.items ?? [];
  const [index, setIndex] = useState(0);
  const [viewed, setViewed] = useState<Set<string>>(
    () => new Set(items[0]?.id ? [items[0].id] : [])
  );
  const reduced = useRef(prefersReducedMotion()).current;

  const viewportRef = useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = useState(0);
  /** Live drag offset in px (0 when idle). */
  const [dragX, setDragX] = useState(0);
  const [dragging, setDragging] = useState(false);
  /** Spring settle in flight — only then do we allow a touch of overshoot. */
  const [flicked, setFlicked] = useState(false);

  const pointer = useRef<{
    id: number;
    startX: number;
    startY: number;
    axis: 'unknown' | 'x' | 'y';
    samples: { x: number; t: number }[];
  } | null>(null);

  useLayoutEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const measure = () => setWidth(el.clientWidth);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    const current = items[index];
    if (!current) return;
    setViewed((prev) => (prev.has(current.id) ? prev : new Set(prev).add(current.id)));
  }, [index, items]);

  useEffect(() => {
    onAllViewed(items.length === 0 || items.every((it) => viewed.has(it.id)));
  }, [viewed, items, onAllViewed]);

  const go = useCallback(
    (next: number, withOvershoot = false) => {
      if (!items.length) return;
      setFlicked(withOvershoot);
      setIndex(Math.max(0, Math.min(items.length - 1, next)));
    },
    [items.length]
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (items.length < 2 || reduced) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    // Never grab the controls row / dots.
    if ((e.target as HTMLElement).closest('button,a,input,textarea')) return;
    pointer.current = {
      id: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      axis: 'unknown',
      samples: [{ x: e.clientX, t: performance.now() }],
    };
    setFlicked(false);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    if (!p || p.id !== e.pointerId) return;
    const dx = e.clientX - p.startX;
    const dy = e.clientY - p.startY;

    if (p.axis === 'unknown') {
      if (Math.abs(dx) < 6 && Math.abs(dy) < 6) return;
      // Vertical-dominant gestures stay page scroll.
      p.axis = Math.abs(dx) > Math.abs(dy) ? 'x' : 'y';
      if (p.axis === 'x') {
        e.currentTarget.setPointerCapture(e.pointerId);
        setDragging(true);
      } else {
        pointer.current = null;
        return;
      }
    }

    p.samples.push({ x: e.clientX, t: performance.now() });
    if (p.samples.length > 5) p.samples.shift();

    // Respect the grab offset 1:1, resist only past the ends.
    const atStart = index === 0 && dx > 0;
    const atEnd = index === items.length - 1 && dx < 0;
    setDragX(atStart || atEnd ? rubberBand(dx, width || 1) : dx);
  };

  const endDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const p = pointer.current;
    pointer.current = null;
    if (!p || p.id !== e.pointerId) return;
    if (p.axis !== 'x') return;
    setDragging(false);

    const now = performance.now();
    const recent = p.samples.filter((s) => now - s.t < 120);
    const first = recent[0] ?? p.samples[0];
    const last = p.samples[p.samples.length - 1];
    const dt = Math.max(1, last.t - first.t);
    const velocity = ((last.x - first.x) / dt) * 1000; // px/s

    const w = width || 1;
    // Snap from the PROJECTION, so a flick advances even on a short drag.
    const projected = dragX + project(velocity);
    const steps = Math.round(-projected / w);
    const target = Math.max(0, Math.min(items.length - 1, index + steps));
    setDragX(0);
    go(target, Math.abs(velocity) > FLICK_V && target !== index);
  };

  const active = items[index];
  const chunks = useMemo(() => parseBlockText(active?.text ?? ''), [active?.text]);

  if (!items.length) {
    return (
      <div className="rounded-lg border bg-muted p-6 text-center text-sm text-muted-foreground">
        No slides added yet.
      </div>
    );
  }

  const trackStyle: React.CSSProperties = {
    transform: `translate3d(${-index * width + dragX}px, 0, 0)`,
    transition: dragging
      ? 'none'
      : reduced
        ? 'none'
        : `transform 420ms cubic-bezier(${flicked ? '0.16, 1.06, 0.32, 1' : '0.32, 0.72, 0, 1'})`,
    willChange: dragging ? 'transform' : undefined,
  };

  return (
    <div className="space-y-3">
      {payload.heading?.trim() && (
        <h3 className="font-display text-lg text-foreground">{payload.heading}</h3>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {payload.instruction?.trim() ||
            'Swipe or use the arrows to move through each step.'}
        </p>
        {showProgress && (
          <Badge variant="secondary" className="tabular-nums">
            {viewed.size}/{items.length} viewed
          </Badge>
        )}
      </div>

      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={payload.heading?.trim() || 'Story carousel'}
        tabIndex={0}
        className="overflow-hidden rounded-xl bg-card shadow-learner focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            go(index - 1);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            go(index + 1);
          }
        }}
      >
        <div
          ref={viewportRef}
          className={cn('overflow-hidden', dragging ? 'cursor-grabbing' : 'touch-pan-y')}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <div className="flex" style={trackStyle}>
            {items.map((item, i) => {
              const isActive = i === index;
              return (
                <div
                  key={item.id}
                  className={cn(
                    'w-full shrink-0 grow-0 basis-full select-none',
                    reduced && 'motion-reduce:transition-opacity motion-reduce:duration-150',
                    reduced && !isActive && 'opacity-0'
                  )}
                  aria-hidden={!isActive}
                  style={{ width: width || undefined }}
                >
                  {item.media && (
                    <div className="aspect-video overflow-hidden bg-muted">
                      <SignedImage
                        media={item.media}
                        alt={item.alt || ''}
                        className="h-full w-full"
                        emptyLabel="No image on this slide."
                      />
                    </div>
                  )}

                  <div className="space-y-2 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary tabular-nums">
                      Step {i + 1} of {items.length}
                    </p>
                    {item.title?.trim() && (
                      <h4 className="font-display text-base text-foreground">{item.title}</h4>
                    )}

                    {(isActive ? chunks : parseBlockText(item.text ?? '')).map((chunk, ci) =>
                      chunk.kind === 'list' ? (
                        <ul
                          key={ci}
                          className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-foreground"
                        >
                          {chunk.items.map((li, j) => (
                            <li key={j}>{li}</li>
                          ))}
                        </ul>
                      ) : (
                        <p key={ci} className="text-sm leading-relaxed text-foreground">
                          {chunk.text}
                        </p>
                      )
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 border-t p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="pressable min-h-11"
            onClick={() => go(index - 1)}
            disabled={index === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            Back
          </Button>

          <div className="flex items-center gap-2.5">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(i)}
                data-hit-expanded
                aria-label={`Go to step ${i + 1} of ${items.length}`}
                aria-current={i === index}
                className={cn(
                  'pressable h-2.5 w-2.5 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  i === index ? 'bg-primary' : viewed.has(item.id) ? 'bg-primary/40' : 'bg-muted'
                )}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="pressable min-h-11"
            onClick={() => go(index + 1)}
            disabled={index === items.length - 1}
          >
            Next
            <ChevronRight className="ml-1 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {`Step ${index + 1} of ${items.length}: ${active.title || active.text || ''}`}
      </p>
    </div>
  );
}
