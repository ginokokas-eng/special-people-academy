import { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, Info, AlertTriangle, ShieldCheck, Sparkles } from '@/components/icons';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { BlockVideo } from './BlockVideo';
import { BlockMcq } from './BlockMcq';
import { BlockDragMatch } from './BlockDragMatch';
import { BlockFlipCards } from './BlockFlipCards';
import { BlockChecklist } from './BlockChecklist';
import {
  isInteractive,
  parseBlockText,
  type AccordionPayload,
  type CalloutPayload,
  type CardDeckPayload,
  type ChecklistPayload,
  type DragMatchPayload,
  type FlipCardsPayload,
  type ImagePayload,
  type LessonBlock,
  type McqPayload,
  type TextPayload,
  type VideoPayload,
} from './types';

interface LessonBlocksProps {
  blocks: LessonBlock[];
  /** Learner has already completed this lesson. */
  completed?: boolean;
  /** Called when every completion-contributing block has been satisfied. */
  onComplete?: () => void;
  /** Admin preview: render exactly as learners see it, but never write progress. */
  preview?: boolean;
}

/* ---------------------------------- text ---------------------------------- */

function TextBlock({ payload }: { payload: TextPayload }) {
  const chunks = useMemo(() => parseBlockText(payload.text), [payload.text]);
  return (
    <div className="space-y-3">
      {payload.heading?.trim() && (
        <h3 className="text-base font-semibold text-foreground">{payload.heading}</h3>
      )}
      {chunks.map((chunk, i) =>
        chunk.kind === 'list' ? (
          <ul key={i} className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-foreground">
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
      {!chunks.length && !payload.heading?.trim() && (
        <p className="text-sm text-muted-foreground">No text added yet.</p>
      )}
    </div>
  );
}

/* -------------------------------- callout --------------------------------- */

const CALLOUT_STYLES: Record<
  CalloutPayload['variant'],
  { wrap: string; icon: JSX.Element; label: string }
> = {
  info: {
    wrap: 'border-primary/30 bg-primary/5 text-foreground',
    icon: <Info className="h-4 w-4 text-primary" />,
    label: 'Good to know',
  },
  safety: {
    wrap: 'border-destructive/30 bg-destructive/5 text-foreground',
    icon: <ShieldCheck className="h-4 w-4 text-destructive" />,
    label: 'Safety',
  },
  warning: {
    wrap: 'border-warning/40 bg-warning/10 text-foreground',
    icon: <AlertTriangle className="h-4 w-4 text-warning" />,
    label: 'Important',
  },
  success: {
    wrap: 'border-success/40 bg-success/10 text-foreground',
    icon: <Sparkles className="h-4 w-4 text-success" />,
    label: 'Good practice',
  },
};

function CalloutBlock({ payload }: { payload: CalloutPayload }) {
  const style = CALLOUT_STYLES[payload.variant] ?? CALLOUT_STYLES.info;
  return (
    <div className={cn('rounded-lg border p-4', style.wrap)}>
      <div className="mb-1.5 flex items-center gap-2 text-sm font-semibold">
        {style.icon}
        <span>{payload.title?.trim() || style.label}</span>
      </div>
      <p className="whitespace-pre-line text-sm leading-relaxed">{payload.text}</p>
    </div>
  );
}

/* ------------------------------- card deck -------------------------------- */

function CardDeckBlock({
  payload,
  onAllRevealed,
}: {
  payload: CardDeckPayload;
  onAllRevealed: (allRevealed: boolean) => void;
}) {
  const cards = payload.cards ?? [];
  const [revealed, setRevealed] = useState<Set<string>>(new Set());

  useEffect(() => {
    onAllRevealed(cards.length === 0 || cards.every((c) => revealed.has(c.id)));
  }, [revealed, cards, onAllRevealed]);

  const toggle = (id: string) => {
    setRevealed((prev) => {
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
          {payload.instruction?.trim() || 'Tap each card to reveal the answer.'}
        </p>
        <Badge variant="outline">
          {revealed.size}/{cards.length} revealed
        </Badge>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {cards.map((card) => {
          const open = revealed.has(card.id);
          return (
            <button
              key={card.id}
              type="button"
              onClick={() => toggle(card.id)}
              aria-expanded={open}
              className={cn(
                'min-h-[104px] rounded-lg border p-4 text-left transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                open ? 'border-primary bg-primary/5' : 'bg-card hover:bg-muted'
              )}
            >
              <p className="text-sm font-medium text-foreground">{card.front || 'Card'}</p>
              {open ? (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                  {card.back}
                </p>
              ) : (
                <p className="mt-2 text-xs font-medium text-primary">Tap to reveal</p>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------------------- accordion ------------------------------- */

function ParsedText({ text }: { text: string }) {
  const chunks = useMemo(() => parseBlockText(text), [text]);
  return (
    <div className="space-y-3">
      {chunks.map((chunk, i) =>
        chunk.kind === 'list' ? (
          <ul key={i} className="ml-5 list-disc space-y-1.5 text-sm leading-relaxed text-foreground">
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
  );
}

function AccordionBlock({
  payload,
  onAllOpened,
  showProgress,
}: {
  payload: AccordionPayload;
  onAllOpened: (allOpened: boolean) => void;
  showProgress: boolean;
}) {
  const items = payload.items ?? [];
  const [opened, setOpened] = useState<Set<string>>(new Set());

  useEffect(() => {
    onAllOpened(items.length === 0 || items.every((it) => opened.has(it.id)));
  }, [opened, items, onAllOpened]);

  return (
    <div className="space-y-3">
      {payload.heading?.trim() && (
        <h3 className="text-base font-semibold text-foreground">{payload.heading}</h3>
      )}
      {showProgress && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">Open each section to continue.</p>
          <Badge variant="outline">
            {opened.size}/{items.length} opened
          </Badge>
        </div>
      )}
      <Accordion
        type="multiple"
        className="rounded-lg border bg-card px-2"
        onValueChange={(values) =>
          setOpened((prev) => {
            const next = new Set(prev);
            (values as string[]).forEach((v) => next.add(v));
            return next;
          })
        }
      >
        {items.map((item, i) => (
          <AccordionItem key={item.id} value={item.id}>
            <AccordionTrigger className="text-left text-sm font-medium">
              {item.title || `Section ${i + 1}`}
            </AccordionTrigger>
            <AccordionContent>
              <ParsedText text={item.body} />
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </div>
  );
}

/* ---------------------------------- image --------------------------------- */

function ImageBlock({ payload }: { payload: ImagePayload }) {
  if (!payload.url) {
    return (
      <div className="rounded-lg border bg-muted p-6 text-center text-sm text-muted-foreground">
        No image added yet.
      </div>
    );
  }
  return (
    <figure className="space-y-2">
      <div className="overflow-hidden rounded-lg border bg-card">
        <img
          src={payload.url}
          alt={payload.alt || ''}
          loading="lazy"
          className="mx-auto max-h-[520px] w-full object-contain"
        />
      </div>
      {payload.caption?.trim() && (
        <figcaption className="text-xs text-muted-foreground">{payload.caption}</figcaption>
      )}
    </figure>
  );
}

/* -------------------------------- renderer -------------------------------- */

/**
 * Renders an ordered list of lesson blocks. The SAME component is used by the
 * learner player and the admin editor preview (with `preview`), so what an
 * author sees is what a learner gets.
 *
 * Completion: a block lesson is complete once every block with
 * `contributes_to_completion` has its signal satisfied. Non-interactive blocks
 * (text, callout, image) are satisfied by being displayed; card decks need all
 * cards revealed. The roll-up then writes the single existing lesson_progress
 * row via the caller's markComplete.
 */
export function LessonBlocks({ blocks, completed, onComplete, preview }: LessonBlocksProps) {
  const [deckState, setDeckState] = useState<Record<string, boolean>>({});

  const setSignal = (id: string, done: boolean) =>
    setDeckState((prev) => (prev[id] === done ? prev : { ...prev, [id]: done }));

  const interactiveRequired = blocks.filter(
    (b) => b.contributes_to_completion && isInteractive(b.block_type)
  );
  const allSatisfied = interactiveRequired.every((b) => deckState[b.id]);
  const pendingTypes = new Set(
    interactiveRequired.filter((b) => !deckState[b.id]).map((b) => b.block_type)
  );
  const reasons: string[] = [];
  if (pendingTypes.has('card_deck')) reasons.push('reveal every card');
  if (pendingTypes.has('flip_cards')) reasons.push('flip every card');
  if (pendingTypes.has('accordion')) reasons.push('open every section');
  if (pendingTypes.has('video')) {
    const videoHasCheckpoints = interactiveRequired.some(
      (b) =>
        b.block_type === 'video' &&
        !deckState[b.id] &&
        videoCheckpoints(b.payload as VideoPayload).length > 0
    );
    reasons.push(
      videoHasCheckpoints
        ? 'watch the video and answer its checkpoint questions'
        : 'watch the video'
    );
  }

  if (pendingTypes.has('mcq')) reasons.push('answer the knowledge check');
  if (pendingTypes.has('drag_match')) reasons.push('complete the matching activity');
  const disabledReason = reasons.length
    ? `Please ${reasons.join(', ')} above to finish this lesson.`
    : '';

  if (!blocks.length) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <p className="text-sm text-muted-foreground">No content for this lesson yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-6 rounded-lg border bg-card p-6">
        {blocks.map((block) => (
          <div key={block.id}>
            {block.block_type === 'text' && <TextBlock payload={block.payload as TextPayload} />}
            {block.block_type === 'callout' && (
              <CalloutBlock payload={block.payload as CalloutPayload} />
            )}
            {block.block_type === 'image' && <ImageBlock payload={block.payload as ImagePayload} />}
            {block.block_type === 'card_deck' && (
              <CardDeckBlock
                payload={block.payload as CardDeckPayload}
                onAllRevealed={(done) => setSignal(block.id, done)}
              />
            )}
            {block.block_type === 'accordion' && (
              <AccordionBlock
                payload={block.payload as AccordionPayload}
                showProgress={block.contributes_to_completion}
                onAllOpened={(done) => setSignal(block.id, done)}
              />
            )}
            {block.block_type === 'video' && (
              <BlockVideo
                payload={block.payload as VideoPayload}
                blockId={block.id}
                lessonId={block.lesson_id}
                lessonCompleted={completed}
                preview={preview}
                onWatched={(done) => setSignal(block.id, done)}
              />
            )}

            {block.block_type === 'flip_cards' && (
              <BlockFlipCards
                payload={block.payload as FlipCardsPayload}
                showProgress={block.contributes_to_completion}
                onAllFlipped={(done) => setSignal(block.id, done)}
              />
            )}
            {block.block_type === 'mcq' && (
              <BlockMcq
                payload={block.payload as McqPayload}
                blockId={block.id}
                lessonId={block.lesson_id}
                preview={preview}
                onAnswered={(done) => setSignal(block.id, done)}
              />
            )}
            {block.block_type === 'drag_match' && (
              <BlockDragMatch
                payload={block.payload as DragMatchPayload}
                blockId={block.id}
                lessonId={block.lesson_id}
                preview={preview}
                onSolved={(done) => setSignal(block.id, done)}
              />
            )}
            {block.block_type === 'checklist' && (
              <BlockChecklist payload={block.payload as ChecklistPayload} />
            )}
          </div>
        ))}
      </div>

      {!preview && (
        <div className="flex flex-wrap items-center gap-3">
          {completed ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> Completed
            </span>
          ) : (
            <>
              <Button onClick={() => onComplete?.()} disabled={!allSatisfied}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                Mark as complete
              </Button>
              {!allSatisfied && disabledReason && (
                <p className="text-xs text-muted-foreground">{disabledReason}</p>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
