import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CheckCircle2, ChevronDown, Download, Loader2, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  lessonTypeIcon,
  videoDurationLabel,
  resourcePageCount,
  totalDuration,
} from './lessonMeta';
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

/**
 * Mobile-friendly lesson list for the "Lectures" tab.
 *
 * Learner-facing labels only — never "SCORM", never "Info", never a fake
 * placeholder duration:
 *  - video        → "Video · 12 min"  (only when an exact duration is known)
 *  - assessment   → "Assessment · 5 questions" / "Final Assessment · 15 questions"
 *  - resource     → "Resource · 1 page"
 *  - practical    → "Practical"
 *  - certificate  → "Certificate"
 *  - reading/doc  → "Reading" / "Document" / "Scenario" (no fake minutes)
 */
function mobileLessonLabel(lesson: LearnLesson): string {
  switch (lesson.lesson_type) {
    case 'scorm':
    case 'video': {
      const d = videoDurationLabel(lesson);
      return d ? `Video · ${d}` : 'Video';
    }
    case 'quiz': {
      const count = lesson.question_count ?? 0;
      const isFinal = /final/i.test(lesson.title);
      const base = isFinal ? 'Final Assessment' : 'Assessment';
      return count > 0 ? `${base} · ${count} question${count === 1 ? '' : 's'}` : base;
    }
    case 'resource': {
      const pages = resourcePageCount(lesson);
      return pages > 0 ? `Resource · ${pages} page${pages === 1 ? '' : 's'}` : 'Resource';
    }
    case 'practical':
      return 'Practical';
    case 'certificate':
      return 'Certificate';
    case 'pdf':
      return 'Document';
    case 'scenario':
      return 'Scenario';
    case 'text':
      return 'Reading';
    default:
      return '';
  }
}

export function MobileLectureList({
  courseId,
  modules,
  lessons,
  resources,
  activeLessonId,
  onSelect,
}: Props) {
  const sections = modules
    .map((mod) => ({ mod, modLessons: lessons.filter((l) => l.module_id === mod.id) }))
    .filter((s) => s.modLessons.length > 0);
  const unModuled = lessons.filter((l) => !l.module_id);

  // Continuous lesson numbering across the whole course.
  let counter = 0;
  const numberFor = new Map<string, number>();
  [...sections.flatMap((s) => s.modLessons), ...unModuled].forEach((l) => {
    counter += 1;
    numberFor.set(l.id, counter);
  });

  return (
    <div className="pb-4">
      {sections.map(({ mod, modLessons }) => (
        <Section
          key={mod.id}
          title={mod.title}
          lessons={modLessons}
          resources={resources}
          courseId={courseId}
          activeLessonId={activeLessonId}
          numberFor={numberFor}
          onSelect={onSelect}
          defaultOpen={modLessons.some((l) => l.id === activeLessonId)}
        />
      ))}
      {unModuled.length > 0 && (
        <Section
          title="Lessons"
          lessons={unModuled}
          resources={resources}
          courseId={courseId}
          activeLessonId={activeLessonId}
          numberFor={numberFor}
          onSelect={onSelect}
          defaultOpen
        />
      )}
    </div>
  );
}

function Section({
  title,
  lessons,
  resources,
  courseId,
  activeLessonId,
  numberFor,
  onSelect,
  defaultOpen,
}: {
  title: string;
  lessons: LearnLesson[];
  resources: LearnResource[];
  courseId: string;
  activeLessonId: string | undefined;
  numberFor: Map<string, number>;
  onSelect: (id: string) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const completed = lessons.filter((l) => l.completed).length;
  const duration = totalDuration(lessons);
  const progressLabel = duration
    ? `${completed}/${lessons.length} · ${duration}`
    : `${completed}/${lessons.length} complete`;

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-b">
      <CollapsibleTrigger className="flex w-full items-center justify-between gap-3 bg-muted/30 px-4 py-3.5 text-left transition-colors hover:bg-muted/50">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">{title}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">{progressLabel}</p>
        </div>
        <ChevronDown
          className={cn(
            'h-4 w-4 flex-shrink-0 text-muted-foreground transition-transform',
            open && 'rotate-180'
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent>
        {lessons.map((lesson) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            number={numberFor.get(lesson.id) ?? 0}
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
  number,
  active,
  resources,
  courseId,
  onSelect,
}: {
  lesson: LearnLesson;
  number: number;
  active: boolean;
  resources: LearnResource[];
  courseId: string;
  onSelect: () => void;
}) {
  const { download, downloadingId } = useResourceDownload(courseId);
  const locked = (lesson as { locked?: boolean }).locked === true;
  const label = mobileLessonLabel(lesson);

  return (
    <div
      className={cn(
        'flex items-start gap-3 border-l-2 px-4 py-3.5 transition-colors',
        active ? 'border-primary bg-primary/10' : 'border-transparent'
      )}
    >
      <button
        onClick={onSelect}
        disabled={locked}
        className="flex min-h-[44px] flex-1 items-start gap-3 text-left disabled:cursor-not-allowed"
      >
        {/* Status: check when completed, lock when locked, else number */}
        <span className="mt-0.5 flex h-6 w-6 flex-shrink-0 items-center justify-center">
          {locked ? (
            <Lock className="h-4 w-4 text-muted-foreground/60" />
          ) : lesson.completed ? (
            <CheckCircle2 className="h-5 w-5 text-status-success-foreground" />
          ) : (
            <span
              className={cn(
                'flex h-6 w-6 items-center justify-center rounded-full border text-xs font-medium',
                active ? 'border-primary text-primary' : 'border-muted-foreground/30 text-muted-foreground'
              )}
            >
              {number}
            </span>
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span
            className={cn(
              'block text-sm leading-snug',
              active ? 'font-semibold text-primary' : 'font-medium text-foreground'
            )}
          >
            {lesson.title}
          </span>
          {label && (
            <span className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground">
              {lessonTypeIcon(lesson.lesson_type)}
              <span>{label}</span>
            </span>
          )}
        </span>
      </button>
      {resources.length > 0 && (
        <Popover>
          <PopoverTrigger asChild>
            <button
              className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
              aria-label="Downloadable resources"
            >
              <Download className="h-4 w-4" />
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-64 p-2">
            <p className="px-2 py-1 text-xs font-semibold text-muted-foreground">Lesson resources</p>
            {resources.map((r) => (
              <button
                key={r.id}
                onClick={() => download(r.id, r.title)}
                disabled={downloadingId === r.id}
                className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-muted"
              >
                {downloadingId === r.id ? (
                  <Loader2 className="h-3.5 w-3.5 flex-shrink-0 animate-spin" />
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
