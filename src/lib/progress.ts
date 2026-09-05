/**
 * Single source of truth for learner progress percentages.
 *
 * The certificate gate (`check-course-completion`) counts ONLY lessons flagged
 * `is_required = true`. Every learner-facing percentage must use the same rule,
 * otherwise a learner can sit at 100% without a certificate (or the reverse).
 *
 * Denominator: lessons with `is_required = true`.
 * Numerator:   those with a completed `lesson_progress` row.
 */

export interface RequiredProgressLesson {
  id: string;
  is_required?: boolean | null;
  completed?: boolean;
}

/** Lessons that gate completion. */
export function requiredLessons<T extends RequiredProgressLesson>(lessons: T[]): T[] {
  return lessons.filter((l) => !!l.is_required);
}

/** Completed / total / percent over required lessons only. */
export function requiredProgress<T extends RequiredProgressLesson>(
  lessons: T[],
  completedIds?: Set<string>
): { completed: number; total: number; percent: number } {
  const required = requiredLessons(lessons);
  const total = required.length;
  const completed = required.filter((l) =>
    completedIds ? completedIds.has(l.id) : !!l.completed
  ).length;
  return {
    completed,
    total,
    percent: total > 0 ? Math.round((completed / total) * 100) : 0,
  };
}

/** Percent from raw counts, guarding divide-by-zero. */
export function progressPercent(completed: number, total: number): number {
  return total > 0 ? Math.round((completed / total) * 100) : 0;
}

/**
 * Exactly one status per enrolment.
 *
 * /my-courses previously derived its tabs from three overlapping, non-exhaustive
 * predicates (Assigned came from `is_internal`, not from progress at all), so a
 * purchased course sitting at 0% belonged to no tab and the counts never summed
 * to All. Both learner pages now share this single exclusive derivation.
 */
export type EnrolmentStatus = 'not_started' | 'in_progress' | 'completed';

export function enrolmentStatus(input: {
  progress: number;
  completedAt?: string | null;
}): EnrolmentStatus {
  if (input.progress >= 100 || input.completedAt) return 'completed';
  if (input.progress > 0) return 'in_progress';
  return 'not_started';
}

export const ENROLMENT_STATUS_LABELS: Record<EnrolmentStatus, string> = {
  not_started: 'Not Started',
  in_progress: 'In Progress',
  completed: 'Completed',
};
