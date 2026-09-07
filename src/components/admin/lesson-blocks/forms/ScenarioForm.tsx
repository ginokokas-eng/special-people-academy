import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, ChevronDown, ChevronUp, Plus, Trash2 } from '@/components/icons';
import { cn } from '@/lib/utils';
import { MediaUploadField } from './MediaUploadField';
import {
  scenarioDepths,
  validateScenario,
  type MediaRef,
  type ScenarioChoice,
  type ScenarioIssue,
  type ScenarioNode,
  type ScenarioPayload,
  type ScenarioQuality,
} from '@/components/course-learn/blocks/types';

interface Props {
  payload: ScenarioPayload;
  onChange: (payload: ScenarioPayload) => void;
  idPrefix: string;
  courseId?: string;
  lessonId?: string;
}

const KIND_LABELS: Record<ScenarioNode['kind'], string> = {
  decision: 'Decision',
  outcome: 'What happens',
  end: 'Ending',
};

const QUALITY_LABELS: Record<ScenarioQuality, string> = {
  best: 'Best practice',
  acceptable: 'Acceptable',
  unsafe: 'Unsafe',
};

const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);

/**
 * Outline editor for a branching scenario. Nodes are grouped by how many steps
 * they sit from the start (breadth-first), so authors read the story in the
 * order learners meet it. There is no canvas — every link is a plain dropdown.
 */
