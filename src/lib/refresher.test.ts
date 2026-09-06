import { describe, expect, it } from 'vitest';
import {
  displayedOptions,
  drawSource,
  gradeSnapshot,
  isSkipped,
  isStartable,
  nextUpcoming,
  refresherErrorMessage,
  type DueRefresher,
  type RefresherSnapshotQuestion,
} from './refresher';

describe('drawSource precedence', () => {
  it('prefers bank rows matched by standards', () => {
    expect(drawSource({ bankByStandards: 3, bankByTags: 9, courseMcqBlocks: 9 })).toBe(
      'bank_standards',
    );
  });

  it('falls back to bank rows matched by tags', () => {
    expect(drawSource({ bankByStandards: 0, bankByTags: 2, courseMcqBlocks: 9 })).toBe('bank_tags');
  });

  it('falls back to the course own MCQ blocks', () => {
    expect(drawSource({ bankByStandards: 0, bankByTags: 0, courseMcqBlocks: 1 })).toBe('block');
  });

  it('never fabricates when nothing matches', () => {
    expect(drawSource({ bankByStandards: 0, bankByTags: 0, courseMcqBlocks: 0 })).toBe('none');
  });
});

const question = (
  id: string,
  correctIndex: number,
  order: number[],
): RefresherSnapshotQuestion => ({
  question_id: id,
  source: 'bank',
  stem: 'Stem',
  options: ['A', 'B', 'C', 'D'],
  correct_index: correctIndex,
  explanation: null,
  option_order: order,
});

describe('permutation and grading round-trip', () => {
  it('renders options in the snapshotted order', () => {
    expect(displayedOptions(question('q1', 0, [2, 0, 3, 1]))).toEqual(['C', 'A', 'D', 'B']);
  });

  it('marks the displayed index that maps to the stored correct option', () => {
    const q = question('q1', 3, [2, 0, 3, 1]);
    // Stored index 3 sits at displayed position 2.
    expect(gradeSnapshot([q], { q1: 2 })).toEqual({ correct: 1, total: 1, score: 100 });
    expect(gradeSnapshot([q], { q1: 0 })).toEqual({ correct: 0, total: 1, score: 0 });
  });

  it('counts unanswered questions as wrong', () => {
    const qs = [question('a', 0, [0, 1, 2, 3]), question('b', 1, [1, 0, 2, 3])];
    expect(gradeSnapshot(qs, { a: 0 })).toEqual({ correct: 1, total: 2, score: 50 });
    expect(gradeSnapshot(qs, {})).toEqual({ correct: 0, total: 2, score: 0 });
  });

  it('is honest about an empty snapshot', () => {
    expect(gradeSnapshot([], {})).toEqual({ correct: 0, total: 0, score: 0 });
  });
});

describe('skip rule', () => {
  const now = new Date('2026-03-01T00:00:00Z');

  it('skips refreshers more than 21 days overdue', () => {
    expect(isSkipped('2026-02-01T00:00:00Z', now)).toBe(true);
  });

  it('keeps refreshers inside the window', () => {
    expect(isSkipped('2026-02-20T00:00:00Z', now)).toBe(false);
    expect(isSkipped('2026-03-05T00:00:00Z', now)).toBe(false);
  });
});

describe('startable and upcoming', () => {
  const now = new Date('2026-03-01T00:00:00Z');
  const row = (over: Partial<DueRefresher>): DueRefresher => ({
    schedule_id: 's',
    course_id: 'c',
    course_title: 'Course',
    kind: '7d',
    due_at: '2026-02-25T00:00:00Z',
    status: 'ready',
    question_count: 3,
    ...over,
  });

  it('is startable only when ready, due and populated', () => {
    expect(isStartable(row({}), now)).toBe(true);
    expect(isStartable(row({ status: 'pending' }), now)).toBe(false);
    expect(isStartable(row({ question_count: 0 }), now)).toBe(false);
    expect(isStartable(row({ due_at: '2026-03-10T00:00:00Z' }), now)).toBe(false);
  });

  it('picks the soonest pending future refresher', () => {
    const rows = [
      row({ schedule_id: 'later', status: 'pending', due_at: '2026-04-01T00:00:00Z' }),
      row({ schedule_id: 'soon', status: 'pending', due_at: '2026-03-10T00:00:00Z' }),
      row({ schedule_id: 'done', status: 'done', due_at: '2026-03-05T00:00:00Z' }),
    ];
    expect(nextUpcoming(rows, now)?.schedule_id).toBe('soon');
    expect(nextUpcoming([row({})], now)).toBeNull();
  });
});

describe('refresherErrorMessage', () => {
  it('maps known codes', () => {
    expect(refresherErrorMessage('refresher_already_done')).toMatch(/already completed/i);
    expect(refresherErrorMessage('refresher_has_no_questions')).toMatch(/no refresher questions/i);
    expect(refresherErrorMessage('boom')).toMatch(/went wrong/i);
  });
});
