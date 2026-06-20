import { Play, FileText, HelpCircle, ClipboardCheck, MessageSquareWarning, FileType2, Video, BookOpen } from 'lucide-react';
import type { LearnLesson } from './types';

export function lessonTypeIcon(type: string, className = 'h-3.5 w-3.5') {
  switch (type) {
    case 'scorm':
    case 'video':
      return <Video className={className} />;
    case 'quiz':
      return <HelpCircle className={className} />;
    case 'practical':
      return <ClipboardCheck className={className} />;
    case 'scenario':
      return <MessageSquareWarning className={className} />;
    case 'resource':
      return <BookOpen className={className} />;
    case 'pdf':
      return <FileType2 className={className} />;
    default:
      return <FileText className={className} />;
  }
}

export function lessonTypeLabel(type: string): string {
  switch (type) {
    case 'scorm':
      return 'Video';
    case 'video':
      return 'Video';
    case 'quiz':
      return 'Assessment';
    case 'practical':
      return 'Practical';
    case 'scenario':
      return 'Scenario';
    case 'resource':
      return 'Resource';
    case 'pdf':
      return 'Document';
    case 'text':
      return 'Reading';
    default:
      return type;
  }
}

export function formatDuration(minutes: number | null | undefined): string {
  if (!minutes) return '';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

/**
 * Convert an exact media duration (seconds) into whole minutes.
 * - under 60s -> 1 (display "1 min")
 * - over 60s  -> round up to the nearest minute
 * - missing   -> 0 (no duration known; never a placeholder)
 */
export function videoDurationMinutes(seconds: number | null | undefined): number {
  if (!seconds || seconds <= 0) return 0;
  if (seconds < 60) return 1;
  return Math.ceil(seconds / 60);
}

/**
 * Sidebar duration label for a video/SCORM lesson.
 * Uses the exact uploaded media duration (duration_seconds) only — never the
 * legacy duration_minutes placeholder. Returns '' when duration is unknown.
 */
export function videoDurationLabel(lesson: LearnLesson): string {
  return formatDuration(videoDurationMinutes(lesson.duration_seconds));
}

/** Estimated printed pages for a resource/reading lesson (min 1). */
export function resourcePageCount(lesson: LearnLesson): number {
  const len = (lesson.content || '').trim().length;
  if (len === 0) return 0;
  return Math.max(1, Math.ceil(len / 2400));
}

/**
 * Metadata label shown under a lesson title in the learner sidebar.
 * - SCORM/video: estimated duration if available (e.g. "12 min"), else nothing.
 * - quiz/assessment: number of questions (e.g. "5 questions"); never minutes.
 *   An empty quiz (no authored questions) is treated as info-only.
 * - resource/reading: "Resource · N page(s)"; never minutes.
 * - practical sign-off: "Practical".
 * - certificate: "Certificate".
 * - info-only pages (text/pdf/scenario): "Info", never a fake duration.
 */
export function lessonMetaLabel(lesson: LearnLesson): string {
  switch (lesson.lesson_type) {
    case 'scorm':
    case 'video':
      return formatDuration(lesson.duration_minutes);
    case 'quiz': {
      const count = lesson.question_count ?? 0;
      return count > 0 ? `${count} question${count === 1 ? '' : 's'}` : 'Info';
    }
    case 'resource': {
      const pages = resourcePageCount(lesson);
      return pages > 0 ? `Resource · ${pages} page${pages === 1 ? '' : 's'}` : 'Resource';
    }
    case 'practical':
      return 'Practical';
    case 'certificate':
      return 'Certificate';
    case 'text':
    case 'pdf':
    case 'scenario':
      return 'Info';
    default:
      return formatDuration(lesson.duration_minutes);
  }
}

export function totalDuration(lessons: LearnLesson[]): string {
  // Only timed media (SCORM/video) contributes to module/course duration.
  // Resources, quizzes, practicals and certificates never add minutes.
  const total = lessons.reduce(
    (sum, l) =>
      l.lesson_type === 'scorm' || l.lesson_type === 'video'
        ? sum + (l.duration_minutes || 0)
        : sum,
    0
  );
  return formatDuration(total);
}

export { Play };
