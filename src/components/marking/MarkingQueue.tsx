import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Skeleton } from '@/components/ui/skeleton';
import { CheckCircle2, ClipboardList, PenTool } from '@/components/icons';
import type {
  ChecklistPayload,
  ReflectionPayload,
  ReflectionResponse,
} from '@/components/course-learn/blocks/types';

interface QueueRow {
  block_id: string;
  block_type: string;
  lesson_id: string;
  lesson_title: string;
  course_id: string;
  course_title: string;
  user_id: string;
  full_name: string | null;
  email: string | null;
  submitted_at: string | null;
  response: unknown;
  payload: unknown;
  marked: boolean;
  mark_outcome: string | null;
  mark_comment: string | null;
  mark_signed_at: string | null;
}

/**
 * Marking queue for reflective answers and assessed practical checklists.
 *
 * Everything is read through the org-fenced `get_marking_queue` RPC, and marks
 * are written only by `record_reflection_mark` / `record_observation`, so a
 * learner can never mark their own work. Marks are never edited — a new mark
 * replaces the old one in the learner's view, and the history is kept.
 */
export function MarkingQueue({ organisationId }: { organisationId?: string }) {
  const { user } = useAuth();
  const [rows, setRows] = useState<QueueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showMarked, setShowMarked] = useState(false);
  const [open, setOpen] = useState<QueueRow | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.rpc('get_marking_queue', {
      ...(organisationId ? { _org: organisationId } : {}),
    });
    if (error) {
      console.error('Error loading marking queue:', error);
      toast.error('Could not load the marking list.');
    }
    setRows((data as QueueRow[] | null) ?? []);
    setLoading(false);
  }, [organisationId]);

  useEffect(() => {
    void load();
  }, [load]);

  const visible = useMemo(
    () => rows.filter((r) => (showMarked ? true : !r.marked)),
    [rows, showMarked]
  );
  const pendingCount = rows.filter((r) => !r.marked).length;

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-20 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {pendingCount === 0
            ? 'Nothing is waiting to be marked.'
            : `${pendingCount} waiting to be marked.`}
        </p>
        <Button variant="outline" size="sm" onClick={() => setShowMarked((v) => !v)}>
          {showMarked ? 'Show only what needs marking' : 'Show marked work too'}
        </Button>
      </div>

      {visible.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Nothing to show here yet.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {visible.map((row) => (
            <Card key={`${row.block_id}-${row.user_id}`} data-testid={`marking-row-${row.block_id}-${row.user_id}`}>
              <CardContent className="flex flex-wrap items-center justify-between gap-3 py-4">
                <div className="min-w-0">
                  <p className="flex items-center gap-2 text-sm font-semibold text-foreground">
                    {row.block_type === 'reflection' ? (
                      <PenTool className="h-4 w-4 text-primary" aria-hidden="true" />
                    ) : (
                      <ClipboardList className="h-4 w-4 text-primary" aria-hidden="true" />
                    )}
                    <span className="break-words">{row.full_name || row.email || 'Learner'}</span>
                  </p>
                  <p className="mt-1 break-words text-xs text-muted-foreground">
                    {row.course_title} · {row.lesson_title}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {row.marked ? (
                    <Badge variant="secondary" className="gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      {row.mark_outcome === 'met' || row.mark_outcome === 'competent'
                        ? 'Marked'
                        : 'Not yet'}
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="border-primary/40 text-primary">
                      Needs marking
                    </Badge>
                  )}
                  <Button size="sm" data-testid="marking-open" onClick={() => setOpen(row)}>
                    {row.block_type === 'reflection' ? 'Read and mark' : 'Record observation'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {open && (
        <MarkDialog
          row={open}
          defaultName={user?.user_metadata?.full_name ?? ''}
          onClose={() => setOpen(null)}
          onSaved={() => {
            setOpen(null);
            void load();
          }}
        />
      )}
    </div>
  );
}

function MarkDialog({
  row,
  defaultName,
  onClose,
  onSaved,
}: {
  row: QueueRow;
  defaultName: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isReflection = row.block_type === 'reflection';
  const [name, setName] = useState(defaultName);
  const [comment, setComment] = useState('');
  const [ticks, setTicks] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);

  const reflectionPayload = row.payload as ReflectionPayload | null;
  const checklistPayload = row.payload as ChecklistPayload | null;
  const answer = (row.response as Partial<ReflectionResponse> | null)?.text ?? '';
  const steps = checklistPayload?.steps ?? [];

  const save = async (outcome?: 'met' | 'not_yet') => {
    if (!name.trim()) {
      toast.error('Please type your name to sign this.');
      return;
    }
    setSaving(true);
    const { error } = isReflection
      ? await supabase.rpc('record_reflection_mark', {
          _block_id: row.block_id,
          _user_id: row.user_id,
          _outcome: outcome ?? 'met',
          _comment: comment,
          _assessor_name: name.trim(),
        })
      : await supabase.rpc('record_observation', {
          _block_id: row.block_id,
          _user_id: row.user_id,
          _criteria: ticks as never,
          _comment: comment,
          _assessor_name: name.trim(),
        });
    setSaving(false);
    if (error) {
      console.error('Error saving mark:', error);
      toast.error(error.message || 'Could not save this.');
      return;
    }
    toast.success('Saved.');
    onSaved();
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>
            {isReflection ? 'Reflective answer' : 'Practical observation'}
          </DialogTitle>
          <DialogDescription>
            {row.full_name || row.email || 'Learner'} · {row.course_title} · {row.lesson_title}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {isReflection ? (
            <>
              <div className="rounded-xl bg-muted/40 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  The question
                </p>
                <p className="mt-1 whitespace-pre-line text-sm text-foreground">
                  {reflectionPayload?.prompt}
                </p>
                {(reflectionPayload?.criteria ?? []).length > 0 && (
                  <ul className="mt-2 ml-4 list-disc space-y-1 text-xs text-muted-foreground">
                    {(reflectionPayload?.criteria ?? []).map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                )}
              </div>
              <div>
                <Label>Their answer</Label>
                <p className="mt-1.5 whitespace-pre-line rounded-xl border bg-card p-3 text-sm leading-relaxed text-foreground">
                  {answer || 'No words saved.'}
                </p>
              </div>
            </>
          ) : (
            <div className="space-y-2">
              <Label>Tick each step you saw done safely</Label>
              {steps.map((step, i) => (
                <label
                  key={step.id}
                  className="flex items-start gap-3 rounded-xl bg-muted/40 p-3 text-sm"
                >
                  <Checkbox
                    checked={ticks[step.id] === true}
                    onCheckedChange={(v) =>
                      setTicks((prev) => ({ ...prev, [step.id]: v === true }))
                    }
                  />
                  <span className="text-foreground">
                    {i + 1}. {step.step_title || 'Step'}
                  </span>
                </label>
              ))}
              {steps.length === 0 && (
                <p className="text-sm text-muted-foreground">This checklist has no steps.</p>
              )}
            </div>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="mark-comment">Feedback for the learner (optional)</Label>
            <Textarea
              id="mark-comment"
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="What was good, and anything to work on."
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="mark-name">Your full name (this signs the record)</Label>
            <Input
              id="mark-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {isReflection ? (
              <>
                <Button disabled={saving} data-testid="marking-outcome-met" onClick={() => void save('met')}>
                  Mark as met
                </Button>
                <Button variant="outline" disabled={saving} onClick={() => void save('not_yet')}>
                  Not yet
                </Button>
              </>
            ) : (
              <Button disabled={saving} data-testid="marking-save" onClick={() => void save()}>
                Save observation
              </Button>
            )}
            <Button variant="ghost" disabled={saving} onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
