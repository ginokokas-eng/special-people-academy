/**
 * Spaced refresher: three quick recall questions, 7 and 30 days after a course
 * completion. Server graded — start_refresher never returns the correct answer,
 * submit_refresher grades against the stored snapshot and returns feedback.
 */

import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, CheckCircle2, Loader2 } from '@/components/icons';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { ListenButton } from '@/components/course-learn/blocks/ListenButton';
import { kindLabel, refresherErrorMessage, type RefresherKind } from '@/lib/refresher';

interface StartQuestion {
  question_id: string;
  stem: string;
  options: string[];
}

interface StartPayload {
  schedule_id: string;
  course_id: string;
  course_title: string | null;
  kind: RefresherKind;
  due_at: string;
  questions: StartQuestion[];
}

interface ResultRow {
  question_id: string;
  stem: string;
  is_correct: boolean;
  correct_label: string | null;
  explanation: string | null;
}

interface SubmitPayload {
  score: number;
  correct_count: number;
  total: number;
  results: ResultRow[];
}

export default function Refresher() {
  const { scheduleId } = useParams<{ scheduleId: string }>();
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [payload, setPayload] = useState<StartPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitPayload | null>(null);

  useEffect(() => {
    if (!authLoading && !user) navigate('/auth');
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (!user || !scheduleId) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error: rpcError } = await supabase.rpc('start_refresher', {
        _schedule_id: scheduleId,
      });
      if (cancelled) return;
      if (rpcError) {
        setError(refresherErrorMessage(rpcError.message));
      } else {
        setPayload(data as unknown as StartPayload);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, scheduleId]);

  const submit = async () => {
    if (!scheduleId) return;
    setSubmitting(true);
    const { data, error: rpcError } = await supabase.rpc('submit_refresher', {
      _schedule_id: scheduleId,
      _answers: answers,
    });
    setSubmitting(false);
    if (rpcError) {
      toast({
        title: 'Could not submit',
        description: refresherErrorMessage(rpcError.message),
        variant: 'destructive',
      });
      return;
    }
    const row = (data as unknown as SubmitPayload[])?.[0];
    if (row) setResult(row);
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden="true" />
        </div>
      </DashboardLayout>
    );
  }

  const back = (
    <Button variant="outline" onClick={() => navigate('/my-learning')}>
      Back to My Learning
    </Button>
  );

  if (error || !payload) {
    return (
      <DashboardLayout>
        <Card className="mx-auto max-w-2xl">
          <CardContent className="space-y-4 py-10 text-center">
            <p className="text-muted-foreground">
              {error ?? 'This refresher is no longer available.'}
            </p>
            {back}
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const questions = payload.questions ?? [];

  if (!questions.length) {
    return (
      <DashboardLayout>
        <Card className="mx-auto max-w-2xl">
          <CardContent className="space-y-4 py-10 text-center">
            <p className="text-muted-foreground">
              No refresher questions are available for this course yet.
            </p>
            {back}
          </CardContent>
        </Card>
      </DashboardLayout>
    );
  }

  const allAnswered = questions.every((q) => typeof answers[q.question_id] === 'number');

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-2xl space-y-6">
        <div className="page-heading">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{kindLabel(payload.kind)}</Badge>
            <span className="text-sm text-muted-foreground">
              {questions.length} quick questions · 2 min
            </span>
          </div>
          <h1 className="mt-2 text-3xl font-bold text-foreground">
            {payload.course_title ?? 'Refresher'}
          </h1>
          <p className="mt-1 text-muted-foreground">
            A short recall check. It does not change your completion or your certificate.
          </p>
        </div>

        {result ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>
                  You got {result.correct_count} of {result.total} right ({result.score}%)
                </CardTitle>
              </CardHeader>
            </Card>
            {result.results.map((row) => (
              <Card key={row.question_id}>
                <CardContent className="space-y-2 py-5">
                  <div
                    className={cn(
                      'inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-[0.12em]',
                      row.is_correct ? 'text-success' : 'text-destructive',
                    )}
                  >
                    {row.is_correct ? (
                      <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
                    ) : (
                      <AlertTriangle className="h-4 w-4" aria-hidden="true" />
                    )}
                    {row.is_correct ? 'Correct' : 'Not quite'}
                  </div>
                  <p className="font-medium text-foreground">{row.stem}</p>
                  {!row.is_correct && row.correct_label && (
                    <p className="text-sm text-foreground">
                      The right answer was: {row.correct_label}
                    </p>
                  )}
                  {row.explanation && (
                    <p className="text-sm text-muted-foreground">{row.explanation}</p>
                  )}
                </CardContent>
              </Card>
            ))}
            {back}
          </div>
        ) : (
          <div className="space-y-5">
            {questions.map((q, qi) => (
              <Card key={q.question_id}>
                <CardContent className="space-y-3 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-display text-lg leading-snug text-foreground">
                      {qi + 1}. {q.stem}
                    </p>
                    <ListenButton passages={[q.stem, ...(q.options ?? [])]} />
                  </div>
                  <div className="space-y-2.5" role="group" aria-label="Answer options">
                    {(q.options ?? []).map((label, index) => {
                      const chosen = answers[q.question_id] === index;
                      return (
                        <button
                          key={`${q.question_id}-${index}`}
                          type="button"
                          aria-pressed={chosen}
                          onClick={() =>
                            setAnswers((prev) => ({ ...prev, [q.question_id]: index }))
                          }
                          className={cn(
                            'pressable flex w-full items-start gap-2.5 rounded-xl border-2 p-3.5 text-left text-sm',
                            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                            chosen
                              ? 'border-primary bg-primary/[0.08]'
                              : 'border-border/70 bg-card hover:border-primary/50',
                          )}
                        >
                          <span className="font-medium text-foreground">{label}</span>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ))}

            <div className="flex flex-wrap items-center gap-3">
              <Button onClick={submit} disabled={submitting || !allAnswered}>
                {submitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                ) : null}
                Submit answers
              </Button>
              {back}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
