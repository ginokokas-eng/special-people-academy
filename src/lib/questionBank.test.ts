import { describe, expect, it } from 'vitest';
import {
  bankDraftFromBlock,
  blockPayloadFromBank,
  correctIdToIndex,
  indexToCorrectId,
  isOutdated,
  needsVersionBump,
  optionLabels,
  parsePoolConfig,
  parseTagInput,
  poolIsFillable,
  poolQuestionLabel,
  type BankDraft,
  type BankQuestion,
} from './questionBank';

const bank: BankQuestion = {
  id: 'bank-1',
  org_id: null,
  version: 3,
  stem: 'What comes first?',
  options: [
    { id: 'a', label: 'Check the tube', feedback: 'Yes' },
    { id: 'b', label: 'Start the feed' },
  ],
  correct_id: 'a',
  explanation: 'Always check first.',
  tags: ['feeding'],
  standard_code: 'CS-1',
  difficulty: 'easy',
};

describe('correct option mapping', () => {
  it('maps correct_id to an index', () => {
    expect(correctIdToIndex(bank.options, 'a')).toBe(0);
    expect(correctIdToIndex(bank.options, 'b')).toBe(1);
  });

  it('returns null for an unknown id', () => {
    expect(correctIdToIndex(bank.options, 'zz')).toBeNull();
  });

  it('maps back from index to id', () => {
    expect(indexToCorrectId(bank.options, 1)).toBe('b');
    expect(indexToCorrectId(bank.options, 9)).toBeNull();
  });

  it('flattens labels in authored order', () => {
    expect(optionLabels(bank.options)).toEqual(['Check the tube', 'Start the feed']);
  });
});

describe('outdated detection', () => {
  it('is outdated when the usage lags the bank', () => {
    expect(isOutdated(2, 3)).toBe(true);
  });

  it('is current when equal or ahead', () => {
    expect(isOutdated(3, 3)).toBe(false);
    expect(isOutdated(4, 3)).toBe(false);
  });

  it('never claims outdated without both versions', () => {
    expect(isOutdated(null, 3)).toBe(false);
    expect(isOutdated(2, undefined)).toBe(false);
  });
});

describe('version bumping', () => {
  const draft = (over: Partial<BankDraft> = {}): BankDraft => ({
    stem: bank.stem,
    options: bank.options.map((o) => ({ ...o })),
    correct_id: bank.correct_id,
    explanation: 'Always check first.',
    tags: ['feeding'],
    standard_code: 'CS-1',
    difficulty: 'easy',
    ...over,
  });

  it('does not bump for metadata-only edits', () => {
    expect(needsVersionBump(bank, draft({ tags: ['x'], explanation: 'new words' }))).toBe(false);
  });

  it('bumps when the stem changes', () => {
    expect(needsVersionBump(bank, draft({ stem: 'Different?' }))).toBe(true);
  });

  it('bumps when the correct answer changes', () => {
    expect(needsVersionBump(bank, draft({ correct_id: 'b' }))).toBe(true);
  });

  it('bumps when an option label or the option set changes', () => {
    expect(
      needsVersionBump(bank, draft({ options: [{ id: 'a', label: 'Changed' }, { id: 'b', label: 'Start the feed' }] })),
    ).toBe(true);
    expect(needsVersionBump(bank, draft({ options: [{ id: 'a', label: 'Check the tube' }] }))).toBe(true);
  });
});

describe('block payload mapping', () => {
  it('copies the bank row into a block payload with provenance', () => {
    const payload = blockPayloadFromBank(bank);
    expect(payload).toEqual({
      question: 'What comes first?',
      options: [
        { id: 'a', label: 'Check the tube', feedback: 'Yes' },
        { id: 'b', label: 'Start the feed' },
      ],
      correct_id: 'a',
      explanation: 'Always check first.',
      bank_id: 'bank-1',
      bank_version: 3,
    });
  });

  it('round-trips a block back into a bank draft', () => {
    const draft = bankDraftFromBlock(blockPayloadFromBank(bank));
    expect(draft.stem).toBe(bank.stem);
    expect(draft.correct_id).toBe('a');
    expect(draft.options).toHaveLength(2);
    expect(draft.tags).toEqual([]);
  });

  it('falls back to the first option when correct_id is missing', () => {
    const draft = bankDraftFromBlock({ options: [{ id: 'x', label: 'One' }] });
    expect(draft.correct_id).toBe('x');
  });
});

describe('pool configuration', () => {
  it('parses a valid pool config', () => {
    expect(parsePoolConfig({ pool_tags: ['feeding'], draw_count: 3 })).toEqual({
      pool_tags: ['feeding'],
      draw_count: 3,
    });
  });

  it('rejects empty tags or a non-positive draw count', () => {
    expect(parsePoolConfig({ pool_tags: [], draw_count: 3 })).toBeNull();
    expect(parsePoolConfig({ pool_tags: ['a'], draw_count: 0 })).toBeNull();
    expect(parsePoolConfig(null)).toBeNull();
  });

  it('knows when a pool cannot be filled', () => {
    expect(poolIsFillable(5, 3)).toBe(true);
    expect(poolIsFillable(2, 3)).toBe(false);
    expect(poolIsFillable(5, 0)).toBe(false);
  });

  it('labels pool rows for old readers', () => {
    expect(poolQuestionLabel(['feeding', 'safety'])).toBe('Pool: feeding, safety');
  });
});

describe('tag input', () => {
  it('trims, lowercases and de-duplicates', () => {
    expect(parseTagInput(' Feeding , safety,feeding, ')).toEqual(['feeding', 'safety']);
  });
});
