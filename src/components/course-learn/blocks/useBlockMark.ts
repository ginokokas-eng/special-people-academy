import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * READ-ONLY access to the assessor's mark for one block, for the signed-in
 * learner. Learners have no insert/update path here — marks are written only by
 * assessors through the `record_reflection_mark` / `record_observation` RPCs.
 */
export interface BlockMark {
  id: string;
  kind: 'reflection' | 'observation';
  outcome: 'met' | 'not_yet' | 'competent' | 'not_competent';
  comment: string | null;
  assessor_name: string;
  signed_at: string;
  criteria: Record<string, boolean> | null;
}

export function useBlockMark(blockId: string, enabled: boolean) {
  const { user } = useAuth();
  const [mark, setMark] = useState<BlockMark | null>(null);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!enabled || !user?.id || !blockId) {
      setLoaded(true);
      return;
    }
    const { data, error } = await supabase
      .from('block_marks')
      .select('id, kind, outcome, comment, assessor_name, signed_at, criteria')
      .eq('block_id', blockId)
      .eq('user_id', user.id)
      .order('signed_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (error) console.error('Error loading block mark:', error);
    setMark((data as BlockMark | null) ?? null);
    setLoaded(true);
  }, [enabled, user?.id, blockId]);

  useEffect(() => {
    void load();
  }, [load]);

  return { mark, loaded, reload: load };
}
