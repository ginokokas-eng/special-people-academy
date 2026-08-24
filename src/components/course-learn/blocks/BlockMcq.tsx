import { useEffect, useState } from 'react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle2, AlertTriangle } from '@/components/icons';
import { useBlockResponse } from './useBlockResponse';
import type { McqPayload } from './types';

interface BlockMcqProps {
  payload: McqPayload;
  blockId: string;
  lessonId: string;
  preview?: boolean;
  /** Done-signal: an attempt exists (answered), per the plan. */
  onAnswered: (answered: boolean) => void;
}

/**
 * Formative multiple-choice check. Immediate feedback + explanation, retry on a
 * wrong answer, every attempt persisted to `lesson_block_responses`.
 * Never writes to `quizzes` / `quiz_attempts`.
 */
export function BlockMcq({ payload, blockId, lessonId, preview, onAnswered }: BlockMcqProps) {
  const options = payload.options ?? [];
  const enabled = !preview;
  const { existing, loaded, record } = useBlockResponse(blockId, lessonId, enabled);

  const [selected, setSelected] = useState<string | null>(null);
  const [answered, setAnswered] = useState(false);

  // Restore a previous attempt so learners see their own answer again.
  useEffect(() => {
    if (!loaded || !existing) return;
    const prev = (existing.response as { selected_id?: string } | null)?.selected_id;
    if (prev) setSelected(prev);
    if ((existing.attempt_count ?? 0) > 0) setAnswered(true);
  }, [loaded, existing]);

  useEffect(() => {
    onAnswered(answered);
  }, [answered, onAnswered]);

  const isCorrect = selected != null && selected === payload.correct_id;

  const choose = (id: string) => {
    if (answered && isCorrect) return; // correct answers lock
    setSelected(id);
    setAnswered(true);
    void record({
      state: id === payload.correct_id ? 'complete' : 'in_progress',
      is_correct: id === payload.correct_id,
      response: { selected_id: id },
    });
  };

  return (
    <div className="space-y-3">
      {answered && (
        <span
          className={cn(
            'inline-flex items-center gap-1 text-xs font-semibold uppercase tracking-[0.12em]',
            isCorrect ? 'text-success' : 'text-destructive'
          )}
        >
          {isCorrect ? 'Correct' : 'Try again'}
        </span>
      )}
      <p className="font-display text-lg leading-snug text-foreground">
        {payload.question || 'Add your question in the editor.'}
      </p>

      <div className="space-y-2.5" role="group" aria-label="Answer options">
        {options.map((opt) => {
          const chosen = selected === opt.id;
          const showState = answered && chosen;
          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => choose(opt.id)}
              aria-pressed={chosen}
              className={cn(
                'flex w-full items-start gap-2.5 rounded-xl border-2 p-3.5 text-left text-sm transition-all duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                showState && isCorrect && 'border-success bg-success/[0.12]',
                showState && !isCorrect && 'border-destructive bg-destructive/[0.10]',
                !showState &&
                  chosen &&
                  'border-primary bg-primary/[0.08]',
                !showState &&
                  !chosen &&
                  'border-border/70 bg-card motion-safe:hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-learner'
              )}
            >
              {showState ? (
                isCorrect ? (
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" aria-hidden="true" />
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
        {answered && (
          <p className="text-sm text-muted-foreground">
            {isCorrect
              ? payload.explanation?.trim() || 'That’s right.'
              : payload.explanation?.trim()
                ? `Not quite. ${payload.explanation}`
                : 'Not quite — choose another answer to try again.'}
          </p>
        )}
      </div>
    </div>
  );
}
