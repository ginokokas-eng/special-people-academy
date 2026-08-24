import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import {
  CheckCircle2,
  HelpCircle,
  Layers,
  Video,
  GalleryHorizontal,
  Image as ImageIcon,
  ArrowLeftRight,
  Rows3,
  RefreshCw,
} from '@/components/icons';
import type { LessonBlock } from './types';

/**
 * P8 "read vs do" visual grammar.
 *
 * Presentation only: any block that RECORDS something (its completion signal
 * gates the lesson) is wrapped in this shell, which adds a 3px brand accent
 * down the left edge of the card plus a small rounded icon chip beside the
 * activity name. When the block's gate completes, accent + chip turn green with
 * a tick. Read-only blocks (text, callout, image, carousel, checklist) are NOT
 * wrapped — colour marks "this counts", never decoration.
 */
const ACTIVITY_META: Partial<
  Record<LessonBlock['block_type'], { label: string; Icon: typeof CheckCircle2 }>
> = {
  card_deck: { label: 'Card deck', Icon: Layers },
  flip_cards: { label: 'Flip cards', Icon: RefreshCw },
  accordion: { label: 'Sections', Icon: Rows3 },
  video: { label: 'Video with checkpoints', Icon: Video },
  carousel: { label: 'Story carousel', Icon: GalleryHorizontal },
  hot_graphic: { label: 'Labelled image', Icon: ImageIcon },
  mcq: { label: 'Knowledge check', Icon: HelpCircle },
  drag_match: { label: 'Matching activity', Icon: ArrowLeftRight },
};

export function ActivityShell({
  blockType,
  done,
  children,
}: {
  blockType: LessonBlock['block_type'];
  done: boolean;
  children: ReactNode;
}) {
  const meta = ACTIVITY_META[blockType];
  if (!meta) return <>{children}</>;
  const { label, Icon } = meta;

  return (
    <section>
      <div className="mb-3 flex items-center gap-2">
        <span className="learner-chip" data-done={done} aria-hidden="true">
          {done ? <CheckCircle2 className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
        </span>
        <p
          className={cn(
            'text-[0.6875rem] font-semibold uppercase tracking-[0.14em]',
            done ? 'text-success' : 'text-primary'
          )}
        >
          {label}
        </p>
        {done && <span className="sr-only">completed</span>}
      </div>
      {children}
    </section>
  );
}
