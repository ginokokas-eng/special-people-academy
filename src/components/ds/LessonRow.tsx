import { Progress } from '@/components/ui/progress';
import { ApertureIcon } from './ApertureIcon';
import { FigureHue } from './FigureMark';

const HUE_VARS: Record<FigureHue, string> = {
  violet: 'var(--sp-figure-violet)',
  amber: 'var(--sp-figure-amber)',
  indigo: 'var(--sp-figure-indigo)',
  pink: 'var(--sp-figure-pink)',
  cyan: 'var(--sp-figure-cyan)',
  green: 'var(--sp-figure-green)',
};

/**
 * Compact progress row — the replacement for a third identical course card in
 * "Continue Learning". Uses the learner surface language (no border, layered
 * shadow, 15px radius) already defined in src/index.css.
 */
export const LessonRow = ({
  category,
  title,
  progress,
  hue = 'violet',
  icon = 'plan',
  done = false,
  onClick,
}: {
  category: string;
  title: string;
  progress: number;
  hue?: FigureHue;
  icon?: string;
  done?: boolean;
  onClick?: () => void;
}) => {
  const colour = done ? 'hsl(var(--success))' : HUE_VARS[hue];
  return (
    <article
      onClick={onClick}
      className="learner-card learner-card-hover pressable flex cursor-pointer items-center gap-3.5 px-[18px] py-4"
    >
      <span
        className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-xl"
        style={{ backgroundColor: `color-mix(in srgb, ${colour} 16%, transparent)`, color: colour }}
      >
        <ApertureIcon name={done ? 'ok' : icon} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-muted-foreground">{category}</p>
        {/* Two lines, not one: 138 of 292 lesson titles are long enough to clip, and
            `truncate` with no title attribute made the rest of the string unreachable
            on every device rather than just awkward on small ones. */}
        <p title={title} className="line-clamp-2 font-heading text-[15px] font-semibold leading-snug text-foreground">{title}</p>
        <Progress value={done ? 100 : progress} className="mt-2 h-1" />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{done ? 'Done' : `${progress}%`}</span>
    </article>
  );
};
