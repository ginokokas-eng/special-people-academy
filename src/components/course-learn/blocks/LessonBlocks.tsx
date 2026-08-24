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
import { RevealOnScroll } from './RevealOnScroll';
import { LessonProgressStrip } from './LessonProgressStrip';
import { BackToTop } from './BackToTop';
import { BlockMcq } from './BlockMcq';
import { BlockDragMatch } from './BlockDragMatch';
import { BlockFlipCards } from './BlockFlipCards';
import { BlockChecklist } from './BlockChecklist';
import { BlockCarousel } from './BlockCarousel';
import { BlockHotGraphic } from './BlockHotGraphic';
import { SignedImage } from './SignedImage';
import { ActivityShell } from './ActivityShell';

import {

  blockLayout,
  isInteractive,
  parseBlockText,
  type AccordionPayload,
  type CalloutPayload,
  type CardDeckPayload,
  type CarouselPayload,
  type ChecklistPayload,
  type DragMatchPayload,
  type FlipCardsPayload,
  type HotGraphicPayload,
  type ImagePayload,
  type LessonBlock,
  type McqPayload,
  type TextPayload,
  videoCheckpoints,
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
  /** Per-lesson trickle: veil content below the first unfinished gating block. */
  trickleEnabled?: boolean;
}


/* ---------------------------------- text ---------------------------------- */

