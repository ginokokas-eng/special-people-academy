import { describe, expect, it } from 'vitest';
import {
  coursesWithUpdates,
  isChangedSinceCompletion,
  isMaterialBlock,
  lessonsNeedingRecompletion,
  materialChangeDefault,
  diffFields,
  type MaterialBlockLike,
} from './contentHistory';
import { requiredProgress } from './progress';

const block = (
  client_id: string,
  block_type: MaterialBlockLike['block_type'],
  payload: Record<string, unknown> = {}
): MaterialBlockLike => ({ client_id, block_type, payload, contributes_to_completion: false });

describe('isMaterialBlock', () => {
  it('treats assessed/interactive types as material', () => {
    for (const type of ['mcq', 'drag_match', 'hot_graphic', 'scenario', 'reflection'] as const) {
      expect(isMaterialBlock(block('a', type))).toBe(true);
    }
  });

  it('treats presentation-only types as immaterial', () => {
    for (const type of ['text', 'callout', 'image', 'accordion', 'carousel'] as const) {
      expect(isMaterialBlock(block('a', type))).toBe(false);
    }
  });

  it('only counts video as material when it carries checkpoints', () => {
    expect(isMaterialBlock(block('v', 'video', { checkpoints: [] }))).toBe(false);
    expect(isMaterialBlock(block('v', 'video', { checkpoints: [{ at_s: 10 }] }))).toBe(true);
  });

  it('only counts checklists as material in assessed mode', () => {
    expect(isMaterialBlock(block('c', 'checklist', { mode: 'reference' }))).toBe(false);
    expect(isMaterialBlock(block('c', 'checklist', { mode: 'assessed' }))).toBe(true);
  });
});

describe('materialChangeDefault', () => {
  it('is off when nothing changed', () => {
    const blocks = [block('1', 'text', { html: 'a' }), block('2', 'mcq', { question: 'q' })];
    expect(materialChangeDefault(blocks, blocks)).toBe(false);
  });

  it('is off for a text-only edit', () => {
    const before = [block('1', 'text', { html: 'a' }), block('2', 'mcq', { question: 'q' })];
    const after = [block('1', 'text', { html: 'b' }), block('2', 'mcq', { question: 'q' })];
    expect(materialChangeDefault(before, after)).toBe(false);
  });

  it('is on when an MCQ is edited', () => {
    const before = [block('2', 'mcq', { question: 'q', correct_index: 0 })];
    const after = [block('2', 'mcq', { question: 'q', correct_index: 1 })];
    expect(materialChangeDefault(before, after)).toBe(true);
  });

  it('is on when a material block is added or removed', () => {
    expect(materialChangeDefault([], [block('s', 'scenario')])).toBe(true);
    expect(materialChangeDefault([block('s', 'scenario')], [])).toBe(true);
    expect(materialChangeDefault([], [block('t', 'text', { html: 'hello' })])).toBe(false);
  });
});

describe('flag derivation', () => {
  it('flags only when the completed version is behind', () => {
    expect(isChangedSinceCompletion({ completed_version: 1, current_version: 2 })).toBe(true);
    expect(isChangedSinceCompletion({ completed_version: 2, current_version: 2 })).toBe(false);
    expect(isChangedSinceCompletion({ completed_version: null, current_version: 3 })).toBe(false);
  });

  it('separates informational updates from required re-completion', () => {
    const rows = [
      {
        course_id: 'c1',
        lesson_id: 'l1',
        completed_version: 1,
        current_version: 2,
        require_recompletion: true,
      },
      {
        course_id: 'c2',
        lesson_id: 'l2',
        completed_version: 1,
        current_version: 2,
        require_recompletion: false,
      },
    ];
    expect([...coursesWithUpdates(rows)].sort()).toEqual(['c1', 'c2']);
    expect([...lessonsNeedingRecompletion(rows)]).toEqual(['l1']);
  });
});

describe('requiredProgress re-completion rule', () => {
  const lessons = [
    { id: 'l1', is_required: true },
    { id: 'l2', is_required: true },
    { id: 'l3', is_required: false },
  ];

  it('counts a completed lesson normally when re-completion is not required', () => {
    expect(requiredProgress(lessons, new Set(['l1', 'l2']))).toEqual({
      completed: 2,
      total: 2,
      percent: 100,
    });
  });

  it('discounts flagged lessons when re-completion is required', () => {
    expect(requiredProgress(lessons, new Set(['l1', 'l2']), new Set(['l2']))).toEqual({
      completed: 1,
      total: 2,
      percent: 50,
    });
  });
});

describe('diffFields', () => {
  it('reports key-level changes and ignores bookkeeping columns', () => {
    const diffs = diffFields(
      { title: 'A', updated_at: '1', order_index: 0 },
      { title: 'B', updated_at: '2', order_index: 0 }
    );
    expect(diffs).toEqual([{ key: 'title', before: 'A', after: 'B' }]);
  });
});
