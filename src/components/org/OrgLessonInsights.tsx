/**
 * /org → Insights.
 *
 * The same per-block cards and learner table as the admin Insights tab, fed by
 * the organisation-scoped RPCs. The membership fence lives in the database, so
 * an organisation admin can never receive rows for people outside their org.
 */

import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from '@/components/icons';
import { LessonInsightsPanel } from '@/components/admin/course-builder/LessonInsightsView';
import { PortalCard } from '@/components/org/PortalBits';
import type { OrgLicence } from '@/components/org/useOrgLicences';

interface BlockLesson {
  id: string;
  title: string;
}

export function OrgLessonInsights({
  organisationId,
  licences,
}: {
  organisationId: string;
  licences: OrgLicence[];
}) {
  const courses = useMemo(() => {
    const seen = new Map<string, string>();
    for (const l of licences) if (!seen.has(l.course_id)) seen.set(l.course_id, l.course_title);
    return [...seen].map(([id, title]) => ({ id, title }));
  }, [licences]);

  const [courseId, setCourseId] = useState<string | null>(null);
  const [lessons, setLessons] = useState<BlockLesson[]>([]);
  const [lessonId, setLessonId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setCourseId((prev) => prev ?? courses[0]?.id ?? null);
  }, [courses]);

  useEffect(() => {
    let cancelled = false;
    if (!courseId) {
      setLessons([]);
      setLessonId(null);
      return;
    }
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from('lessons')
        .select('id, title')
        .eq('course_id', courseId)
        .eq('lesson_type', 'blocks')
        .order('order_index', { ascending: true });
      if (cancelled) return;
      const rows = (data ?? []).map((r) => ({ id: r.id as string, title: (r.title as string) ?? 'Lesson' }));
      setLessons(rows);
      setLessonId(rows[0]?.id ?? null);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [courseId]);

  if (!courses.length) {
    return (
      <PortalCard className="p-6">
        <p className="text-sm text-muted-foreground">
          Insights appear once your organisation holds a licence for a course.
        </p>
      </PortalCard>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <PortalCard className="min-w-0 space-y-4 p-5 sm:p-6">
        <div>
          <h3 className="font-display text-[16px] text-foreground">Lesson insights</h3>
          <p className="text-sm text-muted-foreground">
            How your people answered the interactive parts of a lesson. Answers are removed when a block is deleted
            from the lesson.
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Select value={courseId ?? undefined} onValueChange={setCourseId}>
            <SelectTrigger aria-label="Course">
              <SelectValue placeholder="Choose a course" />
            </SelectTrigger>
            <SelectContent>
              {courses.map((c) => (
                <SelectItem key={c.id} value={c.id}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={lessonId ?? undefined} onValueChange={setLessonId} disabled={!lessons.length}>
            <SelectTrigger aria-label="Lesson">
              <SelectValue placeholder={lessons.length ? 'Choose a lesson' : 'No interactive lessons'} />
            </SelectTrigger>
            <SelectContent>
              {lessons.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </PortalCard>

      {loading ? (
        <div className="flex h-24 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        </div>
      ) : (
        <LessonInsightsPanel lessonId={lessonId} orgId={organisationId} />
      )}
    </div>
  );
}
