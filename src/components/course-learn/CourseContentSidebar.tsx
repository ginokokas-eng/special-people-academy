import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckCircle2, Circle, ChevronDown, Paperclip, Download, Loader2 } from 'lucide-react';
import { lessonTypeIcon, formatDuration, totalDuration } from './lessonMeta';
import { useResourceDownload } from './useResourceDownload';
import type { LearnLesson, LearnModule, LearnResource } from './types';

interface Props {
  courseId: string;
  modules: LearnModule[];
  lessons: LearnLesson[];
  resources: LearnResource[];
  activeLessonId: string | undefined;
  onSelect: (lessonId: string) => void;
}

export function CourseContentSidebar({
  courseId,
  modules,
  lessons,
  resources,
  activeLessonId,
  onSelect,
}: Props) {
  const completedCount = lessons.filter((l) => l.completed).length;

  return (
    <div className="flex flex-col h-full">
      <div className="px-4 py-3 border-b">
        <p className="text-sm font-semibold text-foreground">Course content</p>
        <p className="text-xs text-muted-foreground mt-0.5">
          {completedCount}/{lessons.length} complete · {totalDuration(lessons) || '—'}
        </p>
      </div>
      <div className="flex-1 overflow-y-auto">
        {modules.map((mod) => {
          const modLessons = lessons.filter((l) => l.module_id === mod.id);
          if (modLessons.length === 0) return null;
          return (
            <ModuleSection
              key={mod.id}
              title={mod.title}
              lessons={modLessons}
              resources={resources}
              courseId={courseId}
              activeLessonId={activeLessonId}
              onSelect={onSelect}
              defaultOpen={modLessons.some((l) => l.id === activeLessonId)}
            />
          );
        })}
        {(() => {
          const unModuled = lessons.filter((l) => !l.module_id);
          if (unModuled.length === 0) return null;
          return (
            <ModuleSection
              title="Lessons"
              lessons={unModuled}
              resources={resources}
              courseId={courseId}
              activeLessonId={activeLessonId}
              onSelect={onSelect}
              defaultOpen
            />
          );
        })()}
      </div>
    </div>
  );
}

function ModuleSection({
  title,
  lessons,
  resources,
  courseId,
  activeLessonId,
  onSelect,
  defaultOpen,
}: {
  title: string;
  lessons: LearnLesson[];
  resources: LearnResource[];
  courseId: string;
  activeLessonId: string | undefined;
  onSelect: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const completed = lessons.filter((l) => l.completed).length;
  const duration = totalDuration(lessons);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b">
      <CollapsibleTrigger className="w-full flex items-center justify-between gap-2 px-4 py-3 text-left hover:bg-muted/50 transition-colors">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground truncate">{title}</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {completed}/{lessons.length} · {duration || '—'}
          </p>
        </div>
        <ChevronDown
          className={`h-4 w-4 text-muted-foreground flex-shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {lessons.map((lesson) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            active={lesson.id === activeLessonId}
            resources={resources.filter((r) => r.lesson_id === lesson.id)}
            courseId={courseId}
            onSelect={() => onSelect(lesson.id)}
          />
        ))}
      </CollapsibleContent>
    </Collapsible>
  );
}

function LessonRow({
  lesson,
  active,
  resources,
  courseId,
  onSelect,
}: {
  lesson: LearnLesson;
  active: boolean;
  resources: LearnResource[];
  courseId: string;
  onSelect: () => void;
}) {
  const { download, downloadingId } = useResourceDownload(courseId);

  return (
    <div
      className={`group flex items-start gap-2.5 pl-4 pr-2 py-2.5 text-left transition-colors ${
        active ? 'bg-primary/10 border-l-2 border-primary' : 'border-l-2 border-transparent hover:bg-muted/50'
      }`}
    >
      <button onClick={onSelect} className="flex items-start gap-2.5 flex-1 min-w-0 text-left">
        <span className="mt-0.5 flex-shrink-0">
          {lesson.completed ? (
            <CheckCircle2 className="h-4 w-4 text-status-success-foreground" />
          ) : (
            <Circle className="h-4 w-4 text-muted-foreground/40" />
          )}
        </span>
        <span className="flex-1 min-w-0">
          <span className={`block text-sm leading-snug ${active ? 'text-primary font-medium' : 'text-foreground'}`}>
            {lesson.title}
          </span>
          <span className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
            {lessonTypeIcon(lesson.lesson_type)}
            {lesson.lesson_type === 'quiz'
              ? `${lesson.question_count ?? 0} question${(lesson.question_count ?? 0) === 1 ? '' : 's'}`
              : formatDuration(lesson.duration_minutes)}
          </span>
        </span>
      </button>
      {resources.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="flex-shrink-0 p-1.5 rounded-md text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
              aria-label="Lesson resources"
            >
              <Paperclip className="h-3.5 w-3.5" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <p className="text-xs font-semibold text-muted-foreground px-2 py-1">Lesson resources</p>
            {resources.map((r) => (
              <button
                key={r.id}
                onClick={() => download(r.id, r.title)}
                disabled={downloadingId === r.id}
                className="w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-left hover:bg-muted transition-colors"
              >
                {downloadingId === r.id ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin flex-shrink-0" />
                ) : (
                  <Download className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                )}
                <span className="truncate">{r.title}</span>
              </button>
            ))}
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
