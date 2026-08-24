import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Read-only helper: which of the given lessons hold a graded quiz where the
 * learner has used every allowed attempt without passing. Used purely to
 * surface the next-step line — no grading or attempt recording happens here.
 */
export function useLockedQuizLessons(lessonIds: string[]): Set<string> {
  const { user } = useAuth();
  const key = lessonIds.slice().sort().join(',');
  const [locked, setLocked] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    const ids = key ? key.split(',') : [];
    if (!user || ids.length === 0) {
      setLocked(new Set());
      return;
    }

    (async () => {
      const { data: quizzes } = await supabase
        .from('quizzes')
        .select('id, lesson_id, attempts_allowed')
        .in('lesson_id', ids);

      const limited = (quizzes || []).filter(
        (q) => (q.attempts_allowed ?? 0) > 0 && q.lesson_id
      );
      if (limited.length === 0) {
        if (!cancelled) setLocked(new Set());
        return;
      }

      const { data: attempts } = await supabase
        .from('quiz_attempts')
        .select('quiz_id, passed')
        .eq('user_id', user.id)
        .in(
          'quiz_id',
          limited.map((q) => q.id)
        );

      const next = new Set<string>();
      for (const quiz of limited) {
        const rows = (attempts || []).filter((a) => a.quiz_id === quiz.id);
        const passed = rows.some((a) => a.passed);
        if (!passed && rows.length >= (quiz.attempts_allowed ?? 0)) {
          next.add(quiz.lesson_id as string);
        }
      }
      if (!cancelled) setLocked(next);
    })();

    return () => {
      cancelled = true;
    };
  }, [user, key]);

  return locked;
}
