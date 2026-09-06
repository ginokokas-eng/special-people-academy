/**
 * /org → Standards.
 *
 * "Areas this training evidences" — never a compliance rating. Every figure
 * comes from get_org_standard_results, which is fenced on current membership in
 * the database.
 */

import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from '@/components/icons';
import { SectionCard } from '@/components/org/PortalBits';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  EVIDENCE_DISCLAIMER,
  formatPct,
  groupByFramework,
  xOfY,
} from '@/lib/standards';

interface StandardResult {
  framework: string;
  code: string;
  title: string;
  learners: number;
  learners_complete: number;
  avg_correct_pct: number | null;
}

export function OrgStandards({ organisationId }: { organisationId: string }) {
  const [rows, setRows] = useState<StandardResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc('get_org_standard_results', {
        _org: organisationId,
      });
      if (cancelled) return;
      if (error) console.error('Error loading standard results:', error);
      setRows((data ?? []) as unknown as StandardResult[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [organisationId]);

  const groups = groupByFramework(rows);

  return (
    <SectionCard
      title="Areas this training evidences (Care Certificate and CQC key questions)"
      description={EVIDENCE_DISCLAIMER}
    >
      {loading ? (
        <div className="flex h-16 items-center">
          <Loader2 className="h-5 w-5 animate-spin text-primary" aria-hidden="true" />
        </div>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No standards are linked to the courses your team holds yet. Ask your training team to add
          them.
        </p>
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <div key={group.framework} className="min-w-0">
              <p className="mb-2 text-sm font-medium text-foreground">{group.label}</p>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Standard</TableHead>
                      <TableHead className="w-28">Learners</TableHead>
                      <TableHead className="w-28">Complete</TableHead>
                      <TableHead className="w-32">Correct answers</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {group.rows.map((row) => (
                      <TableRow key={`${row.framework}-${row.code}`}>
                        <TableCell className="font-medium">
                          <span className="text-muted-foreground">{row.code}</span> {row.title}
                        </TableCell>
                        <TableCell>{row.learners}</TableCell>
                        <TableCell>{xOfY(row.learners_complete, row.learners)}</TableCell>
                        <TableCell>{formatPct(row.avg_correct_pct, 1)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}

export default OrgStandards;
