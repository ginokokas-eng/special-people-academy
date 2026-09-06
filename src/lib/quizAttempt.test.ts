import { describe, expect, it } from 'vitest';
import {
  applyPermutation,
  attemptsRemaining,
  buildAnswersPayload,
  effectiveAttemptsAllowed,
  isUnlimitedAttempts,
  quizRpcErrorMessage,
  toDisplayedIndex,
  toStoredIndex,
} from './quizAttempt';

describe('unlimited attempts rule', () => {
  it('treats null, undefined, 0, negatives and 99+ as unlimited', () => {
    for (const v of [null, undefined, 0, -1, 99, 100, 999]) {
      expect(isUnlimitedAttempts(v as number | null)).toBe(true);
    }
  });

  it('treats 1..98 as a real cap', () => {
    for (const v of [1, 2, 3, 98]) {
      expect(isUnlimitedAttempts(v)).toBe(false);
      expect(effectiveAttemptsAllowed(v)).toBe(v);
    }
    expect(effectiveAttemptsAllowed(99)).toBeNull();
  });
});

describe('attemptsRemaining', () => {
  it('is null when unlimited', () => {
    expect(attemptsRemaining(null, 5)).toBeNull();
    expect(attemptsRemaining(99, 5)).toBeNull();
  });

  it('counts down and floors at zero', () => {
    expect(attemptsRemaining(3, 0)).toBe(3);
    expect(attemptsRemaining(3, 2)).toBe(1);
    expect(attemptsRemaining(3, 3)).toBe(0);
    expect(attemptsRemaining(3, 9)).toBe(0);
  });
});

describe('permutation', () => {
  const stored = ['A', 'B', 'C', 'D'];
  const order = [2, 0, 3, 1];

  it('renders labels in displayed order', () => {
    expect(applyPermutation(stored, order)).toEqual(['C', 'A', 'D', 'B']);
  });

  it('round-trips displayed <-> stored indexes', () => {
    for (let displayed = 0; displayed < order.length; displayed++) {
      const s = toStoredIndex(order, displayed)!;
      expect(toDisplayedIndex(order, s)).toBe(displayed);
      expect(stored[s]).toBe(applyPermutation(stored, order)[displayed]);
    }
  });

  it('rejects out-of-range indexes', () => {
    expect(toStoredIndex(order, -1)).toBeNull();
    expect(toStoredIndex(order, 4)).toBeNull();
    expect(toDisplayedIndex(order, 7)).toBeNull();
  });
});

describe('buildAnswersPayload', () => {
  it('keeps integer displayed indexes and drops blanks', () => {
    expect(
      buildAnswersPayload({ a: 0, b: 2, c: null, d: undefined, e: -1, f: 1.5 }),
    ).toEqual({ a: 0, b: 2 });
  });

  it('is empty for an untouched quiz', () => {
    expect(buildAnswersPayload({})).toEqual({});
  });
});

describe('quizRpcErrorMessage', () => {
  it('maps known codes', () => {
    expect(quizRpcErrorMessage('attempt_limit_reached')).toMatch(/allowed attempts/i);
    expect(quizRpcErrorMessage('session_not_found')).toMatch(/expired/i);
    expect(quizRpcErrorMessage('boom')).toMatch(/went wrong/i);
  });
});
