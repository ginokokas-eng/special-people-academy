import { describe, expect, it } from 'vitest';
import { collectPayloadIds, remintBlockPayload } from './blockCopy';
import {
  BLOCK_TYPES,
  defaultPayload,
  defaultScenarioPayload,
  translatablePaths,
  blockSpokenText,
  type McqPayload,
  type ScenarioPayload,
  type BlockPayload,
} from '@/components/course-learn/blocks/types';

describe('remintBlockPayload', () => {
  it('re-mints every mcq option id and re-points the correct answer', () => {
    const source = defaultPayload('mcq') as McqPayload;
    source.options = [
      { id: 'a', label: 'One' },
      { id: 'b', label: 'Two' },
    ];
    source.correct_id = 'b';
    const copy = remintBlockPayload('mcq', source) as McqPayload;
    expect(copy.options.map((o) => o.id)).not.toContain('a');
    expect(copy.options.map((o) => o.id)).not.toContain('b');
    expect(copy.correct_id).toBe(copy.options[1].id);
  });

  it('re-mints scenario node ids, slugs and choice targets', () => {
    const source = defaultScenarioPayload();
    const copy = remintBlockPayload('scenario', source) as ScenarioPayload;
    const sourceIds = new Set(collectPayloadIds(source));
    const copyIds = collectPayloadIds(copy);
    expect(copyIds.length).toBeGreaterThan(0);
    for (const id of copyIds) expect(sourceIds.has(id)).toBe(false);
    // Slugs stay unique inside the copy.
    const slugs = copy.nodes.map((n) => n.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    // Every link still resolves inside the copy.
    const nodeIds = new Set(copy.nodes.map((n) => n.id));
    expect(nodeIds.has(copy.start_id)).toBe(true);
    for (const node of copy.nodes) {
      if (node.next_id) expect(nodeIds.has(node.next_id)).toBe(true);
      for (const choice of node.choices ?? []) expect(nodeIds.has(choice.next_id)).toBe(true);
    }
  });

  it('shares no id with the source for any block type, and drops visibility', () => {
    for (const type of BLOCK_TYPES) {
      const source = {
        ...(type === 'scenario' ? defaultScenarioPayload() : defaultPayload(type)),
        visibility: { when: 'if_correct', block_id: 'source-block' },
      } as BlockPayload;
      const copy = remintBlockPayload(type, source);
      expect((copy as { visibility?: unknown }).visibility).toBeUndefined();
      const sourceIds = new Set(collectPayloadIds(source));
      for (const id of collectPayloadIds(copy)) {
        expect(sourceIds.has(id), `${type} leaked id ${id}`).toBe(false);
      }
    }
  });
});

describe('translatablePaths', () => {
  it('covers every block type', () => {
    for (const type of BLOCK_TYPES) {
      expect(translatablePaths[type], type).toBeDefined();
      expect(translatablePaths[type].length, type).toBeGreaterThan(0);
    }
  });

  it('never speaks the answer feedback of a knowledge check', () => {
    const payload = defaultPayload('mcq') as McqPayload;
    payload.question = 'What comes first?';
    payload.options = [{ id: 'a', label: 'Check the plan' }];
    payload.explanation = 'Because the plan says so';
    const spoken = blockSpokenText('mcq', payload);
    expect(spoken).toContain('What comes first?');
    expect(spoken).toContain('Check the plan');
    expect(spoken).not.toContain('Because the plan says so');
  });
});
