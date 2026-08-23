import { useEffect, useRef, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from '@/components/icons';
import { useIsMobile } from '@/hooks/use-mobile';
import { SignedImage } from './SignedImage';
import type { HotGraphicPayload } from './types';

interface Props {
  payload: HotGraphicPayload;
  /** Called with true once every hotspot has been opened. */
  onAllExplored: (allExplored: boolean) => void;
  showProgress: boolean;
}

/** Below this rendered width pins crowd together, so we show the list instead. */
const MIN_PIN_WIDTH_PX = 420;

/**
 * Labelled image ("hot graphic"). Pins are real buttons in author order, so DOM
 * order matches reading order. A visible list view is always available and is the
 * default on small or narrow surfaces.
 */
export function BlockHotGraphic({ payload, onAllExplored, showProgress }: Props) {
  const hotspots = payload.hotspots ?? [];
  const isMobile = useIsMobile();
  const wrapRef = useRef<HTMLDivElement>(null);
  const [narrow, setNarrow] = useState(false);
  const [listView, setListView] = useState(false);
  const [userChoseView, setUserChoseView] = useState(false);
  const [explored, setExplored] = useState<Set<string>>(new Set());

  // Auto-fall back to the list when the image box is too narrow for pins.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width ?? 0;
      setNarrow(width > 0 && width < MIN_PIN_WIDTH_PX);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    onAllExplored(hotspots.length === 0 || hotspots.every((h) => explored.has(h.id)));
  }, [explored, hotspots, onAllExplored]);

  const open = (id: string) =>
    setExplored((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));

  const showList = userChoseView ? listView : isMobile || narrow;

  if (!payload.image?.path && !payload.image?.url) {
    return (
      <div className="rounded-lg border bg-muted p-6 text-center text-sm text-muted-foreground">
        No image added yet.
      </div>
    );
  }

  return (
    <div className="space-y-3" ref={wrapRef}>
      {payload.heading?.trim() && (
        <h3 className="text-base font-semibold text-foreground">{payload.heading}</h3>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {payload.instruction?.trim() || 'Select each point on the image to find out more.'}
        </p>
        {showProgress && (
          <Badge variant="outline">
            {explored.size}/{hotspots.length} explored
          </Badge>
        )}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="ml-auto"
          onClick={() => {
            setUserChoseView(true);
            setListView(!showList);
          }}
        >
          {showList ? 'View on the image' : 'View as a list'}
        </Button>
      </div>

      {showList ? (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-lg border bg-card">
            <SignedImage media={payload.image} alt={payload.alt || ''} className="max-h-[420px]" />
          </div>
          <Accordion
            type="multiple"
            className="rounded-lg border bg-card px-2"
            onValueChange={(values) => (values as string[]).forEach(open)}
          >
            {hotspots.map((spot, i) => (
              <AccordionItem key={spot.id} value={spot.id}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  <span className="flex items-center gap-2">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                      {i + 1}
                    </span>
                    {spot.title || `Point ${i + 1}`}
                    {explored.has(spot.id) && (
                      <CheckCircle2 className="h-4 w-4 text-success" aria-hidden="true" />
                    )}
                  </span>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {spot.text}
                  </p>
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </div>
      ) : (
        <div className="relative overflow-hidden rounded-lg border bg-card">
          <SignedImage media={payload.image} alt={payload.alt || ''} className="max-h-[560px]" />
          {hotspots.map((spot, i) => {
            const found = explored.has(spot.id);
            return (
              <Popover key={spot.id} onOpenChange={(isOpen) => isOpen && open(spot.id)}>
                <PopoverTrigger asChild>
                  <button
                    type="button"
                    aria-label={`Point ${i + 1}: ${spot.title || 'Find out more'}${found ? ' (explored)' : ''}`}
                    style={{
                      left: `${Math.min(98, Math.max(2, spot.x))}%`,
                      top: `${Math.min(98, Math.max(2, spot.y))}%`,
                    }}
                    className={cn(
                      'absolute flex h-9 w-9 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border-2 text-xs font-semibold shadow-md transition-colors',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      found
                        ? 'border-success bg-success text-success-foreground'
                        : 'border-primary bg-background text-primary hover:bg-primary hover:text-primary-foreground'
                    )}
                  >
                    {found ? <CheckCircle2 className="h-4 w-4" aria-hidden="true" /> : i + 1}
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-72 space-y-1.5">
                  <p className="text-sm font-semibold text-foreground">
                    {spot.title || `Point ${i + 1}`}
                  </p>
                  <p className="whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {spot.text}
                  </p>
                </PopoverContent>
              </Popover>
            );
          })}
        </div>
      )}
    </div>
  );
}
