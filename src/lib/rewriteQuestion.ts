/**
 * Insights → copilot rewrite loop (pure helpers).
 *
 * Turns one MCQ block's item statistics into the aggregate-only payload the
 * `rewrite_question` mode of author-lesson-blocks takes, and checks what comes
 * back. NOTHING here reads or writes learner rows: the stats object carries
 * counts and labels only — never a learner id, name or answer row.
 *
 * The same rules are implemented server-side (validateRewriteReply); these
 * are the client's copy so a bad draft is refused before an author can accept
 * it.
 */

import {
  mcqCounts,
  optionTallies,
  pctOf,
  topDistractor,
  totalPicks,
  type BlockItemStat,
} from '@/components/admin/course-builder/blockStats';
import type { McqOption, McqPayload } from '@/components/course-learn/blocks/types';

/** A question is "weak" below this right-first-time rate… */
export const REWRITE_THRESHOLD_PCT = 70;
/** …once at least this many learners have answered it. */
export const REWRITE_MIN_LEARNERS = 5;

export type RewriteFocus = 'distractors' | 'explanation' | 'both';

export interface RewriteOptionTally {
  option_id: string;
  label: string;
  count: number;
  is_correct: boolean;
}

export interface RewriteStats {
  attempts: number;
  /** Share of recorded picks that landed on the correct option. */
  pct_correct: number;
  option_tallies: RewriteOptionTally[];
  top_distractor: { label: string; count: number } | null;
}

export interface RewriteThresholds {
  threshold?: number;
  minLearners?: number;
}

/** Right-first-time rate, as a whole percentage of the learners who answered. */
export function rightFirstTimePct(stat: BlockItemStat): number {
  return pctOf(stat.correct_without_retry, stat.learners);
}

/**
 * Below the right-first-time threshold with enough learners to mean something.
 * MCQ blocks only — assessment quiz questions have no item statistics yet.
 */
export function isWeakMcq(stat: BlockItemStat, thresholds: RewriteThresholds = {}): boolean {
  const threshold = thresholds.threshold ?? REWRITE_THRESHOLD_PCT;
  const minLearners = thresholds.minLearners ?? REWRITE_MIN_LEARNERS;
  if (stat.block_type !== 'mcq') return false;
  if (stat.learners < minLearners) return false;
  return rightFirstTimePct(stat) < threshold;
}

/** Aggregates only: labels come from the payload, correctness from correct_id. */
export function buildRewriteStats(stat: BlockItemStat, payload: McqPayload): RewriteStats {
  const counts = mcqCounts(stat);
  const options = payload.options ?? [];
  const tallies = optionTallies(options, counts, payload.correct_id);
  const total = totalPicks(counts);
  const correct = tallies.find((t) => t.correct);
  const distractor = topDistractor(tallies);
  return {
    attempts: total,
    pct_correct: pctOf(correct?.count ?? 0, total),
    option_tallies: options.map((o) => ({
      option_id: o.id,
      label: o.label,
      count: counts[o.id] ?? 0,
      is_correct: o.id === payload.correct_id,
    })),
    top_distractor: distractor ? { label: distractor.label, count: distractor.count } : null,
  };
}

/** Share of recorded picks that were wrong. */
export function pctWrong(stats: RewriteStats): number {
  return Math.max(0, 100 - stats.pct_correct);
}

/** Human summary shown on the rewrite tab. */
export function rewriteSummary(stats: RewriteStats): string {
  const wrong = `${pctWrong(stats)}% answered wrong`;
  return stats.top_distractor
    ? `${wrong} · top distractor: “${stats.top_distractor.label}”`
    : wrong;
}

/** Pre-filled save note, so the history says where the rewrite came from. */
export function rewriteNote(stats: RewriteStats): string {
  const wrong = pctWrong(stats);
  return stats.top_distractor
    ? `Rewritten from Insights (${wrong}% wrong; top distractor '${stats.top_distractor.label}')`
    : `Rewritten from Insights (${wrong}% wrong)`;
}

/* ---------------------------------- diff ---------------------------------- */

export interface McqOptionDiff {
  index: number;
  before: string;
  after: string;
  labelChanged: boolean;
  feedbackChanged: boolean;
  isCorrect: boolean;
}

export interface McqDiff {
  questionChanged: boolean;
  explanationChanged: boolean;
  options: McqOptionDiff[];
  /** Anything at all changed. */
  anyChanged: boolean;
}

const text = (value: string | undefined | null) => value ?? '';

export function diffMcq(before: McqPayload, after: McqPayload): McqDiff {
  const options: McqOptionDiff[] = (after.options ?? []).map((option, index) => {
    const was: McqOption | undefined = before.options?.[index];
    return {
      index,
      before: text(was?.label),
      after: text(option.label),
      labelChanged: text(was?.label) !== text(option.label),
      feedbackChanged: text(was?.feedback) !== text(option.feedback),
      isCorrect: option.id === after.correct_id,
    };
  });
  const questionChanged = text(before.question) !== text(after.question);
  const explanationChanged = text(before.explanation) !== text(after.explanation);
  return {
    questionChanged,
    explanationChanged,
    options,
    anyChanged:
      questionChanged ||
      explanationChanged ||
      options.some((o) => o.labelChanged || o.feedbackChanged),
  };
}

/* -------------------------------- validation ------------------------------- */

/**
 * The rewrite is refused unless it keeps the question answerable in exactly the
 * same way: same number of options, the correct answer's wording untouched and
 * still marked correct, and something actually improved.
 */
export function validateRewrite(before: McqPayload, after: McqPayload): string[] {
  const errors: string[] = [];
  const beforeOptions = before.options ?? [];
  const afterOptions = after.options ?? [];
  if (afterOptions.length !== beforeOptions.length) {
    errors.push('the rewrite must keep the same number of answers');
  }
  const beforeCorrectIndex = beforeOptions.findIndex((o) => o.id === before.correct_id);
  const afterCorrectIndex = afterOptions.findIndex((o) => o.id === after.correct_id);
  const beforeCorrect = beforeOptions[beforeCorrectIndex];
  const afterCorrect = afterOptions[afterCorrectIndex];
  if (!afterCorrect) {
    errors.push('the rewrite has no correct answer marked');
  } else if (!beforeCorrect || text(beforeCorrect.label) !== text(afterCorrect.label)) {
    errors.push('the correct answer’s wording must stay exactly as it was');
  } else if (beforeCorrectIndex !== afterCorrectIndex) {
    errors.push('the correct answer must stay in the same position');
  }
  if (!text(after.question).trim()) errors.push('the question must not be empty');
  if (afterOptions.some((o) => !text(o.label).trim())) errors.push('every answer needs wording');

  const diff = diffMcq(before, after);
  const somethingUseful =
    diff.explanationChanged ||
    diff.options.some((o) => (!o.isCorrect && o.labelChanged) || o.feedbackChanged);
  if (!somethingUseful) errors.push('the rewrite changed nothing worth accepting');
  return errors;
}
