/**
 * Organisation portal → Retention.
 *
 * Spaced refresher results for the organisation's own people, per course, from
 * the org-fenced get_org_retention RPC. Read-only, honest zeros.
 */

import { useEffect, useState } from 'react';

import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from '@/components/icons';
import { RetentionTable, type RetentionRow } from '@/components/admin/course-builder/RetentionPanel';
import { REFRESHER_EXPLAINER } from '@/lib/refresher';

interface OrgRetentionRow extends RetentionRow {
  course_id: string;
  course_title: string | null;
}

export function OrgRetention({ organisationId }: { organisationId: string }) {
  const [rows, setRows] = useState<OrgRetentionRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_org_retention', { _org: organisationId });
      if (cancelled) return;
      if (error) console.error('Error loading org retention:', error);
      setRows((data ?? []) as unknown as OrgRetentionRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  const courses = Array.from(new Set(rows.map((r) => r.course_id)));

  return (
    <div className="min-w-0 space-y-5">
      <p className="text-sm text-muted-foreground">{REFRESHER_EXPLAINER}</p>

      {loading ? (
        <div className="flex h-16 items-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        </div>
      ) : !courses.length ? (
        <p className="text-sm text-muted-foreground">
          No refreshers are scheduled yet. They appear once your people complete a course.
        </p>
      ) : (
        courses.map((courseId) => {
          const courseRows = rows.filter((r) => r.course_id === courseId);
          return (
            <div key={courseId} className="min-w-0 space-y-2">
              <p className="text-sm font-medium text-foreground">
                {courseRows[0]?.course_title ?? 'Course'}
              </p>
              <RetentionTable rows={courseRows} />
            </div>
          );
        })
      )}
    </div>
  );
}

export default OrgRetention;