function TextBlock({ payload }: { payload: TextPayload }) {
  const chunks = useMemo(() => parseBlockText(payload.text), [payload.text]);
  return (
    <div className="space-y-3">
      {payload.heading?.trim() && (
        <h3 className="font-display text-lg text-foreground">{payload.heading}</h3>
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
  { wrap: string; bar: string; icon: JSX.Element; label: string }
> = {
  info: {
    wrap: 'bg-primary/[0.07] text-foreground',
    bar: 'bg-primary',
    icon: <Info className="h-4 w-4 text-primary" />,
    label: 'Good to know',
  },
  safety: {
    wrap: 'bg-destructive/[0.07] text-foreground',
    bar: 'bg-destructive',
    icon: <ShieldCheck className="h-4 w-4 text-destructive" />,
    label: 'Safety',
  },
  warning: {
    wrap: 'bg-warning/[0.12] text-foreground',
    bar: 'bg-warning',
    icon: <AlertTriangle className="h-4 w-4 text-warning" />,
    label: 'Important',
  },
  success: {
    wrap: 'bg-success/[0.10] text-foreground',
    bar: 'bg-success',
    icon: <Sparkles className="h-4 w-4 text-success" />,
    label: 'Good practice',
  },
};

function CalloutBlock({ payload }: { payload: CalloutPayload }) {
  const style = CALLOUT_STYLES[payload.variant] ?? CALLOUT_STYLES.info;
  return (
    <div className={cn('relative overflow-hidden rounded-xl p-4 pl-5', style.wrap)}>
      <span aria-hidden="true" className={cn('absolute inset-y-0 left-0 w-1', style.bar)} />
      <div className="mb-1.5 flex items-center gap-2">
        {style.icon}
        <span className="font-display text-base text-foreground">
          {payload.title?.trim() || style.label}
        </span>
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
        <h3 className="font-display text-lg text-foreground">{payload.heading}</h3>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <p className="text-sm text-muted-foreground">
          {payload.instruction?.trim() || 'Tap each card to reveal the answer.'}
        </p>
        <Badge variant="secondary" className="tabular-nums">
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
                'pressable min-h-[104px] rounded-xl p-4 text-left shadow-learner',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                'motion-safe:hover:-translate-y-0.5 hover:shadow-learner-lg',
                open ? 'bg-card' : 'bg-violet-soft'
              )}

            >
              <p className="font-display text-base text-foreground">{card.front || 'Card'}</p>
              {open ? (
                <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {card.back}
                </p>
              ) : (
                <p className="mt-2 text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  Tap to reveal
                </p>
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
        <h3 className="font-display text-lg text-foreground">{payload.heading}</h3>
      )}
      {showProgress && (
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-sm text-muted-foreground">Open each section to continue.</p>
          <Badge variant="secondary" className="tabular-nums">
            {opened.size}/{items.length} opened
          </Badge>
        </div>
      )}
      <Accordion
        type="multiple"
        className="rounded-xl bg-card px-4 shadow-learner"
        onValueChange={(values) =>
          setOpened((prev) => {
            const next = new Set(prev);
            (values as string[]).forEach((v) => next.add(v));
            return next;
          })
        }
      >
        {items.map((item, i) => (
          <AccordionItem key={item.id} value={item.id} className="border-border/60 last:border-b-0">
            <AccordionTrigger className="pressable text-left text-sm font-semibold data-[state=open]:text-primary">
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
  // Uploaded images carry a MediaRef; legacy blocks still hold a pasted URL.
  const media = payload.media ?? (payload.url ? { source: 'url' as const, url: payload.url } : null);
  if (!media) {
    return (
      <div className="rounded-xl bg-muted/60 p-6 text-center text-sm text-muted-foreground">
        No image added yet.
      </div>
    );
  }
  return (
    <figure className="space-y-2">
      <div className="overflow-hidden rounded-xl bg-card shadow-learner">
        <SignedImage media={media} alt={payload.alt || ''} className="max-h-[520px]" />
      </div>
      {payload.caption?.trim() && (
        <figcaption className="text-xs text-muted-foreground">{payload.caption}</figcaption>
      )}
    </figure>
  );
}


/* -------------------------------- renderer -------------------------------- */

/** Activities that may extend past the text measure to the card edges. */
const WIDE_TYPES = new Set<LessonBlock['block_type']>([
  'video',
  'hot_graphic',
  'drag_match',
  'carousel',
]);

/** Human label for the activity a trickle veil is waiting on. */
const GATE_LABELS: Partial<Record<LessonBlock['block_type'], string>> = {
  card_deck: 'card deck',
  flip_cards: 'flip cards',
  accordion: 'sections',
  video: 'video',
  carousel: 'story carousel',
  hot_graphic: 'labelled image',
  mcq: 'knowledge check',
  drag_match: 'matching activity',
};

/**
 * Renders an ordered list of lesson blocks. The SAME component is used by the
 * learner player and the admin editor preview (with `preview`), so what an
 * author sees is what a learner gets.
 *
 * Layout: a block payload may carry `layout: 'half'`. Two CONSECUTIVE half
 * blocks share a two-column row; an orphan half renders full width. Mobile
 * always stacks. Rows (not blocks) are what scroll-reveal wraps.
 *
 * Trickle (per lesson): presentation only. Content after the first unsatisfied
 * gating block is veiled using the EXISTING completion signals — no new state,
 * no change to what "complete" means.
 *
 * Completion: a block lesson is complete once every block with
 * `contributes_to_completion` has its signal satisfied. Non-interactive blocks
 * (text, callout, image) are satisfied by being displayed; card decks need all
 * cards revealed. The roll-up then writes the single existing lesson_progress
 * row via the caller's markComplete.
 */
export function LessonBlocks({
  blocks,
  completed,
  onComplete,
  preview,
  trickleEnabled,
}: LessonBlocksProps) {
  const [deckState, setDeckState] = useState<Record<string, boolean>>({});
  const [revealAll, setRevealAll] = useState(false);

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

  if (pendingTypes.has('carousel')) reasons.push('view every slide in the carousel');
  if (pendingTypes.has('hot_graphic')) reasons.push('explore every point on the image');
  if (pendingTypes.has('mcq')) reasons.push('answer the knowledge check');
  if (pendingTypes.has('drag_match')) reasons.push('complete the matching activity');
  const disabledReason = reasons.length
    ? `Please ${reasons.join(', ')} above to finish this lesson.`
    : '';

  /** Group consecutive half-width blocks into two-column rows. */
  const rows = useMemo(() => {
    const grouped: LessonBlock[][] = [];
    let i = 0;
    while (i < blocks.length) {
      const block = blocks[i];
      const next = blocks[i + 1];
      const isHalf = blockLayout(block.block_type, block.payload) === 'half';
      const nextIsHalf = !!next && blockLayout(next.block_type, next.payload) === 'half';

      if (isHalf && nextIsHalf) {
        grouped.push([block, next]);
        i += 2;
      } else {
        // An orphan half has no partner, so it renders full width.
        grouped.push([block]);
        i += 1;
      }
    }
    return grouped;
  }, [blocks]);

  /**
   * First row index that is veiled by trickle: the row AFTER the one holding the
   * first unsatisfied gating block. Completed learners and reveal-all see all.
   */
  const veilFromRow = useMemo(() => {
    if (!trickleEnabled || completed || revealAll) return -1;
    for (let r = 0; r < rows.length; r += 1) {
      const gate = rows[r].find(
        (b) => b.contributes_to_completion && isInteractive(b.block_type) && !deckState[b.id]
      );
      if (gate) return r + 1;
    }
    return -1;
  }, [trickleEnabled, completed, revealAll, rows, deckState]);

  const blockingGate = useMemo(() => {
    if (veilFromRow < 1) return null;
    return (
      rows[veilFromRow - 1].find(
        (b) => b.contributes_to_completion && isInteractive(b.block_type) && !deckState[b.id]
      ) ?? null
    );
  }, [veilFromRow, rows, deckState]);

  /**
   * Orientation counts for the sticky strip. Trickle-aware: only gates the
   * learner can actually reach right now are counted, so the label never
   * promises activities that are still veiled. Read-only over deckState.
   */
  const gateCounts = useMemo(() => {
    const lastRow = veilFromRow < 0 ? rows.length : veilFromRow;
    const reachable = rows
      .slice(0, lastRow)
      .flat()
      .filter((b) => b.contributes_to_completion && isInteractive(b.block_type));
    return {
      total: reachable.length,
      done: reachable.filter((b) => deckState[b.id]).length,
    };
  }, [rows, veilFromRow, deckState]);



  if (!blocks.length) {
    return (
      <div className="learner-card p-6">
        <p className="text-sm text-muted-foreground">No content for this lesson yet.</p>
      </div>
    );
  }

  const renderBlockBody = (block: LessonBlock) => (

    <>
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
      {block.block_type === 'carousel' && (
        <BlockCarousel
          payload={block.payload as CarouselPayload}
          showProgress={block.contributes_to_completion}
          onAllViewed={(done) => setSignal(block.id, done)}
        />
      )}
      {block.block_type === 'hot_graphic' && (
        <BlockHotGraphic
          payload={block.payload as HotGraphicPayload}
          showProgress={block.contributes_to_completion}
          onAllExplored={(done) => setSignal(block.id, done)}
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
    </>
  );

  /**
   * P8 signature: blocks whose signal gates the lesson are wrapped in the
   * accent + chip shell. Read-only blocks stay quiet.
   */
  const renderBlock = (block: LessonBlock) => {
    const gating = block.contributes_to_completion && isInteractive(block.block_type);
    if (!gating) return renderBlockBody(block);
    return (
      <ActivityShell blockType={block.block_type} done={!!deckState[block.id]}>
        {renderBlockBody(block)}
      </ActivityShell>
    );
  };

  return (
    // Reading measure: ~68-72ch of body copy, centred. Wide activities are
    // allowed to reach the card edges but never full-bleed (see WIDE_TYPES).
    <div className="lesson-content mx-auto w-full max-w-[47rem] space-y-4">
      {/* Deep-scroll orientation: hidden on lessons with no gating activities
          and in the editor preview so authoring visuals stay unchanged. */}
      {!preview && <LessonProgressStrip done={gateCounts.done} total={gateCounts.total} />}
      {!preview && blocks.length > 5 && <BackToTop />}
      {preview && trickleEnabled && (
        <div className="flex flex-wrap items-center gap-3 rounded-xl bg-primary/[0.07] p-3">
          <p className="text-sm text-foreground">
            <span className="font-semibold">Trickle is on for this lesson.</span> Learners only see
            the next section once they finish the activity above it.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="ml-auto"
            onClick={() => setRevealAll((v) => !v)}
          >
            {revealAll ? 'Show trickle veils' : 'Reveal all'}
          </Button>
        </div>
      )}

      <div className="space-y-4">
        {rows.map((row, rowIndex) => {
          const veiled = veilFromRow >= 0 && rowIndex >= veilFromRow;
          const isVeilEdge = veilFromRow >= 0 && rowIndex === veilFromRow;
          const opacityOnly = row.some(
            (b) => b.block_type === 'video' || b.block_type === 'drag_match'
          );
          // Wide activities stretch to the card edges on larger screens so they
          // are not squeezed into the narrower text measure.
          const wide = row.length === 1 && WIDE_TYPES.has(row[0].block_type);
          // Accent only for blocks that RECORD something. Story carousels are
          // read-along and stay quiet, as do non-gated blocks.
          const accentBlocks = row.filter(
            (b) =>
              b.contributes_to_completion &&
              isInteractive(b.block_type) &&
              b.block_type !== 'carousel'
          );
          const accentDone = accentBlocks.every((b) => !!deckState[b.id]);


          return (
            <div key={row.map((b) => b.id).join('-')}>
              {isVeilEdge && (
                <div className="material-in mb-4 rounded-xl border border-dashed border-primary/40 bg-primary/[0.05] p-4 text-center">

                  <p className="text-sm font-medium text-foreground">
                    Complete the {GATE_LABELS[blockingGate?.block_type ?? 'card_deck'] ?? 'activity'}{' '}
                    above to continue
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    The rest of this lesson opens up as soon as you’re done.
                  </p>
                </div>
              )}
              <div
                aria-hidden={veiled || undefined}
                // P9 read-vs-do: cards holding a recording activity carry the
                // 3px accent, green once every gate in the card is satisfied.
                data-done={accentBlocks.length > 0 && accentDone ? 'true' : undefined}
                // Veiled content stays MOUNTED so signals and scroll positions
                // survive; it is just non-interactive and dimmed.
                className={cn(
                  'learner-card p-4 transition-opacity duration-300 sm:p-6',
                  accentBlocks.length > 0 && 'learner-accent',
                  veiled && 'pointer-events-none select-none opacity-25 blur-[1px]'
                )}
              >
                <RevealOnScroll index={rowIndex} opacityOnly={opacityOnly}>
                  {row.length === 2 ? (
                    <div className="grid gap-6 md:grid-cols-2">
                      {row.map((block) => (
                        <div key={block.id}>{renderBlock(block)}</div>
                      ))}
                    </div>
                  ) : (
                    <div className={cn(wide && 'sm:-mx-6')}>{renderBlock(row[0])}</div>
                  )}
                </RevealOnScroll>
              </div>
            </div>
          );
        })}
      </div>


      {!preview && (
        <div className="flex flex-wrap items-center gap-3">
          {completed ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> Completed
            </span>
          ) : (
            <>
              <Button className="pressable" onClick={() => onComplete?.()} disabled={!allSatisfied}>
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

