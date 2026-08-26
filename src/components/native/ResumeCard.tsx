import { haptics } from '@/hooks/useHaptics';

/**
 * The Learn tab's opening card: the exact next required lesson, how long is
 * left, and one action. Replaces the stat grid as the first thing on screen.
 */
export const ResumeCard = ({
  courseTitle,
  lessonTitle,
  minutesLeft,
  moduleLabel,
  percent,
  downloaded,
  onResume,
}: {
  courseTitle: string;
  lessonTitle: string;
  minutesLeft: number;
  /** e.g. "Module 4 of 6 · one short scenario left" */
  moduleLabel: string;
  /** 0–100, drives the ring around the play button. */
  percent: number;
  downloaded?: boolean;
  onResume: () => void;
}) => {
  const C = 264; // 2πr, r = 42
  return (
    <article className="learner-card learner-accent relative overflow-hidden p-[18px]">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sp-violet-ink)]">
          Next up · {minutesLeft} min left
        </p>
        {downloaded && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[var(--sp-success-tint)] px-2.5 py-[3px] text-[11px] font-semibold text-[var(--sp-success-ink)]">
            Downloaded
          </span>
        )}
      </div>

      <button
        type="button"
        onClick={() => { haptics.selection(); onResume(); }}
        className="pressable flex w-full items-center gap-4 text-left"
      >
        <span className="relative h-[74px] w-[74px] shrink-0">
          <svg viewBox="0 0 96 96" className="h-[74px] w-[74px] -rotate-90">
            <circle cx="48" cy="48" r="42" fill="none" strokeWidth="7" stroke="hsl(268 30% 92%)" />
            <circle
              cx="48" cy="48" r="42" fill="none" strokeWidth="7" strokeLinecap="round"
              stroke="var(--sp-violet)"
              strokeDasharray={C}
              strokeDashoffset={C * (1 - percent / 100)}
              className="[transition:stroke-dashoffset_1.2s_cubic-bezier(0.32,0.72,0,1)]"
            />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-[var(--sp-violet)] text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5" fill="currentColor"><polygon points="6 3 20 12 6 21 6 3" /></svg>
            </span>
          </span>
        </span>
        <span className="min-w-0">
          <span className="block text-xs text-[var(--sp-ink-soft)]">{courseTitle}</span>
          <span className="mt-0.5 block font-display text-[21px] leading-tight text-foreground">{lessonTitle}</span>
          <span className="mt-1.5 block text-[13px] text-[var(--sp-ink-mid)]">{moduleLabel}</span>
        </span>
      </button>
    </article>
  );
};