export function ScenarioForm({ payload, onChange, idPrefix, courseId, lessonId }: Props) {
  const nodes = payload.nodes ?? [];
  const [openId, setOpenId] = useState<string | null>(nodes[0]?.id ?? null);

  const issues = useMemo(() => validateScenario(payload), [payload]);
  const depths = useMemo(() => scenarioDepths(payload), [payload]);
  const issuesByNode = useMemo(() => {
    const map = new Map<string, ScenarioIssue[]>();
    for (const issue of issues) {
      if (!issue.node_id) continue;
      map.set(issue.node_id, [...(map.get(issue.node_id) ?? []), issue]);
    }
    return map;
  }, [issues]);

  const groups = useMemo(() => {
    const buckets = new Map<number, ScenarioNode[]>();
    const orphans: ScenarioNode[] = [];
    for (const node of nodes) {
      const depth = depths.get(node.id);
      if (depth == null) orphans.push(node);
      else buckets.set(depth, [...(buckets.get(depth) ?? []), node]);
    }
    return {
      levels: [...buckets.entries()].sort((a, b) => a[0] - b[0]),
      orphans,
    };
  }, [nodes, depths]);

  const setNodes = (next: ScenarioNode[]) => onChange({ ...payload, nodes: next });

  const updateNode = (id: string, patch: Partial<ScenarioNode>) =>
    setNodes(nodes.map((n) => (n.id === id ? { ...n, ...patch } : n)));

  const addNode = (kind: ScenarioNode['kind']) => {
    const id = crypto.randomUUID();
    const node: ScenarioNode = {
      id,
      slug: `${kind}-${nodes.length + 1}`,
      kind,
      title: '',
      body: '',
      ...(kind === 'decision' ? { choices: [] } : {}),
    };
    setNodes([...nodes, node]);
    setOpenId(id);
  };

  const removeNode = (id: string) => {
    const next = nodes
      .filter((n) => n.id !== id)
      .map((n) => ({
        ...n,
        next_id: n.next_id === id ? undefined : n.next_id,
        choices: n.choices?.map((c) => (c.next_id === id ? { ...c, next_id: '' } : c)),
      }));
    onChange({
      ...payload,
      nodes: next,
      start_id: payload.start_id === id ? (next[0]?.id ?? '') : payload.start_id,
    });
  };

  const setChoices = (nodeId: string, choices: ScenarioChoice[]) =>
    updateNode(nodeId, { choices });

  const addChoice = (node: ScenarioNode) =>
    setChoices(node.id, [
      ...(node.choices ?? []),
      { id: crypto.randomUUID(), label: '', next_id: '', quality: 'acceptable', feedback: '' },
    ]);

  const nodeLabel = (node: ScenarioNode) =>
    `${node.slug || 'node'} — ${KIND_LABELS[node.kind]}${node.title ? `: ${node.title}` : ''}`;

  const targetOptions = nodes.map((n) => ({ id: n.id, label: nodeLabel(n) }));

  /* --------------------------------- render -------------------------------- */
  const renderNode = (node: ScenarioNode) => {
    const nodeIndex = nodes.findIndex((n) => n.id === node.id);
    const open = openId === node.id;
    const nodeIssues = issuesByNode.get(node.id) ?? [];
    const media: MediaRef | null = node.image_path
      ? { source: 'storage', path: node.image_path }
      : null;

    return (
      <div
        key={node.id}
        id={`${idPrefix}-node-${node.id}`}
        className={cn(
          'rounded-lg border bg-card',
          nodeIssues.length > 0 && 'border-destructive/60'
        )}
      >
        <div className="flex items-center gap-2 p-3">
          <button
            type="button"
            onClick={() => setOpenId(open ? null : node.id)}
            className="flex min-w-0 flex-1 items-center gap-2 text-left"
            aria-expanded={open}
          >
            {open ? (
              <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
            )}
            <span className="truncate text-sm font-medium text-foreground">
              {node.title?.trim() || node.slug || 'Untitled step'}
            </span>
            <Badge variant="secondary" className="shrink-0">
              {KIND_LABELS[node.kind]}
            </Badge>
            {payload.start_id === node.id && (
              <Badge className="shrink-0">Start</Badge>
            )}
            {nodeIssues.length > 0 && (
              <Badge variant="destructive" className="shrink-0">
                {nodeIssues.length} to fix
              </Badge>
            )}
          </button>
          <Button
            type="button"
            size="icon"
            variant="ghost"
            onClick={() => removeNode(node.id)}
            aria-label={`Delete step ${node.slug || ''}`}
          >
            <Trash2 className="h-4 w-4 text-destructive" />
          </Button>
        </div>

        {open && (
          <div className="space-y-3 border-t p-3">
            <div className="grid gap-3 grid-cols-1 sm:grid-cols-3">
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-slug-${node.id}`}>Short key</Label>
                <Input
                  id={`${idPrefix}-slug-${node.id}`}
                  value={node.slug}
                  onChange={(e) => updateNode(node.id, { slug: slugify(e.target.value) })}
                  placeholder="call-for-help"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-kind-${node.id}`}>Type of step</Label>
                <Select
                  value={node.kind}
                  onValueChange={(value) =>
                    updateNode(node.id, {
                      kind: value as ScenarioNode['kind'],
                      choices: value === 'decision' ? (node.choices ?? []) : undefined,
                      next_id: value === 'outcome' ? node.next_id : undefined,
                    })
                  }
                >
                  <SelectTrigger id={`${idPrefix}-kind-${node.id}`}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(['decision', 'outcome', 'end'] as const).map((kind) => (
                      <SelectItem key={kind} value={kind}>
                        {KIND_LABELS[kind]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor={`${idPrefix}-title-${node.id}`}>Heading (optional)</Label>
                <Input
                  id={`${idPrefix}-title-${node.id}`}
                  data-testid={`block-form-scenario-title-${idPrefix}-${nodeIndex}`}
                  value={node.title ?? ''}
                  onChange={(e) => updateNode(node.id, { title: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor={`${idPrefix}-body-${node.id}`}>What learners read</Label>
              <Textarea
                id={`${idPrefix}-body-${node.id}`}
                value={node.body}
                rows={4}
                onChange={(e) => updateNode(node.id, { body: e.target.value })}
              />
            </div>

            <MediaUploadField
              value={media}
              onChange={(next) => updateNode(node.id, { image_path: next.path || undefined })}
              idPrefix={`${idPrefix}-img-${node.id}`}
              label="Picture (optional)"
              courseId={courseId}
              lessonId={lessonId}
            />

            {node.kind === 'outcome' && (
              <div className="space-y-1.5">
                <Label>What happens next</Label>
                <Select
                  value={node.next_id ?? ''}
                  onValueChange={(value) => updateNode(node.id, { next_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose the next step" />
                  </SelectTrigger>
                  <SelectContent>
                    {targetOptions
                      .filter((o) => o.id !== node.id)
                      .map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {node.kind === 'decision' && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-muted-foreground">Choices</p>
                {(node.choices ?? []).map((choice, ci) => (
                  <div key={choice.id} className="space-y-2 rounded-lg border bg-muted/40 p-3">
                    <div className="flex items-center gap-2">
                      <Input
                        value={choice.label}
                        data-testid={`block-form-scenario-choice-${idPrefix}-${nodeIndex}-${ci}`}
                        placeholder={`Choice ${ci + 1}`}
                        onChange={(e) =>
                          setChoices(
                            node.id,
                            (node.choices ?? []).map((c) =>
                              c.id === choice.id ? { ...c, label: e.target.value } : c
                            )
                          )
                        }
                      />
                      <Button
                        type="button"
                        size="icon"
                        variant="ghost"
                        aria-label={`Delete choice ${ci + 1}`}
                        onClick={() =>
                          setChoices(
                            node.id,
                            (node.choices ?? []).filter((c) => c.id !== choice.id)
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                    <div className="grid gap-2 grid-cols-1 sm:grid-cols-2">
                      <Select
                        value={choice.quality}
                        onValueChange={(value) =>
                          setChoices(
                            node.id,
                            (node.choices ?? []).map((c) =>
                              c.id === choice.id ? { ...c, quality: value as ScenarioQuality } : c
                            )
                          )
                        }
                      >
                        <SelectTrigger aria-label="How good is this choice?">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {(['best', 'acceptable', 'unsafe'] as const).map((q) => (
                            <SelectItem key={q} value={q}>
                              {QUALITY_LABELS[q]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Select
                        value={choice.next_id || ''}
                        onValueChange={(value) =>
                          setChoices(
                            node.id,
                            (node.choices ?? []).map((c) =>
                              c.id === choice.id ? { ...c, next_id: value } : c
                            )
                          )
                        }
                      >
                        <SelectTrigger aria-label="Where this choice leads">
                          <SelectValue placeholder="Leads to…" />
                        </SelectTrigger>
                        <SelectContent>
                          {targetOptions.map((o) => (
                            <SelectItem key={o.id} value={o.id}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Textarea
                      value={choice.feedback ?? ''}
                      rows={2}
                      placeholder="What the learner is told straight after choosing this"
                      onChange={(e) =>
                        setChoices(
                          node.id,
                          (node.choices ?? []).map((c) =>
                            c.id === choice.id ? { ...c, feedback: e.target.value } : c
                          )
                        )
                      }
                    />
                  </div>
                ))}
                <Button type="button" variant="outline" size="sm" onClick={() => addChoice(node)}>
                  <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                  Add choice
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 grid-cols-1 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label>Starts at</Label>
          <Select
            value={payload.start_id || ''}
            onValueChange={(value) => onChange({ ...payload, start_id: value })}
          >
            <SelectTrigger data-testid={`block-form-scenario-start-${idPrefix}`}>
              <SelectValue placeholder="Choose the first step" />
            </SelectTrigger>
            <SelectContent>
              {targetOptions.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-3">
          <div className="flex items-center gap-2">
            <Switch
              id={`${idPrefix}-best-path`}
              checked={payload.require_best_path}
              onCheckedChange={(checked) => onChange({ ...payload, require_best_path: checked })}
            />
            <Label htmlFor={`${idPrefix}-best-path`} className="text-sm">
              Mark a run with no unsafe choice as correct
            </Label>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`${idPrefix}-debrief`}>Debrief (shown at every ending)</Label>
        <Textarea
          id={`${idPrefix}-debrief`}
          value={payload.debrief ?? ''}
          rows={3}
          onChange={(e) => onChange({ ...payload, debrief: e.target.value })}
        />
      </div>

      {issues.length > 0 && (
        <div className="rounded-lg border border-destructive/60 bg-destructive/5 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-destructive">
            <AlertTriangle className="h-4 w-4" aria-hidden="true" />
            {issues.length} thing{issues.length === 1 ? '' : 's'} to fix before this can be
            published
          </p>
          <ul className="mt-2 space-y-1 text-sm text-foreground">
            {issues.map((issue, i) => (
              <li key={`${issue.code}-${issue.node_id ?? i}`} className="flex flex-wrap gap-2">
                <span>{issue.message}</span>
                {issue.node_id && (
                  <button
                    type="button"
                    className="font-medium text-primary underline"
                    onClick={() => setOpenId(issue.node_id ?? null)}
                  >
                    Open{' '}
                    {nodes.find((n) => n.id === issue.node_id)?.slug || 'step'}
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="space-y-4">
        {groups.levels.map(([depth, list]) => (
          <div key={depth} className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              {depth === 0 ? 'Start' : `Step ${depth}`}
            </p>
            {list.map(renderNode)}
          </div>
        ))}

        {groups.orphans.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-destructive">
              Not reachable yet
            </p>
            {groups.orphans.map(renderNode)}
          </div>
        )}
      </div>

      <div className="flex flex-wrap gap-2 border-t pt-3">
        {(['decision', 'outcome', 'end'] as const).map((kind) => (
          <Button key={kind} type="button" variant="outline" size="sm" onClick={() => addNode(kind)}>
            <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
            Add {KIND_LABELS[kind].toLowerCase()}
          </Button>
        ))}
      </div>
    </div>
  );
}
