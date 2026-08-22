import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * Persistence for formative in-lesson block answers (`lesson_block_responses`).
 *
 * This is deliberately separate from `quiz_attempts`: nothing here touches
 * quizzes, their attempt limits or the pass/fail escalation logic.
 *
 * In admin preview (`enabled = false`) nothing is read or written.
 */
export interface BlockResponseRow {
  state: 'in_progress' | 'complete';
  is_correct: boolean | null;
  attempt_count: number;
  response: unknown;
}

interface RecordArgs {
  state: 'in_progress' | 'complete';
  is_correct: boolean | null;
  response: unknown;
}

export function useBlockResponse(blockId: string, lessonId: string, enabled: boolean) {
  const { user } = useAuth();
  const [existing, setExisting] = useState<BlockResponseRow | null>(null);
  const [loaded, setLoaded] = useState(false);
  const attemptsRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    if (!enabled || !user?.id || !blockId) {
      setLoaded(true);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('lesson_block_responses')
        .select('state, is_correct, attempt_count, response')
        .eq('block_id', blockId)
        .eq('user_id', user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) console.error('Error loading block response:', error);
      if (data) {
        attemptsRef.current = data.attempt_count ?? 0;
        setExisting(data as BlockResponseRow);
      }
      setLoaded(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled, blockId, user?.id]);

  const record = useCallback(
    async ({ state, is_correct, response }: RecordArgs) => {
      if (!enabled || !user?.id || !blockId || !lessonId) return;
      attemptsRef.current += 1;
      const { error } = await supabase.from('lesson_block_responses').upsert(
        {
          user_id: user.id,
          lesson_id: lessonId,
          block_id: blockId,
          state,
          is_correct,
          attempt_count: attemptsRef.current,
          response: response as never,
        },
        { onConflict: 'user_id,block_id' }
      );
      if (error) console.error('Error saving block response:', error);
    },
    [enabled, user?.id, blockId, lessonId]
  );

  return { existing, loaded, record, attemptCount: attemptsRef.current };
}
