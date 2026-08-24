import { ClipboardList, ShieldCheck } from '@/components/icons';
import type { ChecklistPayload } from './types';

/**
 * READ-ONLY practical checklist — a study reference only.
 * Deliberately not tickable, and it never touches practical sign-off,
 * competency records or `practical_attendance`.
 */
export function BlockChecklist({ payload }: { payload: ChecklistPayload }) {
  const steps = payload.steps ?? [];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="font-display text-lg text-foreground">
          {payload.heading?.trim() || 'Practical checklist'}
        </h3>
      </div>
      <p className="text-xs text-muted-foreground">
        {payload.caption?.trim() || 'Your assessor completes the real sign-off in person.'}
      </p>

      {steps.length ? (
        <ol className="space-y-3">
          {steps.map((step, i) => (
            <li key={step.id} className="rounded-xl bg-muted/40 p-4">
              <p className="text-sm font-semibold tabular-nums text-foreground">
                {i + 1}. {step.step_title || 'Step'}
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
          ))}
        </ol>
      ) : (
        <p className="text-sm text-muted-foreground">No steps added yet.</p>
      )}
    </div>
  );
}
