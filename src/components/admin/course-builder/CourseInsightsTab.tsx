/**
 * Course Builder → Insights.
 *
 * Item analysis for block lessons: which knowledge checks learners get wrong,
 * which distractors pull them, which matching pairs confuse them, and how
 * checkpoints inside a video perform. Read-only; every figure comes from the
 * `lesson_block_item_stats` / `get_lesson_block_learner_detail` RPCs.
 */

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from '@/components/icons';
import { Badge } from '@/components/ui/badge';
import { LessonInsightsPanel } from './LessonInsightsView';
import { RetentionPanel } from './RetentionPanel';
import { EVIDENCE_DISCLAIMER, EVIDENCE_HEADING, groupByFramework } from '@/lib/standards';

interface BlockLesson {
  id: string;
  title: string;
  order_index: number;
  module_title: string | null;
}

export function CourseInsightsTab({ courseId }: { courseId: string }) {
  const [lessons, setLessons] = useState<BlockLesson[]>([]);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, order_index, modules:module_id ( title )')
        .eq('course_id', courseId)
        .eq('lesson_type', 'blocks')
        .order('order_index', { ascending: true });
      if (cancelled) return;
      if (error) console.error('Error loading block lessons:', error);
      const rows: BlockLesson[] = (data ?? []).map((row: Record<string, unknown>) => ({
        id: row.id as string,
        title: (row.title as string) ?? 'Untitled lesson',
        order_index: (row.order_index as number) ?? 0,
        module_title: ((row.modules as { title?: string } | null)?.title as string) ?? null,
      }));
      setLessons(rows);
      setLessonId((prev) => prev ?? rows[0]?.id ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const options = useMemo(
    () =>
      lessons.map((l) => ({
        value: l.id,
        label: l.module_title ? `${l.module_title} · ${l.title}` : l.title,
      })),
    [lessons],
  );

  return (
    <div className="min-w-0 space-y-5">
      <Card className="min-w-0">
        <CardHeader>
          <CardTitle>Lesson insights</CardTitle>
          <CardDescription>
            How learners answered the interactive parts of a lesson. Answers are removed when a block is deleted
            from the lesson.
          </CardDescription>
        </CardHeader>
        <CardContent className="min-w-0">
          {loading ? (
            <div className="flex h-16 items-center">
              <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
            </div>
          ) : !lessons.length ? (
            <p className="text-sm text-muted-foreground">
              This course has no interactive block lessons yet.
            </p>
          ) : (
            <div className="max-w-md">
              <Select value={lessonId ?? undefined} onValueChange={setLessonId}>
                <SelectTrigger aria-label="Lesson" data-testid="insights-lesson-select">
                  <SelectValue placeholder="Choose a lesson" />
                </SelectTrigger>
                <SelectContent>
                  {options.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </CardContent>
      </Card>

      {!!lessons.length && <LessonInsightsPanel lessonId={lessonId} courseId={courseId} />}

      <RetentionPanel courseId={courseId} />

      <StandardsEvidencedCard courseId={courseId} />

    </div>
  );
}

interface CoverageRow {
  framework: string;
  code: string;
  title: string;
  linked_at_course: boolean;
  lesson_count: number;
  lesson_titles: string[];
}

/** Read-only coverage view: which standards this course (or its lessons) evidences. */
function StandardsEvidencedCard({ courseId }: { courseId: string }) {
  const [rows, setRows] = useState<CoverageRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_course_standard_coverage', {
        _course: courseId,
      });
      if (cancelled) return;
      if (error) console.error('Error loading standard coverage:', error);
      setRows((data ?? []) as unknown as CoverageRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  const groups = groupByFramework(rows);

  return (
    <Card className="min-w-0">
      <CardHeader>
        <CardTitle>Standards evidenced</CardTitle>
        <CardDescription>
          {EVIDENCE_HEADING}. {EVIDENCE_DISCLAIMER}
        </CardDescription>
      </CardHeader>
      <CardContent className="min-w-0">
        {loading ? (
          <div className="flex h-16 items-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No standards linked yet — add them on the Overview tab or per lesson.
          </p>
        ) : (
          <div className="space-y-5">
            {groups.map((group) => (
              <div key={group.framework} className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {group.label}
                </p>
                <ul className="space-y-2">
                  {group.rows.map((row) => (
                    <li
                      key={`${row.framework}-${row.code}`}
                      className="rounded-md border border-border px-3 py-2"
                    >
                      <p className="text-sm text-foreground">
                        <span className="text-muted-foreground">{row.code}</span> {row.title}
                      </p>
                      <div className="mt-1.5 flex flex-wrap gap-1.5">
                        {row.linked_at_course && <Badge variant="secondary">Whole course</Badge>}
                        {(row.lesson_titles ?? []).map((title) => (
                          <Badge key={title} variant="outline">
                            {title}
                          </Badge>
                        ))}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}


export default CourseInsightsTab;
