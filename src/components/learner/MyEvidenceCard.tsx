/**
 * Learner → "My evidence".
 *
 * A compact roll-up of the areas a learner's completed work evidences. The RPC
 * only ever returns the signed-in learner's own rows (staff and their assessors
 * aside), and the card hides itself when no lesson is linked to a standard.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  EVIDENCE_DISCLAIMER,
  correctPct,
  formatPct,
  frameworkLabel,
  groupByFramework,
  lessonsLabel,
} from '@/lib/standards';

interface EvidenceRow {
  framework: string;
  code: string;
  title: string;
  lessons_total: number;
  lessons_completed: number;
  blocks_attempted: number;
  blocks_correct: number;
  quiz_best_score: number | null;
  last_activity: string | null;
}

export function MyEvidenceCard({ enabled = true }: { enabled?: boolean }) {
  const [rows, setRows] = useState<EvidenceRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      const { data, error } = await supabase.rpc('get_learner_standard_evidence', {});
      if (cancelled) return;
      if (error) console.error('Error loading standard evidence:', error);
      setRows((data ?? []) as unknown as EvidenceRow[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  if (!enabled || loading) return null;
  const linked = rows.filter((r) => r.lessons_total > 0);
  if (linked.length === 0) return null;

  const groups = groupByFramework(linked);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg">My evidence</CardTitle>
        <CardDescription>
          Areas your completed training evidences. {EVIDENCE_DISCLAIMER}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {groups.map((group) => (
          <div key={group.framework} className="space-y-2">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              {frameworkLabel(group.framework)}
            </p>
            <ul className="space-y-2">
              {group.rows.map((row) => (
                <li
                  key={`${row.framework}-${row.code}`}
                  className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border px-3 py-2"
                >
                  <span className="min-w-0 text-sm text-foreground">
                    <span className="text-muted-foreground">{row.code}</span> {row.title}
                  </span>
                  <span className="flex items-center gap-2">
                    <Badge variant="secondary">
                      {lessonsLabel(row.lessons_completed, row.lessons_total)}
                    </Badge>
                    <Badge variant="outline">
                      {formatPct(correctPct(row.blocks_correct, row.blocks_attempted))} correct
                    </Badge>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default MyEvidenceCard;
