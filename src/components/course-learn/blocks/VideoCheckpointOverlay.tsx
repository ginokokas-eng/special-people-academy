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
      className="absolute inset-0 z-30 flex items-center justify-center overflow-y-auto bg-background/95 p-4 backdrop-blur-sm animate-fade-in"
    >
      <div className="w-full max-w-xl space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-primary">
          Checkpoint {index} of {total}
        </p>
        <p className="text-base font-semibold text-foreground">
          {checkpoint.question || 'Checkpoint question'}
        </p>

        <div className="space-y-2" role="group" aria-label="Answer options">
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
                  'flex min-h-12 w-full items-start gap-2 rounded-lg border p-3 text-left text-sm transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                  chosen && answeredCorrectly && 'border-success bg-success/10',
                  chosen && wrong && 'border-destructive bg-destructive/10',
                  !chosen && 'bg-card hover:bg-muted'
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
                <span className="text-foreground">{opt.label || 'Option'}</span>
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
