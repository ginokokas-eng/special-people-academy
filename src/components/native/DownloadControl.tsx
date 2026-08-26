import { haptics } from '@/hooks/useHaptics';
import type { DownloadState } from '@/lib/offline';

export type { DownloadState };

/**
 * The one download affordance, used at two scales: a whole course
 * ("Download all · 84 MB · 4 of 6 ready") and a single lesson row.
 *
 * Rules the design assumes:
 *  - wifi-only is the default (Profile → Downloads); on mobile data the tap
 *    opens a confirm sheet rather than silently queueing.
 *  - progress is per lesson, so a part-downloaded course is still useful.
 *  - a finished download fires haptics.success() — the learner has usually
 *    put the phone down by then.
 *  - never block the UI: state lives on the row, there is no modal.
 */
export const DownloadControl = ({
  state,
  sizeLabel,
  progress = 0,
  readyLabel,
  onToggle,
  variant = 'row',
}: {
  state: DownloadState;
  /** e.g. "84 MB" */
  sizeLabel: string;
  /** 0–100 while downloading. */
  progress?: number;
  /** e.g. "4 of 6 ready" — course scale only. */
  readyLabel?: string;
  onToggle: () => void;
  variant?: 'row' | 'icon';
}) => {
  const label =
    state === 'ready' ? 'Downloaded'
    : state === 'downloading' ? `Downloading ${progress}%`
    : state === 'queued' ? 'Queued'
    : state === 'error' ? 'Retry download'
    : 'Download all';

  if (variant === 'icon') {
    return (
      <button
        type="button"
        aria-label={label}
        onClick={() => { haptics.selection(); onToggle(); }}
        className="pressable flex h-11 w-11 items-center justify-center rounded-full text-[var(--sp-violet)]"
      >
        <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m7 10 5 5 5-5" />
          <path d="M12 15V3" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => { haptics.selection(); onToggle(); }}
      className="pressable flex w-full items-center justify-between gap-2.5 rounded-[14px] border border-[var(--sp-line-hover)] bg-white px-4 py-3.5"
    >
      <span className="flex items-center gap-2.5 text-sm font-semibold text-foreground">
        <svg viewBox="0 0 24 24" className="h-[19px] w-[19px]" fill="none" stroke="var(--sp-violet)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <path d="m7 10 5 5 5-5" />
          <path d="M12 15V3" />
        </svg>
        {label}
      </span>
      <span className="text-xs text-[var(--sp-ink-soft)]">
        {sizeLabel}{readyLabel ? ` · ${readyLabel}` : ''}
      </span>
    </button>
  );
};
