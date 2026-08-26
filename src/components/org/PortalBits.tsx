import type { ComponentType, CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle2 } from '@/components/icons';
import { Progress } from '@/components/ui/progress';

/**
 * Shared presentation pieces for the buyer-facing organisation portal (/org).
 * The portal deliberately speaks the learner design language — violet canvas,
 * borderless cards on layered shadows, brand washes — so what the training
 * manager sees matches what their team sees inside a course.
 */

export type WashName = 'violet' | 'teal' | 'amber' | 'coral';

/** Borderless card on the layered learner shadow. */
export function PortalCard({
  className,
  style,
  children,
}: {
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div className={cn('learner-card', className)} style={style}>
      {children}
    </div>
  );
}

interface SectionCardProps {
  title: string;
  description?: ReactNode;
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
  /** Remove inner padding for flush tables. */
  flush?: boolean;
}

/** Card with a standard header row (title + optional aside action). */
export function SectionCard({ title, description, aside, children, className, flush }: SectionCardProps) {
  return (
    <PortalCard className={cn('overflow-hidden', className)}>
      <div className="flex flex-wrap items-start justify-between gap-3 px-5 pt-5 sm:px-6">
        <div className="min-w-0">
          <h2 className="font-display text-[17px] leading-snug text-foreground">{title}</h2>
          {description && <p className="mt-0.5 text-[13px] leading-relaxed text-muted-foreground">{description}</p>}
        </div>
        {aside && <div className="flex shrink-0 items-center gap-2">{aside}</div>}
      </div>
      <div className={cn('pt-4', flush ? 'pb-1' : 'px-5 pb-5 sm:px-6')}>{children}</div>
    </PortalCard>
  );
}

interface StatTileProps {
  icon: ComponentType<{ className?: string }>;
  wash: WashName;
  value: ReactNode;
  label: string;
  sub?: ReactNode;
  subTone?: 'default' | 'warning' | 'success';
  /** Stagger for the one-time arrival animation (ms). */
  entranceDelay?: number;
}

/** Overview number with a brand-wash icon chip. */
export function StatTile({ icon: Icon, wash, value, label, sub, subTone = 'default', entranceDelay = 0 }: StatTileProps) {
  return (
    <div
      className="learner-card learner-wash settle-in flex flex-col gap-3 p-4 sm:p-5"
      data-wash={wash}
      style={entranceDelay ? { animationDelay: `${entranceDelay}ms` } : undefined}
    >
      <span className="learner-wash-chip flex h-9 w-9 items-center justify-center rounded-[10px]" aria-hidden="true">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <div>
        <p className="font-display text-[26px] leading-none tracking-tight text-foreground tabular-nums sm:text-[30px]">
          {value}
        </p>
        <p className="mt-1.5 text-[13px] font-medium text-muted-foreground">{label}</p>
        {sub && (
          <p
            className={cn(
              'mt-0.5 text-xs',
              subTone === 'warning' && 'font-medium text-[hsl(var(--warning-ink))]',
              subTone === 'success' && 'font-medium text-[hsl(var(--success-ink))]',
              subTone === 'default' && 'text-muted-foreground',
            )}
          >
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}

/** Initials disc for people rows. */
export function InitialsAvatar({ name, email, className }: { name?: string | null; email?: string | null; className?: string }) {
  const source = (name?.trim() || email || '?').trim();
  const initials = source
    .split(/\s+/)
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  return (
    <span
      aria-hidden="true"
      className={cn(
        'flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[hsl(var(--violet-soft))] text-xs font-semibold text-primary',
        className,
      )}
    >
      {initials || '?'}
    </span>
  );
}

export type MatrixState = 'completed' | 'in_progress' | 'not_started';

/** Compact status for a compliance-matrix cell. */
export function MatrixStatus({ state, percent }: { state: MatrixState; percent?: number }) {
  if (state === 'completed') {
    return (
      <span className="inline-flex h-6 items-center gap-1 rounded-full bg-[hsl(var(--success)/0.12)] px-2.5 text-xs font-medium text-[hsl(var(--success-ink))]">
        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
        Completed
      </span>
    );
  }
  if (state === 'in_progress') {
    return (
      <span className="inline-flex min-w-[96px] flex-col gap-1">
        <span className="text-xs font-medium text-primary tabular-nums">{percent ?? 0}% complete</span>
        <Progress value={percent ?? 0} className="h-1 w-24" aria-hidden="true" />
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
      <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/30" aria-hidden="true" />
      Not started
    </span>
  );
}

/** Per-learner roll-up shown next to the name in the matrix. */
export function ComplianceDot({ completed, total, started }: { completed: number; total: number; started: number }) {
  const fully = total > 0 && completed === total;
  const label = fully
    ? 'All licensed courses completed'
    : started > 0
      ? `${completed} of ${total} licensed courses completed`
      : 'No licensed courses started';
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        'inline-block h-2 w-2 shrink-0 rounded-full',
        fully
          ? 'bg-[hsl(var(--success))]'
          : started > 0
            ? 'bg-[hsl(var(--warning-ink))]'
            : 'bg-muted-foreground/75',
      )}
    />
  );
}

interface EmptyStateProps {
  icon: ComponentType<{ className?: string }>;
  title: string;
  body: string;
  action?: ReactNode;
}

/** Designed empty state — every empty table says what fills it. */
export function EmptyState({ icon: Icon, title, body, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
      <span className="learner-chip mb-1 h-10 w-10 rounded-xl" aria-hidden="true">
        <Icon className="h-5 w-5" />
      </span>
      <p className="font-display text-[15px] text-foreground">{title}</p>
      <p className="max-w-[340px] text-[13px] leading-relaxed text-muted-foreground">{body}</p>
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}

/** Quiet uppercase table header cell text. */
export const thClass = 'text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground';
