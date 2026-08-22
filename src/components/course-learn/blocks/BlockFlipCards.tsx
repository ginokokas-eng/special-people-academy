import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { FlipCardsPayload } from './types';

interface BlockFlipCardsProps {
  payload: FlipCardsPayload;
  showProgress: boolean;
  onAllFlipped: (allFlipped: boolean) => void;
}

/** Cards that flip in place. Gate = every card flipped at least once. */
export function BlockFlipCards({ payload, showProgress, onAllFlipped }: BlockFlipCardsProps) {
  const cards = payload.cards ?? [];
  const [flipped, setFlipped] = useState<Set<string>>(new Set());
  const [seen, setSeen] = useState<Set<string>>(new Set());

  useEffect(() => {
    onAllFlipped(cards.length === 0 || cards.every((c) => seen.has(c.id)));
  }, [seen, cards, onAllFlipped]);

  const toggle = (id: string) => {
    setSeen((prev) => (prev.has(id) ? prev : new Set(prev).add(id)));
    setFlipped((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-3">
      {payload.heading?.trim() && (
        <h3 className="text-base font-semibold text-foreground">{payload.heading}</h3>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {payload.instruction?.trim() || 'Tap a card to flip it over.'}
        </p>
        {showProgress && (
          <Badge variant="outline">
            {seen.size}/{cards.length} flipped
          </Badge>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => {
          const isFlipped = flipped.has(card.id);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => toggle(card.id)}
              aria-pressed={isFlipped}
              className={cn(
                'group min-h-[120px] rounded-lg border bg-card p-0 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                isFlipped ? 'border-primary' : 'hover:bg-muted'
              )}
              style={{ perspective: '1000px' }}
            >
              <span
                className="relative block h-full min-h-[120px] w-full transition-transform duration-500"
                style={{
                  transformStyle: 'preserve-3d',
                  transform: isFlipped ? 'rotateY(180deg)' : 'none',
                }}
              >
                <span
                  className="absolute inset-0 flex flex-col justify-center gap-2 p-4"
                  style={{ backfaceVisibility: 'hidden' }}
                  aria-hidden={isFlipped}
                >
                  <span className="text-sm font-medium text-foreground">{card.front || 'Card'}</span>
                  <span className="text-xs font-medium text-primary">Tap to flip</span>
                </span>
                <span
                  className="absolute inset-0 flex flex-col justify-center gap-2 rounded-lg bg-primary/5 p-4"
                  style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                  aria-hidden={!isFlipped}
                >
                  <span className="whitespace-pre-line text-sm leading-relaxed text-foreground">
                    {card.back}
                  </span>
                  <span className="text-xs font-medium text-muted-foreground">Tap to flip back</span>
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
