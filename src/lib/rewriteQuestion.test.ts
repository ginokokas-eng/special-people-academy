import { describe, expect, it } from 'vitest';
import {
  REWRITE_MIN_LEARNERS,
  REWRITE_THRESHOLD_PCT,
  buildRewriteStats,
  diffMcq,
  isWeakMcq,
  pctWrong,
  rewriteNote,
  rewriteSummary,
  rightFirstTimePct,
  validateRewrite,
} from './rewriteQuestion';
import type { BlockItemStat } from '@/components/admin/course-builder/blockStats';
import type { McqPayload } from '@/components/course-learn/blocks/types';

const payload = (): McqPayload => ({
  question: 'What do you do first?',
  options: [
    { id: 'a', label: 'Stop and escalate', feedback: 'Yes.' },
    { id: 'b', label: 'Wait and see' },
    { id: 'c', label: 'Carry on' },
  ],
  correct_id: 'a',
  explanation: 'Escalation keeps the person safe.',
});

const stat = (over: Partial<BlockItemStat> = {}): BlockItemStat => ({
  block_id: 'block-1',
  block_type: 'mcq',
  position: 0,
  learners: 10,
  completed: 10,
  correct: 8,
  correct_without_retry: 4,
  avg_attempts: 1.6,
  option_counts: { a: 4, b: 5, c: 1 },
  confusion: [],
  ...over,
});

describe('buildRewriteStats', () => {
  it('reports aggregate tallies only, with the correct option flagged', () => {
    const stats = buildRewriteStats(stat(), payload());
    expect(stats.attempts).toBe(10);
    expect(stats.pct_correct).toBe(40);
    expect(pctWrong(stats)).toBe(60);
    expect(stats.option_tallies).toEqual([
      { option_id: 'a', label: 'Stop and escalate', count: 4, is_correct: true },
      { option_id: 'b', label: 'Wait and see', count: 5, is_correct: false },
      { option_id: 'c', label: 'Carry on', count: 1, is_correct: false },
    ]);
    expect(stats.top_distractor).toEqual({ label: 'Wait and see', count: 5 });
    // No learner identity of any kind leaves the helper.
    expect(JSON.stringify(stats)).not.toContain('user');
  });

  it('handles a block nobody has answered', () => {
    const stats = buildRewriteStats(stat({ option_counts: {}, learners: 0 }), payload());
    expect(stats.attempts).toBe(0);
    expect(stats.pct_correct).toBe(0);
    expect(stats.top_distractor).toBeNull();
  });
});

describe('isWeakMcq', () => {
  it('needs enough learners before flagging', () => {
    expect(isWeakMcq(stat({ learners: REWRITE_MIN_LEARNERS - 1 }))).toBe(false);
  });

  it('flags a low right-first-time rate', () => {
    expect(rightFirstTimePct(stat())).toBe(40);
    expect(isWeakMcq(stat())).toBe(true);
  });

  it('does not flag a strong question', () => {
    expect(isWeakMcq(stat({ correct_without_retry: 9 }))).toBe(false);
    expect(REWRITE_THRESHOLD_PCT).toBe(70);
  });

  it('ignores non-MCQ blocks', () => {
    expect(isWeakMcq(stat({ block_type: 'drag_match' }))).toBe(false);
  });

  it('honours overridden thresholds', () => {
    expect(isWeakMcq(stat({ correct_without_retry: 10 }), { threshold: 101, minLearners: 1 })).toBe(
      true,
    );
  });
});

describe('rewriteSummary and rewriteNote', () => {
  it('names the top distractor', () => {
    const stats = buildRewriteStats(stat(), payload());
    expect(rewriteSummary(stats)).toBe('60% answered wrong · top distractor: “Wait and see”');
    expect(rewriteNote(stats)).toBe(
      "Rewritten from Insights (60% wrong; top distractor 'Wait and see')",
    );
  });

  it('drops the distractor clause when nobody picked a wrong answer', () => {
    const stats = buildRewriteStats(stat({ option_counts: { a: 5 } }), payload());
    expect(rewriteNote(stats)).toBe('Rewritten from Insights (0% wrong)');
  });
});

describe('diffMcq', () => {
  it('spots changed distractors, feedback and explanation', () => {
    const before = payload();
    const after: McqPayload = {
      ...before,
      question: 'What do you do first?',
      options: [
        { id: 'a', label: 'Stop and escalate', feedback: 'Yes — this keeps them safe.' },
        { id: 'b', label: 'Write it in the notes and move on' },
        { id: 'c', label: 'Carry on' },
      ],
      explanation: 'Escalate straight away.',
    };
    const diff = diffMcq(before, after);
    expect(diff.questionChanged).toBe(false);
    expect(diff.explanationChanged).toBe(true);
    expect(diff.options[0].feedbackChanged).toBe(true);
    expect(diff.options[1].labelChanged).toBe(true);
    expect(diff.options[2].labelChanged).toBe(false);
    expect(diff.anyChanged).toBe(true);
  });

  it('reports no change for an identical payload', () => {
    expect(diffMcq(payload(), payload()).anyChanged).toBe(false);
  });
});

describe('validateRewrite', () => {
  it('accepts a rewrite that keeps the correct answer intact', () => {
    const before = payload();
    const after: McqPayload = {
      ...before,
      options: [
        before.options[0],
        { id: 'b', label: 'Record it and check again tomorrow' },
        { id: 'c', label: 'Carry on' },
      ],
      explanation: 'Escalate straight away.',
    };
    expect(validateRewrite(before, after)).toEqual([]);
  });

  it('refuses a changed correct answer', () => {
    const before = payload();
    const after: McqPayload = {
      ...before,
      options: [{ id: 'a', label: 'Escalate' }, before.options[1], before.options[2]],
    };
    expect(validateRewrite(before, after)).toContain(
      'the correct answer’s wording must stay exactly as it was',
    );
  });

  it('refuses a different number of answers', () => {
    const before = payload();
    const after: McqPayload = { ...before, options: before.options.slice(0, 2) };
    expect(validateRewrite(before, after)).toContain(
      'the rewrite must keep the same number of answers',
    );
  });

  it('refuses a moved correct answer', () => {
    const before = payload();
    const after: McqPayload = {
      ...before,
      options: [before.options[1], before.options[0], before.options[2]],
    };
    expect(validateRewrite(before, after)).toContain(
      'the correct answer must stay in the same position',
    );
  });

  it('refuses an empty answer or question', () => {
    const before = payload();
    expect(
      validateRewrite(before, {
        ...before,
        question: '  ',
        options: [before.options[0], { id: 'b', label: '' }, before.options[2]],
      }),
    ).toEqual(
      expect.arrayContaining(['the question must not be empty', 'every answer needs wording']),
    );
  });

  it('refuses a rewrite that changed nothing', () => {
    expect(validateRewrite(payload(), payload())).toContain(
      'the rewrite changed nothing worth accepting',
    );
  });
});
