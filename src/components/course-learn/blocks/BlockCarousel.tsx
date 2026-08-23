import { useEffect, useMemo, useRef, useState } from 'react';
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

const SWIPE_PX = 40;

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
  );
}

/**
 * Narrative carousel — one slide at a time with prev/next, position dots and
 * touch swipe. Formative and view-only: nothing is persisted, the done-signal is
 * simply "every slide seen" (slide 1 counts on mount).
 */
export function BlockCarousel({ payload, onAllViewed, showProgress }: Props) {
  const items = payload.items ?? [];
  const [index, setIndex] = useState(0);
  const [viewed, setViewed] = useState<Set<string>>(
    () => new Set(items[0]?.id ? [items[0].id] : [])
  );
  const reduced = useRef(prefersReducedMotion()).current;
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const current = items[index];
    if (!current) return;
    setViewed((prev) => (prev.has(current.id) ? prev : new Set(prev).add(current.id)));
  }, [index, items]);

  useEffect(() => {
    onAllViewed(items.length === 0 || items.every((it) => viewed.has(it.id)));
  }, [viewed, items, onAllViewed]);

  const go = (next: number) => {
    if (!items.length) return;
    setIndex(Math.max(0, Math.min(items.length - 1, next)));
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

  return (
    <div className="space-y-3">
      {payload.heading?.trim() && (
        <h3 className="text-base font-semibold text-foreground">{payload.heading}</h3>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {payload.instruction?.trim() || 'Use the arrows to move through each step.'}
        </p>
        {showProgress && (
          <Badge variant="outline">
            {viewed.size}/{items.length} viewed
          </Badge>
        )}
      </div>

      <div
        role="group"
        aria-roledescription="carousel"
        aria-label={payload.heading?.trim() || 'Story carousel'}
        tabIndex={0}
        className="rounded-lg border bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            go(index - 1);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            go(index + 1);
          }
        }}
        onTouchStart={(e) => {
          const t = e.touches[0];
          touchStart.current = { x: t.clientX, y: t.clientY };
        }}
        onTouchEnd={(e) => {
          const start = touchStart.current;
          touchStart.current = null;
          if (!start) return;
          const t = e.changedTouches[0];
          const dx = t.clientX - start.x;
          const dy = t.clientY - start.y;
          // Vertical-dominant gestures stay page scroll.
          if (Math.abs(dx) < SWIPE_PX || Math.abs(dy) > Math.abs(dx)) return;
          go(dx < 0 ? index + 1 : index - 1);
        }}
      >
        {active.media && (
          <div className="aspect-video overflow-hidden rounded-t-lg bg-muted">
            <SignedImage
              media={active.media}
              alt={active.alt || ''}
              className="h-full w-full"
              emptyLabel="No image on this slide."
            />
          </div>
        )}

        <div
          key={active.id}
          className={cn('space-y-2 p-4', !reduced && 'animate-fade-in')}
        >
          <p className="text-xs font-medium uppercase tracking-wide text-primary">
            Step {index + 1} of {items.length}
          </p>
          {active.title?.trim() && (
            <h4 className="text-base font-semibold text-foreground">{active.title}</h4>
          )}
          {chunks.map((chunk, i) =>
            chunk.kind === 'list' ? (
              <ul
                key={i}
                className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-foreground"
              >
                {chunk.items.map((item, j) => (
                  <li key={j}>{item}</li>
                ))}
              </ul>
            ) : (
              <p key={i} className="text-sm leading-relaxed text-foreground">
                {chunk.text}
              </p>
            )
          )}
        </div>

        <div className="flex items-center justify-between gap-2 border-t p-3">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
            onClick={() => go(index - 1)}
            disabled={index === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" aria-hidden="true" />
            Back
          </Button>

          <div className="flex items-center gap-1.5">
            {items.map((item, i) => (
              <button
                key={item.id}
                type="button"
                onClick={() => go(i)}
                aria-label={`Go to step ${i + 1} of ${items.length}`}
                aria-current={i === index}
                className={cn(
                  'h-2.5 w-2.5 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  i === index ? 'bg-primary' : viewed.has(item.id) ? 'bg-primary/40' : 'bg-muted'
                )}
              />
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            className="min-h-11"
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
