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
 * Metadata label shown under a lesson title in the learner sidebar.
 * - SCORM/video: estimated duration if available (e.g. "12 min"), else nothing.
 * - quiz/assessment: number of questions (e.g. "5 questions"); never minutes.
 *   An empty quiz (no authored questions) is treated as info-only.
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
  const total = lessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
  return formatDuration(total);
}

export { Play };
