import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  coursesWithUpdates,
  lessonsNeedingRecompletion,
  type ChangedSinceCompletionRow,
} from '@/lib/contentHistory';

/**
 * Lessons a learner completed whose content has moved on since (Part H).
 *
 * `updatedCourseIds` drives the informational "Updated since you completed"
 * pill; `recompletionLessonIds` only fills when the course itself requires
 * re-completion, and is what `requiredProgress` subtracts.
 */
export function useContentUpdates(enabled = true) {
  const [rows, setRows] = useState<ChangedSinceCompletionRow[]>([]);
  const [loading, setLoading] = useState(enabled);

  useEffect(() => {
    if (!enabled) {
      setRows([]);
      setLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('get_changed_since_completion');
      if (cancelled) return;
      if (error) {
        console.error('Error loading content updates:', error);
        setRows([]);
      } else {
        setRows((data || []) as unknown as ChangedSinceCompletionRow[]);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return {
    rows,
    loading,
    updatedCourseIds: coursesWithUpdates(rows),
    recompletionLessonIds: lessonsNeedingRecompletion(rows),
  };
}
