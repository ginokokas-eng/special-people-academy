import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Circle } from 'lucide-react';
import { lessonTypeLabel, formatDuration } from './lessonMeta';
import type { LearnLesson } from './types';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lesson: LearnLesson | undefined;
  moduleName: string | null;
  hasTranscript: boolean;
  hasResources: boolean;
}

export function ContentInfoDialog({
  open,
  onOpenChange,
  lesson,
  moduleName,
  hasTranscript,
  hasResources,
}: Props) {
  if (!lesson) return null;
  const rows: [string, React.ReactNode][] = [
    ['Lesson', lesson.title],
    ['Type', lessonTypeLabel(lesson.lesson_type)],
    ['Duration', formatDuration(lesson.duration_minutes) || '—'],
    ['Module', moduleName || '—'],
    [
      'Status',
      lesson.completed ? (
        <span className="flex items-center gap-1 text-status-success-foreground">
          <CheckCircle2 className="h-4 w-4" /> Completed
        </span>
      ) : (
        <span className="flex items-center gap-1 text-muted-foreground">
          <Circle className="h-4 w-4" /> In progress
        </span>
      ),
    ],
    ['Transcript', <Badge variant={hasTranscript ? 'secondary' : 'outline'}>{hasTranscript ? 'Available' : 'Not available'}</Badge>],
    ['Resources', <Badge variant={hasResources ? 'secondary' : 'outline'}>{hasResources ? 'Available' : 'Not available'}</Badge>],
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Content information</DialogTitle>
          <DialogDescription>Details about the lesson you are viewing.</DialogDescription>
        </DialogHeader>
        <dl className="divide-y">
          {rows.map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 py-2.5">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="text-right text-sm font-medium text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </DialogContent>
    </Dialog>
  );
}
