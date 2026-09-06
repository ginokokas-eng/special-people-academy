/**
 * Course Builder → Insights → Retention.
 *
 * Read-only view of spaced refreshers for one course: how many were scheduled,
 * how many were answered, and the average recall score. Honest zeros — nothing
 * is estimated.
 */

import { useEffect, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from '@/components/icons';
import { kindLabel, REFRESHER_EXPLAINER, type RefresherKind } from '@/lib/refresher';

export interface RetentionRow {
  kind: RefresherKind;
  scheduled: number;
  ready: number;
  done: number;
  skipped: number;
  avg_score: number | null;
}

export function RetentionTable({ rows }: { rows: RetentionRow[] }) {
  return (
    <div className="min-w-0 overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
            <th className="py-2 pr-4 font-medium">Refresher</th>
            <th className="py-2 pr-4 font-medium">Scheduled</th>
            <th className="py-2 pr-4 font-medium">Waiting</th>
            <th className="py-2 pr-4 font-medium">Answered</th>
            <th className="py-2 pr-4 font-medium">Completion rate</th>
            <th className="py-2 pr-4 font-medium">Missed</th>
            <th className="py-2 font-medium">Average score</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.kind} className="border-b border-border/60 last:border-0">
              <td className="py-2 pr-4 text-foreground">{kindLabel(r.kind)}</td>
              <td className="py-2 pr-4">{r.scheduled}</td>
              <td className="py-2 pr-4">{r.ready}</td>
              <td className="py-2 pr-4">{r.done}</td>
              <td className="py-2 pr-4">
                {r.scheduled ? `${Math.round((100 * r.done) / r.scheduled)}%` : '—'}
              </td>
              <td className="py-2 pr-4">{r.skipped}</td>
              <td className="py-2">{r.avg_score === null ? '—' : `${r.avg_score}%`}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function RetentionPanel({ courseId }: { courseId: string }) {
  const [rows, setRows] = useState<RetentionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_course_retention', { _course: courseId });
      if (cancelled) return;
      if (error) console.error('Error loading retention:', error);
      setRows((data ?? []) as unknown as RetentionRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Retention</CardTitle>
        <CardDescription>{REFRESHER_EXPLAINER}</CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        {loading ? (
          <div className="flex h-16 items-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : (
          <RetentionTable rows={rows} />
        )}
      </CardContent>
    </Card>
  );
}

export default RetentionPanel;
