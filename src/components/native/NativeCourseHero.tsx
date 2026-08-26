import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from '@/components/icons';
import { Button } from '@/components/ui/button';

/**
 * Course detail, phone. A soft violet→teal wash carrying only what decides
 * whether to start now: what this is, how long it takes, and how far in you
 * already are. The marketing hero's ratings and learner counts do not appear.
 *
 * This is a drill-down, so the tab bar stays visible (activeTabFor keeps Learn
 * selected) and the resume action pins to the bottom.
 */
export function NativeCourseHero({
  title,
  category,
  level,
  isMandatory,
  durationMinutes,
  cpdHours,
  renewalMonths,
  progress,
  isEnrolled,
  minutesLeft,
  onStart,
}: {
  title: string;
  category: string;
  level: string;
  isMandatory: boolean;
  durationMinutes: number;
  cpdHours?: number | null;
  renewalMonths?: number | null;
  progress: number;
  isEnrolled: boolean;
  minutesLeft?: number;
  onStart: () => void;
}) {
  const navigate = useNavigate();

  const pills = [
    durationMinutes ? `${Math.round(durationMinutes / 60) || 1}h` : null,
    cpdHours ? `${cpdHours} CPD` : null,
    renewalMonths === 12 ? 'Renews yearly' : renewalMonths ? `Renews every ${renewalMonths} months` : null,
  ].filter(Boolean) as string[];

  return (
    <>
      <header className="relative overflow-hidden bg-[linear-gradient(150deg,hsl(268_55%_50%/0.14),hsl(187_72%_40%/0.10))] px-4 pb-6 pt-3">
        <Button
          variant="ghost"
          size="sm"
          aria-label="Back"
          className="pressable -ml-2 mb-3 h-10 rounded-full px-2.5 text-foreground"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </Button>

        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--sp-teal-kicker)]">
          {[isMandatory ? 'Mandatory' : category, level].filter(Boolean).join(' · ')}
        </p>
        <h1 className="mt-1.5 font-display text-[27px] leading-tight tracking-tight text-foreground">{title}</h1>

        {pills.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {pills.map((p) => (
              <span
                key={p}
                className="rounded-full bg-card/80 px-3 py-1 text-[12px] font-medium text-[var(--sp-ink-mid)] shadow-[var(--shadow-xs)]"
              >
                {p}
              </span>
            ))}
          </div>
        )}

        {isEnrolled && (
          <div className="mt-5 flex items-center gap-3">
            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-card/70">
              <span
                className="block h-full rounded-full bg-[var(--sp-violet)] transition-[width] duration-700"
                style={{ width: `${progress}%` }}
              />
            </span>
            <span className="text-[13px] font-semibold tabular-nums text-foreground">{progress}%</span>
          </div>
        )}
      </header>

      {/* Pinned action. Safe-area padding comes from html.native. */}
      <div className="native-course-cta material-chrome fixed inset-x-0 z-30 px-4 py-3">
        <Button
          className="pressable h-[52px] w-full rounded-full text-[15px] font-semibold"
          onClick={onStart}
        >
          {!isEnrolled
            ? 'Start this course'
            : minutesLeft
              ? `Resume — ${minutesLeft} min left`
              : progress >= 100
                ? 'Review course'
                : 'Resume'}
        </Button>
      </div>
    </>
  );
}
