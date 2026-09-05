import { useCallback, useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { ChevronRight, RotateCcw } from '@/components/icons';
import { SignedImage } from './SignedImage';
import { useBlockResponse } from './useBlockResponse';
import {
  trimScenarioRuns,
  type ScenarioChoice,
  type ScenarioNode,
  type ScenarioPayload,
  type ScenarioQuality,
  type ScenarioResponse,
  type ScenarioRun,
  type ScenarioStep,
} from './types';

interface BlockScenarioProps {
  payload: ScenarioPayload;
  blockId: string;
  lessonId: string;
  preview?: boolean;
  /** Done-signal: any run has reached an ending. */
  onFinished: (finished: boolean) => void;
}

/** Quality tint for feedback and choice state, using the brand wash tokens. */
const QUALITY_STYLES: Record<ScenarioQuality, { wrap: string; label: string }> = {
  best: {
    wrap: 'border-success bg-success/[0.12]',
    label: 'Good call',
  },
  acceptable: {
    wrap: 'border-[hsl(var(--wash-amber))] bg-[hsl(var(--wash-amber)/0.12)]',
    label: 'Workable',
  },
  unsafe: {
    wrap: 'border-[hsl(var(--wash-coral))] bg-[hsl(var(--wash-coral)/0.12)]',
    label: 'Unsafe',
  },
};

const nowIso = () => new Date().toISOString();

/**
 * Branching scenario. One node on screen at a time; choices reveal feedback in
 * place, then Continue advances. Formative only — this never touches `quizzes`
 * or `quiz_attempts`, and a learner can always start again.
 *
 * The gate is satisfied once ANY run reaches an ending, so trickle can never
 * deadlock on a scenario.
 */
export function BlockScenario({
  payload,
  blockId,
  lessonId,
  preview,
  onFinished,
}: BlockScenarioProps) {
  const enabled = !preview;
  const { existing, loaded, record } = useBlockResponse(blockId, lessonId, enabled);

  const nodes = payload.nodes ?? [];
  const byId = useMemo(() => new Map(nodes.map((n) => [n.id, n])), [nodes]);

  const [runs, setRuns] = useState<ScenarioRun[]>([]);
  const [startedAt, setStartedAt] = useState<string>(() => nowIso());
  const [path, setPath] = useState<ScenarioStep[]>([]);
  const [currentId, setCurrentId] = useState<string>(payload.start_id);
  const [picked, setPicked] = useState<string | null>(null);
  const [restored, setRestored] = useState(false);

  const current: ScenarioNode | undefined = byId.get(currentId) ?? byId.get(payload.start_id);
  const finished = current?.kind === 'end';

  /* -------------------------------- restore -------------------------------- */
  useEffect(() => {
    if (!loaded || restored) return;
    setRestored(true);
    const stored = (existing?.response ?? null) as ScenarioResponse | null;
    if (!stored || stored.kind !== 'scenario') return;
    const prevRuns = Array.isArray(stored.runs) ? stored.runs : [];
    setRuns(prevRuns);
    const latest = prevRuns[prevRuns.length - 1];
    if (latest && byId.has(latest.end_node_id)) {
      setPath(latest.path ?? []);
      setStartedAt(latest.started_at);
      setCurrentId(latest.end_node_id);
      return;
    }
    if (stored.current?.path?.length) {
      const last = stored.current.path[stored.current.path.length - 1];
      const node = byId.get(last.node_id);
      const choice = node?.choices?.find((c) => c.id === last.choice_id);
      const resumeAt = choice?.next_id;
      setPath(stored.current.path);
      setStartedAt(stored.current.started_at);
      if (resumeAt && byId.has(resumeAt)) setCurrentId(resumeAt);
    }
  }, [loaded, restored, existing, byId]);

  useEffect(() => {
    onFinished(runs.length > 0 || finished);
  }, [runs.length, finished, onFinished]);

  /* ------------------------------- persistence ----------------------------- */
  const save = useCallback(
    (nextRuns: ScenarioRun[], nextCurrent: ScenarioResponse['current']) => {
      const trimmed = trimScenarioRuns(nextRuns);
      const complete = trimmed.length > 0;
      void record({
        state: complete ? 'complete' : 'in_progress',
        is_correct: payload.require_best_path ? trimmed.some((r) => r.is_clean) : null,
        response: {
          kind: 'scenario',
          version: 1,
          runs: trimmed,
          ...(nextCurrent ? { current: nextCurrent } : {}),
        } satisfies ScenarioResponse,
      });
      return trimmed;
    },
    [record, payload.require_best_path]
  );

  const isUnsafe = (step: ScenarioStep) => {
    const node = byId.get(step.node_id);
    return node?.choices?.find((c) => c.id === step.choice_id)?.quality === 'unsafe';
  };

  /* --------------------------------- actions ------------------------------- */
  const choose = (choice: ScenarioChoice) => {
    if (picked) return;
    setPicked(choice.id);
    const nextPath = [...path, { node_id: currentId, choice_id: choice.id }];
    setPath(nextPath);
    save(runs, { started_at: startedAt, path: nextPath });
  };

  const advance = (targetId: string, fromPath: ScenarioStep[]) => {
    setPicked(null);
    setCurrentId(targetId);
    const target = byId.get(targetId);
    if (target?.kind !== 'end') return;
    const run: ScenarioRun = {
      started_at: startedAt,
      ended_at: nowIso(),
      end_node_id: targetId,
      is_clean: !fromPath.some(isUnsafe),
      path: fromPath,
    };
    const next = [...runs, run];
    setRuns(save(next, undefined));
  };

  const restart = () => {
    setPicked(null);
    setPath([]);
    setStartedAt(nowIso());
    setCurrentId(payload.start_id);
  };

  const pickedChoice = current?.choices?.find((c) => c.id === picked) ?? null;
  const unsafeCount = path.filter(isUnsafe).length;

  /* -------------------------------- rendering ------------------------------ */
  const breadcrumb = path
    .map((step) => byId.get(step.node_id)?.choices?.find((c) => c.id === step.choice_id)?.label)
    .filter(Boolean) as string[];

  if (!current) {
    return <p className="text-sm text-muted-foreground">This scenario has no content yet.</p>;
  }

  const media = current.image_path ? { source: 'storage' as const, path: current.image_path } : null;

  return (
    <div className="space-y-3">
      {breadcrumb.length > 0 && (
        <nav aria-label="Your choices so far" className="flex flex-wrap items-center gap-1.5">
          {breadcrumb.map((label, i) => (
            <span key={`${label}-${i}`} className="flex items-center gap-1.5">
              {i > 0 && (
                <ChevronRight className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              )}
              <Badge variant="secondary" className="max-w-[16rem] truncate">
                {label}
              </Badge>
            </span>
          ))}
        </nav>
      )}

      <div key={current.id} className="material-in space-y-3">
        {current.title?.trim() && (
          <h3 className="font-display text-lg leading-snug text-foreground">{current.title}</h3>
        )}
        {media && (
          <div className="overflow-hidden rounded-xl bg-card shadow-learner">
            <SignedImage media={media} alt={current.title || 'Scenario image'} className="max-h-[420px]" />
          </div>
        )}
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground">{current.body}</p>

        {current.kind === 'decision' && (
          <div className="space-y-2.5" role="group" aria-label="What do you do?">
            {(current.choices ?? []).map((choice) => {
              const chosen = picked === choice.id;
              const style = QUALITY_STYLES[choice.quality] ?? QUALITY_STYLES.acceptable;
              return (
                <button
                  key={choice.id}
                  type="button"
                  onClick={() => choose(choice)}
                  disabled={!!picked && !chosen}
                  aria-pressed={chosen}
                  className={cn(
                    'pressable flex min-h-[52px] w-full items-center gap-2.5 rounded-xl border-2 p-3.5 text-left text-sm',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                    chosen
                      ? style.wrap
                      : 'border-border/70 bg-card motion-safe:hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-learner',
                    !!picked && !chosen && 'opacity-50'
                  )}
                >
                  <span className="font-medium text-foreground">{choice.label || 'Option'}</span>
                </button>
              );
            })}
          </div>
        )}

        <div aria-live="polite" className="space-y-3">
          {pickedChoice && (
            <div
              className={cn(
                'material-in rounded-xl border-2 p-3.5',
                QUALITY_STYLES[pickedChoice.quality]?.wrap ?? QUALITY_STYLES.acceptable.wrap
              )}
            >
              <p className="text-xs font-semibold uppercase tracking-[0.12em] text-foreground">
                {QUALITY_STYLES[pickedChoice.quality]?.label ?? 'Noted'}
              </p>
              {pickedChoice.feedback?.trim() && (
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {pickedChoice.feedback}
                </p>
              )}
            </div>
          )}
        </div>

        {current.kind === 'decision' && pickedChoice && (
          <Button
            type="button"
            className="pressable"
            onClick={() => advance(pickedChoice.next_id, path)}
          >
            Continue
          </Button>
        )}

        {current.kind === 'outcome' && (
          <Button
            type="button"
            className="pressable"
            onClick={() => current.next_id && advance(current.next_id, path)}
            disabled={!current.next_id}
          >
            Continue
          </Button>
        )}

        {current.kind === 'end' && (
          <div className="space-y-3">
            {payload.debrief?.trim() && (
              <div className="rounded-xl bg-primary/[0.07] p-3.5">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-primary">
                  Debrief
                </p>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-foreground">
                  {payload.debrief}
                </p>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              Your path: {path.length} {path.length === 1 ? 'decision' : 'decisions'},{' '}
              {unsafeCount} unsafe.
            </p>
            <Button type="button" variant="outline" className="pressable" onClick={restart}>
              <RotateCcw className="mr-2 h-4 w-4" aria-hidden="true" />
              Try again from the start
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
