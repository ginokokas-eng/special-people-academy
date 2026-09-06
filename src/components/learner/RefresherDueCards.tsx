/**
 * "Refresher due" cards for the learner dashboard and My Learning.
 *
 * Everything comes from get_due_refreshers, which also picks the three
 * questions the first time a due refresher is asked for. Nothing here writes.
 */

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Clock } from '@/components/icons';
import {
  isStartable,
  kindLabel,
  nextUpcoming,
  REFRESHER_DRAW_COUNT,
  type DueRefresher,
} from '@/lib/refresher';

const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

export function useDueRefreshers(enabled: boolean) {
  const [rows, setRows] = useState<DueRefresher[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_due_refreshers');
      if (cancelled) return;
      if (error) console.error('Error loading refreshers:', error);
      setRows(((data ?? []) as unknown as DueRefresher[]) ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return { rows, loading };
}

export function RefresherDueCards({ enabled }: { enabled: boolean }) {
  const navigate = useNavigate();
  const { rows, loading } = useDueRefreshers(enabled);

  if (!enabled || loading) return null;

  const due = rows.filter((r) => isStartable(r));
  const next = nextUpcoming(rows);

  if (!due.length) {
    if (!next) return null;
    return (
      <p className="text-sm text-muted-foreground">
        Next refresher: {next.course_title ?? 'your course'} on {dateLabel(next.due_at)}.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {due.map((row) => (
        <Card key={row.schedule_id} className="border-primary/40">
          <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">Refresher due</Badge>
                <span className="text-xs text-muted-foreground">{kindLabel(row.kind)}</span>
              </div>
              <p className="mt-1.5 font-medium text-foreground">
                {row.course_title ?? 'Your course'}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                <Clock className="h-4 w-4" aria-hidden="true" />
                {REFRESHER_DRAW_COUNT} quick questions · 2 min · due {dateLabel(row.due_at)}
              </p>
            </div>
            <Button onClick={() => navigate(`/refresher/${row.schedule_id}`)}>Start</Button>
          </CardContent>
        </Card>
      ))}
      {next && (
        <p className="text-sm text-muted-foreground">
          Next refresher: {next.course_title ?? 'your course'} on {dateLabel(next.due_at)}.
        </p>
      )}
    </div>
  );
}

export default RefresherDueCards;
