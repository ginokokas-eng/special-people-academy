import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { ChevronDown, Loader2, RefreshCw } from '@/components/icons';
import { toast } from 'sonner';
import { diffFields, formatDiffValue } from '@/lib/contentHistory';

interface HistoryRow {
  id: string;
  table_name: string;
  row_id: string;
  lesson_id: string | null;
  actor: string | null;
  action: string;
  material: boolean;
  note: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  at: string;
}

const ACTION_LABEL: Record<string, string> = {
  insert: 'Added',
  update: 'Changed',
  delete: 'Removed',
};

/**
 * Read-only change timeline for a course, straight from `content_history`
 * (trigger-written — nothing here is authored by the client).
 */
export function CourseHistoryTab({ courseId }: { courseId: string }) {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [names, setNames] = useState<Record<string, string>>({});
  const [lessonTitles, setLessonTitles] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('content_history')
        .select('*')
        .eq('course_id', courseId)
        .order('at', { ascending: false })
        .limit(200);
      if (error) throw error;
      const history = (data || []) as unknown as HistoryRow[];
      setRows(history);

      const actorIds = [...new Set(history.map((r) => r.actor).filter(Boolean))] as string[];
      if (actorIds.length) {
        const { data: profiles } = await supabase
          .from('profiles')
          .select('user_id, full_name')
          .in('user_id', actorIds);
        setNames(
          Object.fromEntries(
            (profiles || []).map((p) => [p.user_id as string, (p.full_name as string) || 'Unknown'])
          )
        );
      }

      const { data: lessons } = await supabase
        .from('lessons')
        .select('id, title')
        .eq('course_id', courseId);
      setLessonTitles(Object.fromEntries((lessons || []).map((l) => [l.id, l.title])));
    } catch (error) {
      console.error('Error loading content history:', error);
      toast.error('Could not load the change history');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    void load();
  }, [load]);

  const describe = (row: HistoryRow) => {
    if (row.table_name === 'courses') return 'Course settings';
    if (row.table_name === 'lessons') {
      const title =
        lessonTitles[row.row_id] ||
        (row.after?.title as string) ||
        (row.before?.title as string) ||
        'Lesson';
      return `Lesson: ${title}`;
    }
    const blockType = (row.after?.block_type as string) || (row.before?.block_type as string) || 'block';
    const lessonTitle = row.lesson_id ? lessonTitles[row.lesson_id] : undefined;
    return lessonTitle
      ? `${blockType.replace(/_/g, ' ')} block in “${lessonTitle}”`
      : `${blockType.replace(/_/g, ' ')} block`;
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle>History</CardTitle>
          <CardDescription>
            Every change to this course, its lessons and its blocks — who made it, when, and whether
            it changed what learners must know.
          </CardDescription>
        </div>
        <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
          {loading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          Refresh
        </Button>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading history…
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">No changes recorded yet.</p>
        ) : (
          <ol className="space-y-3">
            {rows.map((row) => {
              const diffs = diffFields(row.before, row.after);
              return (
                <li key={row.id} className="rounded-lg border border-border p-3">
                  <Collapsible>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="secondary">{ACTION_LABEL[row.action] || row.action}</Badge>
                      <span className="text-sm font-medium text-foreground">{describe(row)}</span>
                      {row.material && <Badge>Changes what learners must know</Badge>}
                      <span className="text-xs text-muted-foreground">
                        {new Date(row.at).toLocaleString('en-GB')} ·{' '}
                        {row.actor ? names[row.actor] || 'Unknown' : 'System'}
                      </span>
                      {diffs.length > 0 && (
                        <CollapsibleTrigger asChild>
                          <Button variant="ghost" size="sm" className="ml-auto">
                            <ChevronDown className="mr-1 h-4 w-4" />
                            {diffs.length} {diffs.length === 1 ? 'field' : 'fields'}
                          </Button>
                        </CollapsibleTrigger>
                      )}
                    </div>
                    {row.note && (
                      <p className="mt-1 text-sm text-muted-foreground">“{row.note}”</p>
                    )}
                    <CollapsibleContent className="mt-3 space-y-2">
                      {diffs.map((diff) => (
                        <div key={diff.key} className="rounded-md bg-muted/60 p-2 text-xs">
                          <p className="font-medium text-foreground">{diff.key.replace(/_/g, ' ')}</p>
                          <p className="text-muted-foreground">
                            <span className="line-through">{formatDiffValue(diff.before)}</span>{' '}
                            → <span className="text-foreground">{formatDiffValue(diff.after)}</span>
                          </p>
                        </div>
                      ))}
                    </CollapsibleContent>
                  </Collapsible>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
