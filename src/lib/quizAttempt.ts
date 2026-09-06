/**
 * Pure helpers for the server-graded quiz flow. The database owns grading;
 * these only shape what the UI shows and what gets sent to the RPC.
 */

/**
 * Unlimited attempts are stored as NULL, a non-positive number, or a sentinel
 * of 99+. Mirrors public.quiz_attempts_unlimited() exactly.
 */
export function isUnlimitedAttempts(allowed: number | null | undefined): boolean {
  return allowed === null || allowed === undefined || allowed <= 0 || allowed >= 99;
}

/** Effective attempt cap, or null when attempts are unlimited. */
export function effectiveAttemptsAllowed(allowed: number | null | undefined): number | null {
  return isUnlimitedAttempts(allowed) ? null : (allowed as number);
}

/** Attempts left including the current one; null when unlimited. */
export function attemptsRemaining(
  allowed: number | null | undefined,
  used: number,
): number | null {
  const cap = effectiveAttemptsAllowed(allowed);
  if (cap === null) return null;
  return Math.max(0, cap - Math.max(0, used));
}

/**
 * Displayed option order for one drawn question: option_order[displayed] =
 * stored index. Applying it renders the learner's shuffled labels.
 */
export function applyPermutation<T>(options: T[], order: number[]): T[] {
  return order.map((storedIndex) => options[storedIndex]);
}

/** Displayed index -> stored index. */
export function toStoredIndex(order: number[], displayedIndex: number): number | null {
  if (displayedIndex < 0 || displayedIndex >= order.length) return null;
  return order[displayedIndex];
}

/** Stored index -> displayed index. */
export function toDisplayedIndex(order: number[], storedIndex: number): number | null {
  const at = order.indexOf(storedIndex);
  return at === -1 ? null : at;
}

/**
 * Submit payload: { question_id: displayed_index }. Unanswered questions are
 * omitted — the server counts them as incorrect.
 */
export function buildAnswersPayload(
  answers: Record<string, number | null | undefined>,
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [questionId, displayed] of Object.entries(answers)) {
    if (typeof displayed === 'number' && Number.isInteger(displayed) && displayed >= 0) {
      out[questionId] = displayed;
    }
  }
  return out;
}

/** Friendly copy for the error codes the RPCs raise. */
export function quizRpcErrorMessage(message: string | undefined): string {
  const m = message || '';
  if (/attempt_limit_reached/.test(m)) return 'You have used all your allowed attempts for this quiz.';
  if (/session_already_submitted/.test(m)) return 'This attempt has already been submitted.';
  if (/session_not_found/.test(m)) return 'This quiz attempt has expired. Please start again.';
  if (/no_course_access/.test(m)) return 'You do not have access to this course.';
  if (/quiz_has_no_questions/.test(m)) return 'This quiz has no questions yet.';
  if (/quiz_not_found/.test(m)) return 'Quiz not available.';
  return 'Something went wrong. Please try again.';
}
