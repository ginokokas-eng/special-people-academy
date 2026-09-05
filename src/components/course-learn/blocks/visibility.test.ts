import { describe, expect, it } from 'vitest';
import {
  validateVisibility,
  visibleBlockIds,
  type BlockPayload,
  type BlockType,
  type VisibilityBlock,
  type VisibilityWhen,
} from './types';

const block = (
  id: string,
  block_type: BlockType,
  visibility?: { when: VisibilityWhen; block_id: string },
  extra: Record<string, unknown> = {}
): VisibilityBlock => ({
  id,
  block_type,
  payload: { ...extra, ...(visibility ? { visibility } : {}) } as BlockPayload,
});

describe('validateVisibility', () => {
  it('accepts a callout conditional on an earlier MCQ', () => {
    const blocks = [
      block('mcq-1', 'mcq'),
      block('callout-1', 'callout', { when: 'if_incorrect', block_id: 'mcq-1' }),
    ];
    expect(validateVisibility(blocks)).toEqual([]);
  });

  it('accepts blocks with no conditions at all', () => {
    expect(validateVisibility([block('t', 'text'), block('c', 'callout')])).toEqual([]);
  });

  it('flags a source that is not in the lesson', () => {
    const issues = validateVisibility([
      block('callout-1', 'callout', { when: 'if_correct', block_id: 'gone' }),
    ]);
    expect(issues.map((i) => i.code)).toEqual(['dangling_source']);
    expect(issues[0].block_id).toBe('callout-1');
  });

  it('flags a source that comes later in the lesson', () => {
    const issues = validateVisibility([
      block('callout-1', 'callout', { when: 'if_correct', block_id: 'mcq-1' }),
      block('mcq-1', 'mcq'),
    ]);
    expect(issues.map((i) => i.code)).toEqual(['forward_reference']);
  });

  it('flags a block that waits on itself', () => {
    const issues = validateVisibility([
      block('mcq-1', 'mcq'),
      block('c1', 'callout', { when: 'if_complete', block_id: 'c1' }),
    ]);
    expect(issues.map((i) => i.code)).toEqual(['self_reference']);
  });

  it('flags a source that is not an activity', () => {
    const issues = validateVisibility([
      block('text-1', 'text'),
      block('c1', 'callout', { when: 'if_complete', block_id: 'text-1' }),
    ]);
    expect(issues.map((i) => i.code)).toEqual(['source_not_interactive']);
  });

  it('flags right/wrong conditions on an activity with no outcome', () => {
    const issues = validateVisibility([
      block('deck-1', 'card_deck'),
      block('c1', 'callout', { when: 'if_correct', block_id: 'deck-1' }),
    ]);
    expect(issues.map((i) => i.code)).toEqual(['source_no_outcome']);
    // …but "is finished" is fine for the same source.
    expect(
      validateVisibility([
        block('deck-1', 'card_deck'),
        block('c1', 'callout', { when: 'if_complete', block_id: 'deck-1' }),
      ])
    ).toEqual([]);
  });

  it('flags a chain of conditions (one level only in v1)', () => {
    const issues = validateVisibility([
      block('mcq-1', 'mcq'),
      block('mcq-2', 'mcq', { when: 'if_incorrect', block_id: 'mcq-1' }),
      block('c1', 'callout', { when: 'if_incorrect', block_id: 'mcq-2' }),
    ]);
    expect(issues.map((i) => i.code)).toEqual(['source_conditional']);
  });
});

describe('visibleBlockIds', () => {
  const blocks = [
    block('mcq-1', 'mcq'),
    block('remedy', 'callout', { when: 'if_incorrect', block_id: 'mcq-1' }),
    block('praise', 'callout', { when: 'if_correct', block_id: 'mcq-1' }),
    block('after', 'callout', { when: 'if_complete', block_id: 'mcq-1' }),
  ];

  it('hides every conditional block before the activity is attempted', () => {
    expect([...visibleBlockIds(blocks, {}, {})]).toEqual(['mcq-1']);
  });

  it('shows the remediation block after a wrong answer', () => {
    const visible = visibleBlockIds(blocks, { 'mcq-1': true }, { 'mcq-1': false });
    expect([...visible].sort()).toEqual(['after', 'mcq-1', 'remedy']);
  });

  it('shows the praise block after a correct answer', () => {
    const visible = visibleBlockIds(blocks, { 'mcq-1': true }, { 'mcq-1': true });
    expect([...visible].sort()).toEqual(['after', 'mcq-1', 'praise']);
  });

  it('hides right/wrong branches when the outcome is not assessed', () => {
    const visible = visibleBlockIds(blocks, { 'mcq-1': true }, { 'mcq-1': null });
    expect([...visible].sort()).toEqual(['after', 'mcq-1']);
  });

  it('hydrates: an outcome known before any interaction still reveals the block', () => {
    // Restored from a saved response on page load — no clicks this session.
    const visible = visibleBlockIds(blocks, {}, { 'mcq-1': false });
    expect(visible.has('remedy')).toBe(true);
    expect(visible.has('after')).toBe(false);
  });

  it('hides a block whose source has been deleted', () => {
    const orphan = [block('c1', 'callout', { when: 'if_correct', block_id: 'gone' })];
    expect([...visibleBlockIds(orphan, {}, { gone: true })]).toEqual([]);
  });
});
