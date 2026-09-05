/**
 * Single source of truth for lesson durations.
 *
 * Exact media length (`duration_seconds`) is preferred; when it is missing we
 * fall back to the admin-entered `duration_minutes` (used for reading/resource
 * lessons, which have no media). Surfaces must never invent a placeholder.
 */

export interface DurationLesson {
  duration_seconds?: number | null;
  duration_minutes?: number | null;
}

/** Seconds a lesson contributes to a module/course total. 0 when unknown. */
export function lessonDurationSeconds(lesson: DurationLesson): number {
  const seconds = lesson.duration_seconds;
  if (seconds != null && seconds > 0) return seconds;
  const minutes = lesson.duration_minutes;
  return minutes != null && minutes > 0 ? minutes * 60 : 0;
}

/** Sum of lesson durations, in seconds. */
export function totalDurationSeconds(lessons: DurationLesson[]): number {
  return lessons.reduce((sum, l) => sum + lessonDurationSeconds(l), 0);
}

/** Whole minutes from seconds: <60s -> 1, otherwise round up. 0 stays 0. */
export function minutesFromSeconds(seconds: number | null | undefined): number {
  if (!seconds || seconds <= 0) return 0;
  if (seconds < 60) return 1;
  return Math.ceil(seconds / 60);
}

/** "45 min" / "1h" / "1h 20m". Empty string when there is no duration. */
export function formatMinutes(minutes: number | null | undefined): string {
  if (!minutes || minutes <= 0) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/** Duration label for a set of lessons. Empty string when unknown. */
export function formatLessonsDuration(lessons: DurationLesson[]): string {
  return formatMinutes(minutesFromSeconds(totalDurationSeconds(lessons)));
}

/** "1 lesson" / "4 lessons". */
export function lessonCountLabel(count: number): string {
  return `${count} ${count === 1 ? 'lesson' : 'lessons'}`;
}
