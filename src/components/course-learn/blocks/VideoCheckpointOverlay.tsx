import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle } from '@/components/icons';
import { Button } from '@/components/ui/button';
import type { VideoCheckpoint } from './types';

interface Props {
  checkpoint: VideoCheckpoint;
  /** Index (1-based) and total, for the "Question 2 of 3" label. */
  index: number;
  total: number;
  selectedId: string | null;
  answeredCorrectly: boolean;
  onSelect: (optionId: string) => void;
  onContinue: () => void;
}

/**
 * In-video checkpoint question. Rendered INSIDE the player container (via the
 * VideoPlayer `overlay` prop) so it stays visible in theatre and fullscreen.
 * Formative only — feedback, explanation and retry; never touches quizzes.
 */
export function VideoCheckpointOverlay({
  checkpoint,
  index,
  total,
  selectedId,
  answeredCorrectly,
  onSelect,
  onContinue,
}: Props) {
  const options = checkpoint.options ?? [];
  const wrong = selectedId != null && !answeredCorrectly;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Checkpoint question"
      className="material-in absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-background/95 p-4 will-change-[transform,opacity,filter] motion-reduce:animate-fade-in"
    >

      <div className="w-full max-w-xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
          Checkpoint {index} of {total}
        </p>
        <p className="font-display text-lg leading-snug text-foreground">
          {checkpoint.question || 'Checkpoint question'}
        </p>

        <div className="space-y-2.5" role="group" aria-label="Answer options">
          {options.map((opt) => {
            const chosen = selectedId === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => onSelect(opt.id)}
                aria-pressed={chosen}
                disabled={answeredCorrectly && !chosen}
                className={cn(
                  'pressable flex min-h-12 w-full items-start gap-2.5 rounded-xl border-2 p-3.5 text-left text-sm',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',

                  chosen && answeredCorrectly && 'border-success bg-success/[0.12]',
                  chosen && wrong && 'border-destructive bg-destructive/[0.10]',
                  !chosen &&
                    'border-border/70 bg-card motion-safe:hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-learner'
                )}
              >
                {chosen ? (
                  answeredCorrectly ? (
                    <CheckCircle2
                      className="mt-0.5 h-4 w-4 shrink-0 text-success"
                      aria-hidden="true"
                    />
                  ) : (
                    <AlertTriangle
                      className="mt-0.5 h-4 w-4 shrink-0 text-destructive"
                      aria-hidden="true"
                    />
                  )
                ) : null}
                <span className="font-medium text-foreground">{opt.label || 'Option'}</span>
              </button>
            );
          })}
        </div>


        <div aria-live="polite" className="min-h-[1.25rem]">
          {selectedId && (
            <p className="text-sm text-muted-foreground">
              {answeredCorrectly
                ? checkpoint.explanation?.trim() || 'That’s right.'
                : checkpoint.explanation?.trim()
                  ? `Not quite. ${checkpoint.explanation}`
                  : 'Not quite — choose another answer to try again.'}
            </p>
          )}
        </div>

        {answeredCorrectly && (
          <Button onClick={onContinue}>Continue watching</Button>
        )}
      </div>
    </div>
  );
}
