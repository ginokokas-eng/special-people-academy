import { CheckCircle2 } from '@/components/icons';
import { cn } from '@/lib/utils';

interface Props {
  /** Required activities the learner has already satisfied. */
  done: number;
  /** Required activities currently available to the learner (trickle-aware). */
  total: number;
}

/**
 * Slim sticky orientation strip for long block lessons: "where am I in this
 * lesson". Purely presentational — it reads the gate signals the renderer
 * already holds and writes nothing.
 *
 * It sits inside the scrolling lesson column (the page headers are outside that
 * scroll container, so `sticky top-0` never overlaps them). The fill animates
 * only under `motion-safe`.
 */
export function LessonProgressStrip({ done, total }: Props) {
  if (total <= 0) return null;
  const percent = Math.round((Math.min(done, total) / total) * 100);
  const complete = done >= total;

  return (
    <div
      className="sticky top-0 z-20 -mx-1 rounded-b-lg border-b bg-background/95 px-1 py-2 backdrop-blur supports-[backdrop-filter]:bg-background/80"
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center gap-3">
        <div
          className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={total}
          aria-valuenow={Math.min(done, total)}
          aria-label="Activities completed in this lesson"
        >
          <div
            className={cn(
              'h-full rounded-full motion-safe:transition-[width] motion-safe:duration-500',
              complete ? 'bg-success' : 'bg-primary'
            )}
            style={{ width: `${percent}%` }}
          />
        </div>
        <p
          className={cn(
            'flex shrink-0 items-center gap-1 text-xs font-medium tabular-nums',
            complete ? 'text-success' : 'text-muted-foreground'
          )}
        >
          {complete ? (
            <>
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              All activities done
            </>
          ) : (
            <>
              {done} of {total} {total === 1 ? 'activity' : 'activities'}
            </>
          )}
        </p>
      </div>
    </div>
  );
}
