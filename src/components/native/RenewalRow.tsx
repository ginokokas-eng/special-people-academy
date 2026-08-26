/**
 * A dated obligation. The soonest one is rendered "expanded" with two actions;
 * everything after it collapses to date + title.
 */
export const RenewalRow = ({
  title,
  meta,
  day,
  month,
  daysLeft,
  status,
  expanded,
  onStart,
  onRemind,
}: {
  title: string;
  /** e.g. "Expires 14 September · 1h 15m to renew" or "45m online" */
  meta: string;
  /** Collapsed form only. */
  day?: string;
  month?: string;
  /** Expanded form only. */
  daysLeft?: number;
  status?: 'due' | 'booked';
  expanded?: boolean;
  onStart?: () => void;
  onRemind?: () => void;
}) => {
  if (expanded) {
    return (
      <div className="learner-card learner-accent relative overflow-hidden p-4 shadow-learner-lg [&>span:first-child]:bg-[var(--sp-warning)]">
        <div className="mb-3 flex items-start justify-between gap-3">
          <span>
            <span className="block text-base font-semibold text-foreground">{title}</span>
            <span className="mt-0.5 block text-[13px] text-[var(--sp-ink-soft)]">{meta}</span>
          </span>
          <span className="whitespace-nowrap rounded-full bg-[var(--sp-warning-tint)] px-2.5 py-[5px] text-xs font-bold text-[var(--sp-warning-ink)]">
            {daysLeft} days
          </span>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={onStart} className="pressable h-11 flex-1 rounded-full bg-[var(--sp-violet)] text-sm font-semibold text-white">Start now</button>
          <button type="button" onClick={onRemind} className="pressable h-11 rounded-full border border-[var(--sp-line-strong)] bg-white px-4 text-sm font-semibold text-foreground">Remind me</button>
        </div>
      </div>
    );
  }

  return (
    <div className="learner-card flex items-center gap-3 p-3.5">
      <span className="w-11 shrink-0 text-center">
        <span className="block font-heading text-[17px] font-bold text-foreground">{day}</span>
        <span className="block text-[11px] uppercase tracking-[0.08em] text-[var(--sp-ink-soft)]">{month}</span>
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-semibold text-foreground">{title}</span>
        <span className="block text-xs text-[var(--sp-ink-soft)]">{meta}</span>
      </span>
      {status === 'booked' && (
        <span className="rounded-full bg-[var(--sp-violet-soft)] px-2.5 py-1 text-[11px] font-bold text-[var(--sp-violet-soft-ink)]">Booked</span>
      )}
    </div>
  );
};
