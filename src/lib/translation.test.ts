import { describe, expect, it } from 'vitest';
import {
  deriveAvailableLangs,
  extractTranslatableTexts,
  mergeTranslation,
  sourceHash,
  sourceHashInput,
} from './translation';
import { translatablePaths } from '@/components/course-learn/blocks/types';

const mcq = {
  question: 'Who do you tell?',
  options: [
    { id: 'a', label: 'The nurse', feedback: 'Yes' },
    { id: 'b', label: 'Nobody', feedback: 'No' },
  ],
  correct_index: 0,
  explanation: 'Always escalate.',
};

describe('extractTranslatableTexts', () => {
  it('expands array paths with concrete indices and skips missing fields', () => {
    const texts = extractTranslatableTexts(mcq, translatablePaths.mcq);
    expect(texts).toEqual({
      question: 'Who do you tell?',
      'options[0].label': 'The nurse',
      'options[1].label': 'Nobody',
      'options[0].feedback': 'Yes',
      'options[1].feedback': 'No',
      explanation: 'Always escalate.',
    });
    expect(extractTranslatableTexts({ question: 'Hi' }, translatablePaths.mcq)).toEqual({
      question: 'Hi',
    });
  });
});

describe('mergeTranslation', () => {
  it('overlays strings at array paths without touching ids or indices', () => {
    const merged = mergeTranslation(
      mcq,
      { question: 'Pe cine anunți?', 'options[1].label': 'Pe nimeni' },
      translatablePaths.mcq
    );
    expect(merged.question).toBe('Pe cine anunți?');
    expect(merged.options[1].label).toBe('Pe nimeni');
    expect(merged.options[0].label).toBe('The nurse');
    expect(merged.options.map((o) => o.id)).toEqual(['a', 'b']);
    expect(merged.correct_index).toBe(0);
  });

  it('never mutates the stored payload', () => {
    const merged = mergeTranslation(mcq, { question: 'Altceva' }, translatablePaths.mcq);
    expect(mcq.question).toBe('Who do you tell?');
    expect(merged).not.toBe(mcq);
  });

  it('ignores paths that no longer exist, blanks and non-strings', () => {
    const merged = mergeTranslation(
      mcq,
      {
        'options[7].label': 'ghost',
        'nodes[0].body': 'wrong type of block',
        correct_index: 1,
        options: 'not a string field',
        question: '   ',
      },
      translatablePaths.mcq
    );
    expect(merged).toBe(mcq);
    expect(merged.correct_index).toBe(0);
    expect(Array.isArray(merged.options)).toBe(true);
  });

  it('handles nested array paths (scenario choices)', () => {
    const scenario = {
      start_node_id: 'n1',
      debrief: 'Well done',
      nodes: [
        {
          id: 'n1',
          title: 'Start',
          body: 'Body',
          choices: [{ id: 'c1', label: 'Go', feedback: 'Good', next_node_id: 'n2' }],
        },
      ],
    };
    const merged = mergeTranslation(
      scenario,
      { 'nodes[0].choices[0].label': 'Mergi', 'nodes[0].body': 'Corp' },
      translatablePaths.scenario
    );
    expect(merged.nodes[0].choices[0].label).toBe('Mergi');
    expect(merged.nodes[0].choices[0].next_node_id).toBe('n2');
    expect(merged.nodes[0].body).toBe('Corp');
    expect(merged.nodes[0].title).toBe('Start');
  });
});

describe('sourceHash', () => {
  it('is stable and whitespace-insensitive', async () => {
    const a = await sourceHash({ text: 'Wash your  hands\nalways' });
    const b = await sourceHash({ text: '  Wash your hands always  ' });
    expect(a).toBe(b);
    expect(a).toHaveLength(64);
  });

  it('changes when the wording changes', async () => {
    const a = await sourceHash({ text: 'Wash your hands' });
    const b = await sourceHash({ text: 'Wash your hands well' });
    expect(a).not.toBe(b);
  });

  it('is order-independent across paths', () => {
    expect(sourceHashInput({ b: 'two', a: 'one' })).toBe(sourceHashInput({ a: 'one', b: 'two' }));
  });
});

describe('deriveAvailableLangs', () => {
  const rows = (list: [string, string, string][]) =>
    list.map(([lang, block_id, status]) => ({ lang, block_id, status }));

  it('only lists a language when every block is reviewed', () => {
    expect(
      deriveAvailableLangs(
        ['b1', 'b2'],
        rows([
          ['ro', 'b1', 'reviewed'],
          ['ro', 'b2', 'reviewed'],
        ])
      )
    ).toEqual(['ro']);
    expect(
      deriveAvailableLangs(
        ['b1', 'b2'],
        rows([
          ['ro', 'b1', 'reviewed'],
          ['ro', 'b2', 'draft'],
        ])
      )
    ).toEqual([]);
    expect(deriveAvailableLangs([], rows([['ro', 'b1', 'reviewed']]))).toEqual([]);
  });

  it('ignores rows for blocks that no longer exist', () => {
    expect(
      deriveAvailableLangs(
        ['b1'],
        rows([
          ['ro', 'b1', 'reviewed'],
          ['ro', 'gone', 'reviewed'],
        ])
      )
    ).toEqual(['ro']);
  });
});
