import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Clock, PenTool } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useBlockResponse } from './useBlockResponse';
import { useBlockMark } from './useBlockMark';
import { countWords, type ReflectionPayload, type ReflectionResponse } from './types';

interface BlockReflectionProps {
  payload: ReflectionPayload;
  blockId: string;
  lessonId: string;
  preview?: boolean;
  /** Done-signal: the learner has submitted their answer. */
  onSubmitted: (submitted: boolean) => void;
}

/**
 * A written reflective answer. The learner's words are saved to
 * `lesson_block_responses` (draft while typing, `complete` on submit). Any mark
 * is a separate `block_marks` row written by an assessor — learners only read
 * marks, never write them, and nothing here touches quizzes or certificates.
 */
export function BlockReflection({
  payload,
  blockId,
  lessonId,
  preview,
  onSubmitted,
}: BlockReflectionProps) {
  const enabled = !preview;
  const { existing, loaded, record } = useBlockResponse(blockId, lessonId, enabled);
  const { mark } = useBlockMark(blockId, enabled);

  const [text, setText] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const draftTimer = useRef<number | null>(null);

  // Restore the learner's own words.
  useEffect(() => {
    if (!loaded || !existing) return;
    const prev = existing.response as Partial<ReflectionResponse> | null;
    if (typeof prev?.text === 'string') setText(prev.text);
    if (existing.state === 'complete') setSubmitted(true);
  }, [loaded, existing]);

  useEffect(() => {
    onSubmitted(submitted);
  }, [submitted, onSubmitted]);

  const minWords = payload.min_words ?? 0;
  const words = countWords(text);
  const longEnough = words >= minWords;
  const criteria = (payload.criteria ?? []).filter((c) => c?.trim());
  const readOnly = submitted && !editing;

  /** Debounced draft save, so a half-written answer survives a reload. */
  const onType = (value: string) => {
    setText(value);
    if (!enabled) return;
    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    draftTimer.current = window.setTimeout(() => {
      void record({
        state: 'in_progress',
        is_correct: null,
        response: { kind: 'reflection', version: 1, text: value } satisfies ReflectionResponse,
      });
    }, 1200);
  };

  const submit = async () => {
    if (!longEnough) return;
    setSaving(true);
    if (draftTimer.current) window.clearTimeout(draftTimer.current);
    await record({
      state: 'complete',
      is_correct: null,
      response: {
        kind: 'reflection',
        version: 1,
        text,
        submitted_at: new Date().toISOString(),
      } satisfies ReflectionResponse,
    });
    setSaving(false);
    setSubmitted(true);
    setEditing(false);
  };

  const markLabel =
    mark?.outcome === 'met'
      ? 'Marked as met'
      : mark?.outcome === 'not_yet'
        ? 'Not yet — please have another go'
        : null;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <PenTool className="h-4 w-4 text-primary" aria-hidden="true" />
        <h3 className="font-display text-lg text-foreground">
          {payload.heading?.trim() || 'Your reflection'}
        </h3>
      </div>

      <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
        {payload.prompt?.trim() || 'No question added yet.'}
      </p>
      {payload.guidance?.trim() && (
        <p className="text-xs text-muted-foreground">{payload.guidance}</p>
      )}

      {criteria.length > 0 && (
        <div className="rounded-xl bg-muted/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
            What good looks like
          </p>
          <ul className="mt-1.5 ml-4 list-disc space-y-1 text-xs leading-relaxed text-muted-foreground">
            {criteria.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      <Textarea
        value={text}
        data-testid="reflection-text"
        readOnly={readOnly}
        rows={7}
        aria-label="Your answer"
        placeholder="Write your answer here…"
        onChange={(e) => onType(e.target.value)}
        className={cn(readOnly && 'bg-muted/40')}
      />

      <div className="flex flex-wrap items-center gap-3">
        {!readOnly ? (
          <>
            <Button className="pressable" data-testid="reflection-submit" onClick={() => void submit()} disabled={!longEnough || saving}>
              {submitted ? 'Send again' : 'Submit for marking'}
            </Button>
            <span className="text-xs tabular-nums text-muted-foreground">
              {minWords > 0
                ? `${words} of at least ${minWords} words`
                : `${words} ${words === 1 ? 'word' : 'words'}`}
            </span>
          </>
        ) : (
          <>
            {mark ? (
              <Badge
                variant="secondary"
                data-testid="reflection-mark"
                className={cn(
                  'gap-1.5',
                  mark.outcome === 'met' ? 'text-success' : 'text-foreground'
                )}
              >
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                {markLabel}
              </Badge>
            ) : (
              <Badge variant="secondary" data-testid="reflection-mark" className="gap-1.5">
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                Sent — waiting to be marked
              </Badge>
            )}
            <Button variant="outline" size="sm" onClick={() => setEditing(true)}>
              Edit my answer
            </Button>
          </>
        )}
      </div>

      {readOnly && mark && (
        <div className="rounded-xl bg-muted/40 p-3">
          {mark.comment?.trim() && (
            <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">
              {mark.comment}
            </p>
          )}
          <p className="mt-1.5 text-xs text-muted-foreground">
            Marked by {mark.assessor_name}
          </p>
        </div>
      )}
    </div>
  );
}
