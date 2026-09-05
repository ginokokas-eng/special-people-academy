import { describe, expect, it } from 'vitest';
import {
  draftBlockIssues,
  draftToBlock,
  draftToCheckpoint,
  mapDraftBlocks,
  slugify,
  type DraftBlock,
} from './aiAuthoring';
import type {
  AccordionPayload,
  FlipCardsPayload,
  McqPayload,
  ScenarioPayload,
} from '@/components/course-learn/blocks/types';

/** Deterministic id factory so mapping output can be asserted exactly. */
function ids() {
  let n = 0;
  return () => `id-${++n}`;
}

describe('slugify', () => {
  it('normalises author keys and falls back', () => {
    expect(slugify('The Situation!', 'step-1')).toBe('the-situation');
    expect(slugify('   ', 'step-2')).toBe('step-2');
  });
});

describe('draftToBlock', () => {
  it('maps a text draft', () => {
    const out = draftToBlock({ block_type: 'text', heading: ' Aims ', text: ' Do this ' }, ids());
    expect(out).toEqual({ block_type: 'text', payload: { heading: 'Aims', text: 'Do this' } });
  });

  it('keeps only known callout variants', () => {
    const out = draftToBlock({ block_type: 'callout', variant: 'danger', text: 'Stop' }, ids());
    expect((out.payload as { variant: string }).variant).toBe('info');
  });

  it('mints card ids locally and ignores any model-supplied id', () => {
    const draft = {
      block_type: 'flip_cards',
      cards: [
        { front: 'A', back: 'B', id: 'model-id' },
        { front: 'C', back: 'D' },
      ],
    } as unknown as DraftBlock;
    const payload = draftToBlock(draft, ids()).payload as FlipCardsPayload;
    expect(payload.cards.map((c) => c.id)).toEqual(['id-1', 'id-2']);
    expect(JSON.stringify(payload)).not.toContain('model-id');
  });

  it('mints accordion item ids', () => {
    const payload = draftToBlock(
      {
        block_type: 'accordion',
        items: [
          { title: 'One', body: 'x' },
          { title: 'Two', body: 'y' },
        ],
      },
      ids()
    ).payload as AccordionPayload;
    expect(payload.items.map((i) => i.id)).toEqual(['id-1', 'id-2']);
  });

  it('resolves the mcq correct index to a freshly minted option id', () => {
    const payload = draftToBlock(
      {
        block_type: 'mcq',
        question: 'Which?',
        options: [{ label: 'a' }, { label: 'b' }, { label: 'c' }],
        correct_index: 2,
        explanation: 'Because.',
      },
      ids()
    ).payload as McqPayload;
    expect(payload.options.map((o) => o.id)).toEqual(['id-1', 'id-2', 'id-3']);
    expect(payload.correct_id).toBe('id-3');
  });

  it('falls back to the first option when the index is out of range', () => {
    const payload = draftToBlock(
      { block_type: 'mcq', question: 'Q', options: [{ label: 'a' }, { label: 'b' }], correct_index: 9 },
      ids()
    ).payload as McqPayload;
    expect(payload.correct_id).toBe('id-1');
  });

  it('re-points scenario choices at minted node ids', () => {
    const payload = draftToBlock(
      {
        block_type: 'scenario',
        scenario: {
          start_slug: 'start',
          debrief: 'Debrief',
          nodes: [
            {
              slug: 'start',
              kind: 'decision',
              title: 'Start',
              body: 'What now?',
              choices: [
                { label: 'Safe', next_slug: 'good', quality: 'best', feedback: 'Yes' },
                { label: 'Risky', next_slug: 'bad', quality: 'unsafe', feedback: 'No' },
              ],
            },
            { slug: 'good', kind: 'end', title: 'Good', body: 'Well done' },
            { slug: 'bad', kind: 'end', title: 'Bad', body: 'Escalate' },
          ],
        },
      },
      ids()
    ).payload as ScenarioPayload;

    const byslug = new Map(payload.nodes.map((n) => [n.slug, n]));
    expect(payload.start_id).toBe(byslug.get('start')?.id);
    const choices = byslug.get('start')?.choices ?? [];
    expect(choices.map((c) => c.next_id)).toEqual([
      byslug.get('good')?.id,
      byslug.get('bad')?.id,
    ]);
    expect(payload.nodes.every((n) => /^id-\d+$/.test(n.id))).toBe(true);
    expect(draftBlockIssues({ block_type: 'scenario', payload })).toEqual([]);
  });

  it('deduplicates scenario slugs', () => {
    const payload = draftToBlock(
      {
        block_type: 'scenario',
        scenario: {
          start_slug: 'a',
          nodes: [
            { slug: 'a', kind: 'end', body: 'x' },
            { slug: 'A', kind: 'end', body: 'y' },
          ],
        },
      },
      ids()
    ).payload as ScenarioPayload;
    expect(new Set(payload.nodes.map((n) => n.slug)).size).toBe(2);
  });
});

describe('draftBlockIssues', () => {
  it('flags an unusable mcq draft', () => {
    const mapped = draftToBlock(
      { block_type: 'mcq', question: '', options: [{ label: '' }], correct_index: 0 },
      ids()
    );
    expect(draftBlockIssues(mapped).length).toBeGreaterThan(0);
  });

  it('passes a sound accordion draft', () => {
    const mapped = draftToBlock(
      {
        block_type: 'accordion',
        items: [
          { title: 'One', body: 'x' },
          { title: 'Two', body: 'y' },
        ],
      },
      ids()
    );
    expect(draftBlockIssues(mapped)).toEqual([]);
  });
});

describe('mapDraftBlocks', () => {
  it('keeps order and attaches issues', () => {
    const out = mapDraftBlocks(
      [
        { block_type: 'text', text: 'Hello' },
        { block_type: 'text', text: '' },
      ],
      ids()
    );
    expect(out.map((o) => o.block_type)).toEqual(['text', 'text']);
    expect(out[0].issues).toEqual([]);
    expect(out[1].issues.length).toBe(1);
  });
});

describe('draftToCheckpoint', () => {
  it('mints ids and rounds the cue time', () => {
    const cp = draftToCheckpoint(
      {
        at_s: 12.6,
        question: 'What next?',
        options: [{ label: 'a' }, { label: 'b' }],
        correct_index: 1,
        explanation: 'Because.',
      },
      ids()
    );
    expect(cp.id).toBe('id-3');
    expect(cp.at_s).toBe(13);
    expect(cp.correct_id).toBe('id-2');
  });
});
