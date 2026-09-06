import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, ClipboardList, Clock, ShieldCheck } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useBlockResponse } from './useBlockResponse';
import { useBlockMark } from './useBlockMark';
import { checklistMode, type ChecklistPayload } from './types';

interface BlockChecklistProps {
  payload: ChecklistPayload;
  blockId?: string;
  lessonId?: string;
  preview?: boolean;
  /** Done-signal for assessed checklists: the learner says they are ready. */
  onReady?: (ready: boolean) => void;
}

/**
 * Practical checklist.
 *
 * `reference` mode (the default, and how every existing checklist behaves) is a
 * study reference only: not tickable, and it never touches sign-off.
 *
 * `assessed` mode lets the learner say they are ready to be observed; the
 * assessor ticks the steps off in person and signs the observation, which is
 * stored as a separate `block_marks` row. Learners never tick their own steps.
 */
export function BlockChecklist({
  payload,
  blockId,
  lessonId,
  preview,
  onReady,
}: BlockChecklistProps) {
  const steps = payload.steps ?? [];
  const assessed = checklistMode(payload) === 'assessed';
  const enabled = !preview && assessed && !!blockId && !!lessonId;

  const { existing, loaded, record } = useBlockResponse(blockId ?? '', lessonId ?? '', enabled);
  const { mark } = useBlockMark(blockId ?? '', enabled);

  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loaded || !existing) return;
    if (existing.state === 'complete') setReady(true);
  }, [loaded, existing]);

  useEffect(() => {
    onReady?.(ready);
  }, [ready, onReady]);

  const declareReady = () => {
    setReady(true);
    if (!enabled) return;
    void record({
      state: 'complete',
      is_correct: null,
      response: { kind: 'checklist_ready', version: 1, at: new Date().toISOString() },
    });
  };

  const ticks = (mark?.criteria ?? null) as Record<string, boolean> | null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="font-display text-lg text-foreground">
          {payload.heading?.trim() || 'Practical checklist'}
        </h3>
        {assessed && (
          <Badge variant="outline" className="border-primary/40 text-primary">
            Assessed in person
          </Badge>
        )}
      </div>
      <p className="text-xs text-muted-foreground">
        {payload.caption?.trim() || 'Your assessor completes the real sign-off in person.'}
      </p>

      {steps.length ? (
        <ol className="space-y-3">
          {steps.map((step, i) => {
            const ticked = assessed && ticks ? ticks[step.id] === true : false;
            return (
              <li
                key={step.id}
                className={cn('rounded-xl bg-muted/40 p-4', ticked && 'bg-success/[0.08]')}
              >
                <p className="flex items-center gap-2 text-sm font-semibold tabular-nums text-foreground">
                  {ticked && (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-success" aria-hidden="true" />
                  )}
                  <span>
                    {i + 1}. {step.step_title || 'Step'}
                  </span>
                </p>

                {step.instruction?.trim() && (
                  <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
                    {step.instruction}
                  </p>
                )}
                {step.safety_note?.trim() && (
                  <p className="mt-2 flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs leading-relaxed text-foreground">
                    <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-destructive" aria-hidden="true" />
                    <span>{step.safety_note}</span>
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">No steps added yet.</p>
      )}

      {assessed && (
        <div className="flex flex-wrap items-center gap-3">
          {mark ? (
            <Badge
              variant="secondary"
              className={cn('gap-1.5', mark.outcome === 'competent' ? 'text-success' : 'text-foreground')}
            >
              <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
              {mark.outcome === 'competent'
                ? 'Signed off as competent'
                : 'Not yet — your assessor will go through it with you again'}
            </Badge>
          ) : ready ? (
            <Badge variant="secondary" className="gap-1.5">
              <Clock className="h-3.5 w-3.5" aria-hidden="true" />
              Your assessor has been told you’re ready
            </Badge>
          ) : (
            <Button className="pressable" onClick={declareReady}>
              I’m ready to be assessed
            </Button>
          )}
          {mark?.comment?.trim() && (
            <p className="w-full whitespace-pre-line rounded-xl bg-muted/40 p-3 text-sm leading-relaxed text-foreground">
              {mark.comment}
              <span className="mt-1.5 block text-xs text-muted-foreground">
                Signed by {mark.assessor_name}
              </span>
            </p>
          )}
        </div>
      )}
    </div>
  );
}
