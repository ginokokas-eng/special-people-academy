import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, AlertTriangle } from '@/components/icons';
import {
  checkpointIssues,
  mmSsToSeconds,
  newCheckpoint,
  secondsToMmSs,
  supportsCheckpoints,
  videoCheckpoints,
  type VideoCheckpoint,
  type VideoPayload,
} from '@/components/course-learn/blocks/types';

interface Props {
  payload: VideoPayload;
  onChange: (next: VideoPayload) => void;
  idPrefix: string;
}

/**
 * Authoring for in-video checkpoint questions. Formative only — these never
 * touch quizzes or quiz_attempts. Unsupported on pasted YouTube/Vimeo links
 * because those play in their own player and cannot be paused by us.
 */
export function CheckpointEditor({ payload, onChange, idPrefix }: Props) {
  const supported = supportsCheckpoints(payload);
  const checkpoints = videoCheckpoints(payload);

  const update = (list: VideoCheckpoint[]) => onChange({ ...payload, checkpoints: list });

  const patch = (id: string, changes: Partial<VideoCheckpoint>) =>
    update(checkpoints.map((c) => (c.id === id ? { ...c, ...changes } : c)));

  if (!supported) {
    return (
      <div className="rounded-lg border bg-muted p-3">
        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          Checkpoint questions need an uploaded video file. Linked YouTube or Vimeo videos play in
          their own player, so we can’t pause them to ask a question.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-foreground">Checkpoint questions</h4>
          <p className="text-xs text-muted-foreground">
            The video pauses at each time and asks the question. Learners can retry until they get
            it right.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => update([...checkpoints, newCheckpoint(0)])}
        >
          <Plus className="mr-1.5 h-3.5 w-3.5" /> Add checkpoint
        </Button>
      </div>

      {checkpoints.length > 0 && (
        <div className="flex items-center justify-between gap-3 rounded-md bg-muted p-2.5">
          <Label htmlFor={`${idPrefix}-lock-seek`} className="text-xs font-medium">
            Stop learners skipping past an unanswered checkpoint
          </Label>
          <Switch
            id={`${idPrefix}-lock-seek`}
            checked={payload.lock_seek !== false}
            onCheckedChange={(v) => onChange({ ...payload, lock_seek: v })}
          />
        </div>
      )}

      {checkpoints.map((cp, index) => {
        const issues = checkpointIssues(cp);
        return (
          <div key={cp.id} className="space-y-2.5 rounded-md border bg-card p-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Checkpoint {index + 1}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => update(checkpoints.filter((c) => c.id !== cp.id))}
              >
                <Trash2 className="h-3.5 w-3.5" />
                <span className="sr-only">Remove checkpoint {index + 1}</span>
              </Button>
            </div>

            <div className="grid gap-2.5 sm:grid-cols-[8rem_1fr]">
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-cp-${cp.id}-at`}>Time (mm:ss)</Label>
                <Input
                  id={`${idPrefix}-cp-${cp.id}-at`}
                  defaultValue={secondsToMmSs(cp.at_s)}
                  placeholder="1:30"
                  onBlur={(e) => {
                    const secs = mmSsToSeconds(e.target.value);
                    if (secs != null) patch(cp.id, { at_s: secs });
                    e.target.value = secondsToMmSs(secs ?? cp.at_s);
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-cp-${cp.id}-q`}>Question</Label>
                <Input
                  id={`${idPrefix}-cp-${cp.id}-q`}
                  value={cp.question}
                  onChange={(e) => patch(cp.id, { question: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Options (2–4, choose the correct one)</Label>
              {(cp.options ?? []).map((opt, oi) => (
                <div key={opt.id} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name={`${idPrefix}-cp-${cp.id}-correct`}
                    checked={cp.correct_id === opt.id}
                    onChange={() => patch(cp.id, { correct_id: opt.id })}
                    aria-label={`Option ${oi + 1} is correct`}
                    className="h-4 w-4"
                  />
                  <Input
                    value={opt.label}
                    placeholder={`Option ${oi + 1}`}
                    onChange={(e) =>
                      patch(cp.id, {
                        options: cp.options.map((o) =>
                          o.id === opt.id ? { ...o, label: e.target.value } : o
                        ),
                      })
                    }
                  />
                  {cp.options.length > 2 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        patch(cp.id, {
                          options: cp.options.filter((o) => o.id !== opt.id),
                          correct_id:
                            cp.correct_id === opt.id
                              ? (cp.options.find((o) => o.id !== opt.id)?.id ?? '')
                              : cp.correct_id,
                        })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      <span className="sr-only">Remove option {oi + 1}</span>
                    </Button>
                  )}
                </div>
              ))}
              {cp.options.length < 4 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    patch(cp.id, {
                      options: [...cp.options, { id: crypto.randomUUID(), label: '' }],
                    })
                  }
                >
                  <Plus className="mr-1.5 h-3.5 w-3.5" /> Add option
                </Button>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-cp-${cp.id}-exp`}>Explanation (optional)</Label>
              <Textarea
                id={`${idPrefix}-cp-${cp.id}-exp`}
                rows={2}
                value={cp.explanation ?? ''}
                onChange={(e) => patch(cp.id, { explanation: e.target.value })}
              />
            </div>

            {issues.length > 0 && (
              <ul className="space-y-1">
                {issues.map((issue) => (
                  <li key={issue} className="text-xs font-medium text-destructive">
                    {issue}
                  </li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}
