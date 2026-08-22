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
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="outline">Knowledge check</Badge>
        {answered && (
          <span
            className={cn(
              'text-xs font-medium',
              isCorrect ? 'text-success' : 'text-destructive'
            )}
          >
            {isCorrect ? 'Correct' : 'Try again'}
          </span>
        )}
      </div>
      <p className="text-sm font-semibold text-foreground">
        {payload.question || 'Add your question in the editor.'}
      </p>

      <div className="space-y-2" role="group" aria-label="Answer options">
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
                'flex w-full items-start gap-2 rounded-lg border p-3 text-left text-sm transition-colors',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                showState && isCorrect && 'border-success bg-success/10',
                showState && !isCorrect && 'border-destructive bg-destructive/10',
                !showState && 'bg-card hover:bg-muted'
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
              <span className="text-foreground">{opt.label || 'Option'}</span>
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
