import { describe, expect, it } from 'vitest';
import {
  defaultScenarioPayload,
  scenarioDepths,
  trimScenarioRuns,
  validateScenario,
  type ScenarioNode,
  type ScenarioPayload,
  type ScenarioRun,
} from './types';

const node = (over: Partial<ScenarioNode> & { id: string }): ScenarioNode => ({
  slug: over.id,
  kind: 'end',
  body: 'Something happens.',
  ...over,
});

const payload = (nodes: ScenarioNode[], start = nodes[0]?.id): ScenarioPayload => ({
  version: 1,
  start_id: start ?? '',
  require_best_path: false,
  nodes,
});

const codes = (p: ScenarioPayload) => validateScenario(p).map((i) => i.code);

describe('validateScenario', () => {
  it('accepts the starter scenario', () => {
    expect(validateScenario(defaultScenarioPayload())).toEqual([]);
  });

  it('flags a missing start node', () => {
    expect(codes(payload([node({ id: 'a' })], 'nope'))).toContain('no_start');
  });

  it('flags empty wording', () => {
    expect(codes(payload([node({ id: 'a', body: '   ' })]))).toContain('empty_body');
  });

  it('flags duplicate short keys', () => {
    const p = payload([
      node({ id: 'a', slug: 'same', kind: 'decision', choices: [
        { id: 'c1', label: 'One', next_id: 'b', quality: 'best' },
        { id: 'c2', label: 'Two', next_id: 'b', quality: 'unsafe' },
      ] }),
      node({ id: 'b', slug: 'same' }),
    ]);
    expect(codes(p)).toContain('duplicate_slug');
  });

  it('flags a decision with fewer than two choices, and a dangling choice', () => {
    const p = payload([
      node({ id: 'a', kind: 'decision', choices: [{ id: 'c1', label: 'Only', next_id: 'ghost', quality: 'best' }] }),
      node({ id: 'b' }),
    ]);
    expect(codes(p)).toContain('too_few_choices');
    expect(codes(p)).toContain('dangling_choice');
  });

  it('flags outcome and ending link mistakes', () => {
    const missing = payload([node({ id: 'a', kind: 'outcome' })]);
    expect(codes(missing)).toContain('outcome_missing_next');
    const endLeads = payload([node({ id: 'a', kind: 'end', next_id: 'a' })]);
    expect(codes(endLeads)).toContain('end_has_next');
  });

  it('flags nodes learners can never reach', () => {
    const p = payload([
      node({ id: 'a', kind: 'decision', choices: [
        { id: 'c1', label: 'One', next_id: 'b', quality: 'best' },
        { id: 'c2', label: 'Two', next_id: 'b', quality: 'unsafe' },
      ] }),
      node({ id: 'b' }),
      node({ id: 'orphan' }),
    ]);
    expect(codes(p)).toContain('unreachable');
  });

  it('flags a scenario that can never finish', () => {
    const p = payload([
      node({ id: 'a', kind: 'outcome', next_id: 'b' }),
      node({ id: 'b', kind: 'outcome', next_id: 'a' }),
    ]);
    expect(codes(p)).toContain('no_end_reachable');
  });
});

describe('scenarioDepths', () => {
  it('numbers nodes by how far they are from the start', () => {
    const p = payload([
      node({ id: 'a', kind: 'decision', choices: [
        { id: 'c1', label: 'One', next_id: 'b', quality: 'best' },
        { id: 'c2', label: 'Two', next_id: 'c', quality: 'unsafe' },
      ] }),
      node({ id: 'b', kind: 'outcome', next_id: 'd' }),
      node({ id: 'c' }),
      node({ id: 'd' }),
    ]);
    const depths = scenarioDepths(p);
    expect(depths.get('a')).toBe(0);
    expect(depths.get('b')).toBe(1);
    expect(depths.get('c')).toBe(1);
    expect(depths.get('d')).toBe(2);
  });
});

describe('trimScenarioRuns', () => {
  const run = (n: number): ScenarioRun => ({
    started_at: `${n}`,
    ended_at: `${n}`,
    end_node_id: `end-${n}`,
    is_clean: true,
    path: [],
  });

  it('leaves short lists alone', () => {
    const runs = [run(1), run(2)];
    expect(trimScenarioRuns(runs, 10)).toBe(runs);
  });

  it('keeps the first run and the most recent ones', () => {
    const runs = Array.from({ length: 14 }, (_, i) => run(i + 1));
    const kept = trimScenarioRuns(runs, 10);
    expect(kept).toHaveLength(10);
    expect(kept[0].end_node_id).toBe('end-1');
    expect(kept[kept.length - 1].end_node_id).toBe('end-14');
    expect(kept[1].end_node_id).toBe('end-6');
  });
});
