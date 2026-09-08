/**
 * Shared Lesson Insights rendering: per-block cards plus the learner response
 * table. Fed by the security-definer RPCs, so the fence is in the database:
 * pass `orgId` and an organisation admin only ever receives their own members.
 *
 * Deliberately contains NO timing metric.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { CheckCircle2, Loader2, Search } from '@/components/icons';
import { cn } from '@/lib/utils';
import type {
  BlockPayload,
  DragMatchPayload,
  McqPayload,
  ScenarioPayload,
  VideoPayload,
} from '@/components/course-learn/blocks/types';
import {
  blockLabel,
  blockPrompt,
  correctLabel,
  fmtWhen,
  formatAvgAttempts,
  learnerName,
  mcqCounts,
  optionSharePct,
  optionTallies,
  pctOf,
  stateLabel,
  topDistractor,
  totalPicks,
  type BlockItemStat,
  type LearnerDetailRow,
} from './blockStats';

interface BlockRow {
  id: string;
  block_type: string;
  payload: BlockPayload;
}

export function LessonInsightsPanel({
  lessonId,
  orgId,
  courseId,
}: {
  lessonId: string | null;
  orgId?: string | null;
  /** Set in Course Builder only: enables the "rewrite this question" link. */
  courseId?: string;
}) {
  const [searchParams] = useSearchParams();
  // Test-only overrides so a browser test can force the weak-question CTA on.
  const thresholds = {
    threshold: Number(searchParams.get('rewrite_threshold')) || undefined,
    minLearners: Number(searchParams.get('rewrite_min_learners')) || undefined,
  };
  const [stats, setStats] = useState<BlockItemStat[]>([]);
  const [detail, setDetail] = useState<LearnerDetailRow[]>([]);
  const [blocks, setBlocks] = useState<Record<string, BlockRow>>({});
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');

  const load = useCallback(async () => {
    if (!lessonId) {
      setStats([]);
      setDetail([]);
      setBlocks({});
      return;
    }
    setLoading(true);

    const statsPromise = orgId
      ? supabase.rpc('get_org_lesson_block_stats', { _org: orgId, _lesson: lessonId })
      : supabase.rpc('lesson_block_item_stats', { _lesson: lessonId });

    const [statsRes, detailRes, blocksRes] = await Promise.all([
      statsPromise,
      supabase.rpc('get_lesson_block_learner_detail', {
        _lesson: lessonId,
        ...(orgId ? { _org: orgId } : {}),
      }),
      supabase.from('lesson_blocks').select('id, block_type, payload').eq('lesson_id', lessonId),
    ]);

    if (statsRes.error) console.error('Error loading block stats:', statsRes.error);
    if (detailRes.error) console.error('Error loading learner detail:', detailRes.error);

    setStats((statsRes.data ?? []) as unknown as BlockItemStat[]);
    setDetail((detailRes.data ?? []) as unknown as LearnerDetailRow[]);

    const map: Record<string, BlockRow> = {};
    for (const row of (blocksRes.data ?? []) as unknown as BlockRow[]) map[row.id] = row;
    setBlocks(map);

    setLoading(false);
  }, [lessonId, orgId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredDetail = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return detail;
    return detail.filter(
      (r) =>
        learnerName(r).toLowerCase().includes(q) ||
        (r.email ?? '').toLowerCase().includes(q) ||
        blockLabel(r.block_type).toLowerCase().includes(q),
    );
  }, [detail, query]);

  const anyAnswers = stats.some((s) => s.learners > 0);

  if (!lessonId) {
    return (
      <p className="rounded-xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
        Choose a lesson to see how learners answered.
      </p>
    );
  }

  if (loading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  if (!stats.length || !anyAnswers) {
    return (
      <p className="rounded-xl border border-dashed border-border/70 p-6 text-sm text-muted-foreground">
        No learner answers yet for this lesson.
      </p>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {stats.map((stat) => (
          <BlockInsightCard
            key={stat.block_id}
            stat={stat}
            block={blocks[stat.block_id]}
            courseId={orgId ? undefined : courseId}
            lessonId={lessonId}
            thresholds={thresholds}
          />
        ))}
      </div>

      <Card className="min-w-0">
        <CardContent className="min-w-0 space-y-4 p-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-display text-base text-foreground">Learner answers</h3>
              <p className="text-sm text-muted-foreground">
                {detail.length} {detail.length === 1 ? 'answer' : 'answers'} recorded.
              </p>
            </div>
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
                aria-hidden="true"
              />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search learners"
                aria-label="Search learners"
                className="h-9 w-full pl-9 sm:w-64"
              />
            </div>
          </div>

          <div className="min-w-0 overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Learner</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Block</TableHead>
                  <TableHead>State</TableHead>
                  <TableHead>Correct</TableHead>
                  <TableHead className="text-right">Attempts</TableHead>
                  <TableHead>Last activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDetail.map((row) => (
                  <TableRow key={`${row.user_id}-${row.block_id}`} data-testid="insights-learner-row">
                    <TableCell className="font-medium">{learnerName(row)}</TableCell>
                    <TableCell className="text-muted-foreground">{row.email ?? '—'}</TableCell>
                    <TableCell>{blockLabel(row.block_type)}</TableCell>
                    <TableCell>{stateLabel(row.state)}</TableCell>
                    <TableCell>{correctLabel(row.is_correct)}</TableCell>
                    <TableCell className="text-right tabular-nums">{row.attempt_count}</TableCell>
                    <TableCell className="text-muted-foreground">{fmtWhen(row.updated_at)}</TableCell>
                  </TableRow>
                ))}
                {!filteredDetail.length && (
                  <TableRow>
                    <TableCell colSpan={7} className="py-8 text-center text-sm text-muted-foreground">
                      No learners match that search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/* ------------------------------- block card ------------------------------- */

export function BlockInsightCard({
  stat,
  block,
  courseId,
  lessonId,
  thresholds,
}: {
  stat: BlockItemStat;
  block?: BlockRow;
  courseId?: string;
  lessonId?: string | null;
  thresholds?: RewriteThresholds;
}) {
  const payload = block?.payload;
  const navigate = useNavigate();
  // Only offered in Course Builder, on global figures, for a weak MCQ.
  const canRewrite = !!courseId && !!lessonId && isWeakMcq(stat, thresholds);

  return (
    <Card className="min-w-0" data-testid={`insights-block-card-${stat.block_type}`}>
      <CardContent className="min-w-0 space-y-4 p-5">
        <div className="min-w-0 space-y-1">
          <Badge variant="secondary">{blockLabel(stat.block_type)}</Badge>
          <h3 className="break-words font-display text-base leading-snug text-foreground">
            {blockPrompt(stat.block_type, payload)}
          </h3>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
          <Metric label="Learners" value={String(stat.learners)} />
          <Metric label="Completed" value={`${stat.completed} (${pctOf(stat.completed, stat.learners)}%)`} />
          <Metric
            label={stat.block_type === 'scenario' ? 'Clean first run' : 'Right first time'}
            value={
              stat.block_type === 'scenario' && !(payload as ScenarioPayload | undefined)?.require_best_path
                ? 'Not assessed'
                : `${stat.correct_without_retry} (${pctOf(stat.correct_without_retry, stat.learners)}%)`
            }
          />
          <Metric label="Avg attempts" value={formatAvgAttempts(stat.avg_attempts)} />
        </dl>

        {stat.block_type === 'mcq' && <McqBreakdown stat={stat} payload={payload as McqPayload | undefined} />}
        {stat.block_type === 'drag_match' && (
          <DragMatchBreakdown stat={stat} payload={payload as DragMatchPayload | undefined} />
        )}
        {stat.block_type === 'video' && <VideoBreakdown stat={stat} payload={payload as VideoPayload | undefined} />}
        {stat.block_type === 'scenario' && (
          <ScenarioBreakdown stat={stat} payload={payload as ScenarioPayload | undefined} />
        )}
      </CardContent>
    </Card>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs uppercase tracking-[0.08em] text-muted-foreground">{label}</dt>
      <dd className="font-display text-lg tabular-nums text-foreground">{value}</dd>
    </div>
  );
}

function McqBreakdown({ stat, payload }: { stat: BlockItemStat; payload?: McqPayload }) {
  const counts = mcqCounts(stat);
  const options = payload?.options ?? Object.keys(counts).map((id) => ({ id, label: 'Answer' }));
  const tallies = optionTallies(options, counts, payload?.correct_id);
  const total = totalPicks(counts);
  const distractor = topDistractor(tallies);

  if (!total) return <p className="text-sm text-muted-foreground">No answers picked yet.</p>;

  return (
    <div className="space-y-2.5">
      {tallies.map((t) => {
        const share = optionSharePct(t.count, total);
        return (
          <div key={t.id} className="min-w-0 space-y-1">
            <div className="flex min-w-0 items-center justify-between gap-2 text-sm">
              <span className={cn('flex min-w-0 items-center gap-1.5', t.correct && 'font-medium text-foreground')}>
                {t.correct && <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />}
                <span className="truncate" title={t.label}>
                  {t.label}
                </span>
              </span>
              <span className="shrink-0 tabular-nums text-muted-foreground">
                {t.count} · {share}%
              </span>
            </div>
            <Progress value={share} className="h-1.5" aria-hidden="true" />
          </div>
        );
      })}
      {distractor && (
        <p className="text-sm text-muted-foreground">
          Top distractor: <span className="text-foreground">{distractor.label}</span> — picked {distractor.count}{' '}
          {distractor.count === 1 ? 'time' : 'times'} ({optionSharePct(distractor.count, total)}%).
        </p>
      )}
    </div>
  );
}

function DragMatchBreakdown({ stat, payload }: { stat: BlockItemStat; payload?: DragMatchPayload }) {
  const itemLabel = (id: string) => payload?.items.find((i) => i.id === id)?.label ?? 'Item';
  const targetLabel = (id: string) => payload?.targets.find((t) => t.id === id)?.label ?? 'Group';
  const rows = (stat.confusion ?? []).slice(0, 5);

  if (!rows.length) return <p className="text-sm text-muted-foreground">No wrong placements recorded.</p>;

  return (
    <div className="space-y-1.5">
      <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Most confused</p>
      <ul className="space-y-1 text-sm">
        {rows.map((c) => (
          <li key={`${c.item_id}-${c.target_id}`} className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate">
              {itemLabel(c.item_id)} → {targetLabel(c.target_id)}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">{c.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function VideoBreakdown({ stat, payload }: { stat: BlockItemStat; payload?: VideoPayload }) {
  const entries = Object.entries(stat.option_counts ?? {}).filter(
    ([, v]) => typeof v === 'object' && v !== null,
  ) as [string, { attempts_sum?: number; correct?: number }][];

  if (!entries.length) return <p className="text-sm text-muted-foreground">No checkpoint answers yet.</p>;

  const question = (id: string) =>
    payload?.checkpoints?.find((c) => c.id === id)?.question ?? 'Checkpoint';

  return (
    <div className="space-y-1.5">
      <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Checkpoints</p>
      <ul className="space-y-1 text-sm">
        {entries.map(([id, v]) => (
          <li key={id} className="flex min-w-0 items-center justify-between gap-2">
            <span className="min-w-0 truncate" title={question(id)}>
              {question(id)}
            </span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {v.correct ?? 0} correct · {v.attempts_sum ?? 0} attempts
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScenarioBreakdown({
  stat,
  payload,
}: {
  stat: BlockItemStat;
  payload?: ScenarioPayload;
}) {
  const nodeLabel = (id: string) => {
    const node = payload?.nodes?.find((n) => n.id === id);
    return node?.title?.trim() || node?.slug || 'Ending';
  };
  const choiceLabel = (id: string) => {
    for (const node of payload?.nodes ?? []) {
      const choice = node.choices?.find((c) => c.id === id);
      if (choice) return { label: choice.label || 'Choice', quality: choice.quality };
    }
    return { label: 'Choice', quality: 'acceptable' as const };
  };

  const endings = (stat.confusion ?? []).slice(0, 6);
  const picks = Object.entries(stat.option_counts ?? {})
    .filter(([, v]) => typeof v === 'number')
    .map(([id, count]) => ({ id, count: count as number, ...choiceLabel(id) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  if (!endings.length && !picks.length) {
    return <p className="text-sm text-muted-foreground">No scenario runs recorded yet.</p>;
  }

  return (
    <div className="space-y-3">
      {endings.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Endings reached</p>
          <ul className="space-y-1 text-sm">
            {endings.map((e) => (
              <li key={`${e.item_id}-${e.target_id}`} className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 truncate" title={nodeLabel(e.item_id)}>
                  {nodeLabel(e.item_id)}
                  {e.target_id === 'unsafe' && (
                    <span className="ml-1.5 text-muted-foreground">(unsafe choice on the way)</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{e.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {picks.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-xs uppercase tracking-[0.08em] text-muted-foreground">Most-taken choices</p>
          <ul className="space-y-1 text-sm">
            {picks.map((p) => (
              <li key={p.id} className="flex min-w-0 items-center justify-between gap-2">
                <span className="min-w-0 truncate" title={p.label}>
                  {p.label}
                  {p.quality === 'unsafe' && (
                    <span className="ml-1.5 text-destructive">unsafe</span>
                  )}
                </span>
                <span className="shrink-0 tabular-nums text-muted-foreground">{p.count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
