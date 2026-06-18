import { Play, FileText, HelpCircle, ClipboardCheck, MessageSquareWarning, FileType2, Video } from 'lucide-react';
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

export function totalDuration(lessons: LearnLesson[]): string {
  const total = lessons.reduce((sum, l) => sum + (l.duration_minutes || 0), 0);
  return formatDuration(total);
}

export { Play };
