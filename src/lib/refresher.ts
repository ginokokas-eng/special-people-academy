/**
 * Pure helpers for spaced refreshers (7 and 30 days after a course completion).
 *
 * The database owns scheduling, question selection and grading. These helpers
 * only mirror those rules so the UI can describe them honestly, and so the
 * rules can be tested without a database.
 */

import { applyPermutation, toStoredIndex } from './quizAttempt';

export type RefresherKind = '7d' | '30d';
export type RefresherStatus = 'pending' | 'ready' | 'done' | 'skipped';

/** Row shape returned by get_due_refreshers. */
export interface DueRefresher {
  schedule_id: string;
  course_id: string;
  course_title: string | null;
  kind: RefresherKind;
  due_at: string;
  status: RefresherStatus;
  question_count: number;
}

/** One snapshotted question as stored on refresher_schedules.questions. */
export interface RefresherSnapshotQuestion {
  question_id: string;
  source: 'bank' | 'block';
  stem: string;
  options: string[];
  correct_index: number;
  explanation: string | null;
  option_order: number[];
}

/** How many questions a refresher draws. */
export const REFRESHER_DRAW_COUNT = 3;

/** A refresher that has sat unanswered for this long is quietly dropped. */
export const REFRESHER_SKIP_AFTER_DAYS = 21;

/** Shown wherever refreshers are explained. */
export const REFRESHER_EXPLAINER =
  'Refreshers are short recall checks 7 and 30 days after completion.';

export function kindLabel(kind: RefresherKind): string {
  return kind === '7d' ? '7-day refresher' : '30-day refresher';
}

/**
 * Where the three questions come from, in the same precedence the database
 * uses: platform bank rows matching the course's linked standards, then
 * platform bank rows whose tags overlap the course's tags, then the course's
 * own multiple-choice blocks. Nothing is ever fabricated.
 */
export function drawSource(counts: {
  bankByStandards: number;
  bankByTags: number;
  courseMcqBlocks: number;
}): 'bank_standards' | 'bank_tags' | 'block' | 'none' {
  if (counts.bankByStandards > 0) return 'bank_standards';
  if (counts.bankByTags > 0) return 'bank_tags';
  if (counts.courseMcqBlocks > 0) return 'block';
  return 'none';
}

/** True once a due refresher is past the skip window. */
export function isSkipped(dueAt: string | Date, now: Date = new Date()): boolean {
  const due = typeof dueAt === 'string' ? new Date(dueAt) : dueAt;
  return due.getTime() < now.getTime() - REFRESHER_SKIP_AFTER_DAYS * 864e5;
}

/** Options as the learner sees them for one snapshotted question. */
export function displayedOptions(q: RefresherSnapshotQuestion): string[] {
  return applyPermutation(q.options, q.option_order);
}

/**
 * Mirror of submit_refresher's grading: the learner sends displayed indexes,
 * which are translated through option_order before comparison.
 */
export function gradeSnapshot(
  questions: RefresherSnapshotQuestion[],
  answers: Record<string, number | null | undefined>,
): { correct: number; total: number; score: number } {
  let correct = 0;
  for (const q of questions) {
    const displayed = answers[q.question_id];
    if (typeof displayed !== 'number') continue;
    const stored = toStoredIndex(q.option_order, displayed);
    if (stored !== null && stored === q.correct_index) correct += 1;
  }
  const total = questions.length;
  return { correct, total, score: total ? Math.round((100 * correct) / total) : 0 };
}

/** Due now and answerable. */
export function isStartable(row: DueRefresher, now: Date = new Date()): boolean {
  return (
    row.status === 'ready' &&
    row.question_count > 0 &&
    new Date(row.due_at).getTime() <= now.getTime()
  );
}

/** The quiet "next refresher" hint, or null when there is nothing upcoming. */
export function nextUpcoming(rows: DueRefresher[], now: Date = new Date()): DueRefresher | null {
  const upcoming = rows
    .filter((r) => r.status === 'pending' && new Date(r.due_at).getTime() > now.getTime())
    .sort((a, b) => new Date(a.due_at).getTime() - new Date(b.due_at).getTime());
  return upcoming[0] ?? null;
}

/** Friendly copy for the error codes the refresher RPCs raise. */
export function refresherErrorMessage(message: string | undefined): string {
  const m = message || '';
  if (/refresher_already_done/.test(m)) return 'You have already completed this refresher.';
  if (/refresher_not_ready/.test(m)) return 'This refresher is not ready yet.';
  if (/refresher_not_found/.test(m)) return 'This refresher is no longer available.';
  if (/refresher_has_no_questions/.test(m)) return 'No refresher questions are available for this course yet.';
  return 'Something went wrong. Please try again.';
}
