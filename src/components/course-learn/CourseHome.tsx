import { useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, CheckCircle2, Award, Play } from '@/components/icons';
import { requiredProgress } from '@/lib/progress';
import { cn } from '@/lib/utils';
import { lessonTypeIcon, lessonMetaLabel } from './lessonMeta';
import type { LearnLesson, LearnModule } from './types';

interface Props {
  courseTitle: string;
  courseSubtitle?: string | null;
  modules: LearnModule[];
  /** Learner-facing lessons only, already filtered and ordered. */
  lessons: LearnLesson[];
  hasCertificate?: boolean;
  /** Lessons with a progress row that is not yet complete (resume targets). */
  startedLessonIds?: Set<string>;
  /** Lesson just completed — scrolled into view with a one-time highlight. */
  highlightLessonId?: string | null;
  onSelectLesson: (lessonId: string) => void;
  onBackToCourse: () => void;
  onOpenCertificate?: () => void;
}

interface HubModule {
  id: string | null;
  title: string;
  lessons: LearnLesson[];
}

/** Small SVG ring showing required-lesson progress for a module. */
function ProgressRing({ percent, done }: { percent: number; done?: boolean }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 36 36" className="h-9 w-9 shrink-0" aria-hidden="true">
      <circle cx="18" cy="18" r={r} fill="none" strokeWidth="3.5" className="stroke-muted" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        strokeWidth="3.5"
        strokeLinecap="round"
        className={cn(
          'transition-[stroke-dashoffset] duration-500',
          done ? 'stroke-success' : 'stroke-primary'
        )}
        strokeDasharray={c}
        strokeDashoffset={c - (c * Math.min(100, Math.max(0, percent))) / 100}
        transform="rotate(-90 18 18)"
      />
      <text
        x="18"
        y="21.5"
        textAnchor="middle"
        className="fill-foreground text-[0.55rem] font-semibold tabular-nums"
      >
        {percent}%
      </text>
    </svg>
  );
}

type LessonStatus = 'completed' | 'continue' | 'new';

/**
 * Course home ("menu page"): shown when no `?lesson=` is present. Modules are
 * section headings; every lesson is a card so learners can start one, finish
 * it, and come straight back here to pick the next.
 */
export function CourseHome({
  courseTitle,
  courseSubtitle,
  modules,
  lessons,
  hasCertificate,
  startedLessonIds,
  highlightLessonId,
  onSelectLesson,
  onBackToCourse,
  onOpenCertificate,
}: Props) {
  const completedIds = new Set(lessons.filter((l) => l.completed).map((l) => l.id));
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const grouped: HubModule[] = modules
    .map((m) => ({
      id: m.id,
      title: m.title,
      lessons: lessons.filter((l) => l.module_id === m.id),
    }))
    .filter((g) => g.lessons.length > 0);

  const orphans = lessons.filter((l) => !l.module_id || !modules.some((m) => m.id === l.module_id));
  if (orphans.length) grouped.push({ id: null, title: 'Course essentials', lessons: orphans });

  const overall = requiredProgress(lessons, completedIds);
  const firstIncomplete = lessons.find((l) => !completedIds.has(l.id)) ?? lessons[0];
  const upNextId = lessons.find((l) => !completedIds.has(l.id))?.id ?? null;
  const courseDone = overall.total > 0 && overall.completed === overall.total;

  // Bring the just-completed card into view once (no animation when the
  // learner has asked for reduced motion — the highlight state is enough).
  useEffect(() => {
    if (!highlightLessonId) return;
    const el = cardRefs.current[highlightLessonId];
    if (!el) return;
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' });
  }, [highlightLessonId]);

  const statusOf = (lesson: LearnLesson): LessonStatus => {
    if (completedIds.has(lesson.id)) return 'completed';
    if (startedLessonIds?.has(lesson.id)) return 'continue';
    return 'new';
  };

  return (
    <div className="learner-surface mx-auto w-full max-w-5xl space-y-8 p-4 sm:p-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={onBackToCourse} className="-ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Course page
        </Button>
        <h1 className="font-display text-2xl text-foreground sm:text-3xl">{courseTitle}</h1>
        {courseSubtitle?.trim() && (
          <p className="text-sm text-muted-foreground">{courseSubtitle}</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary" className="tabular-nums">
            {overall.completed}/{overall.total} required lessons complete
          </Badge>
          {firstIncomplete && (
            <Button onClick={() => onSelectLesson(firstIncomplete.id)}>
              <Play className="mr-1.5 h-4 w-4" />
              {overall.completed > 0 ? 'Continue learning' : 'Start learning'}
            </Button>
          )}
          {courseDone && hasCertificate && onOpenCertificate && (
            <Button variant="outline" onClick={onOpenCertificate}>
              <Award className="mr-1.5 h-4 w-4" /> Your certificate
            </Button>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Pick any lesson below. When you finish one you’ll come back here to choose the next.
        </p>
      </div>

      {grouped.map((group) => {
        const prog = requiredProgress(group.lessons, completedIds);
        const done = prog.total > 0 && prog.completed === prog.total;
        return (
          <section key={group.id ?? 'essentials'} className="space-y-3">
            <div className="flex items-center gap-3">
              <ProgressRing percent={prog.percent} done={done} />
              <div className="min-w-0">
                <h2 className="font-display text-lg text-foreground">{group.title}</h2>
                <p className="text-xs tabular-nums text-muted-foreground">
                  {prog.total > 0
                    ? `${prog.completed} of ${prog.total} complete`
                    : `${group.lessons.length} ${group.lessons.length === 1 ? 'lesson' : 'lessons'}`}
                </p>
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-2 min-[1100px]:grid-cols-3">
              {group.lessons.map((lesson) => {
                const status = statusOf(lesson);
                const highlighted = highlightLessonId === lesson.id;
                return (
                  <Card
                    key={lesson.id}
                    ref={(el) => {
                      cardRefs.current[lesson.id] = el;
                    }}
                    role="button"
                    tabIndex={0}
                    aria-label={`${lesson.title} — ${
                      status === 'completed'
                        ? 'completed'
                        : status === 'continue'
                          ? 'continue'
                          : 'not started'
                    }`}
                    onClick={() => onSelectLesson(lesson.id)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectLesson(lesson.id);
                      }
                    }}
                    className={cn(
                      'learner-card learner-card-hover group relative h-full cursor-pointer overflow-hidden',
                      'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                      status === 'completed' && 'ring-1 ring-success/40',
                      status === 'continue' && 'ring-1 ring-primary/40',
                      highlighted && 'ring-2 ring-primary ring-offset-2'
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'absolute inset-y-0 left-0 w-[3px]',
                        status === 'completed'
                          ? 'bg-success'
                          : status === 'continue'
                            ? 'bg-primary'
                            : 'bg-transparent'
                      )}
                    />
                    <CardContent className="flex h-full flex-col gap-3 p-4 pl-5">
                      <div className="flex items-start gap-3">
                        <span
                          className={cn(
                            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                            status === 'completed'
                              ? 'bg-success/10 text-success'
                              : 'bg-primary/10 text-primary'
                          )}
                        >
                          {lessonTypeIcon(lesson.lesson_type, 'h-4 w-4')}
                        </span>
                        <div className="min-w-0 flex-1 space-y-1">
                          <h3 className="font-display text-sm leading-snug text-foreground">
                            {lesson.title}
                          </h3>
                          <p className="text-xs tabular-nums text-muted-foreground">
                            {lessonMetaLabel(lesson)}
                          </p>
                        </div>
                        {upNextId === lesson.id && (
                          <Badge variant="secondary" className="shrink-0 text-[0.65rem]">
                            Up next
                          </Badge>
                        )}
                      </div>

                      <div className="mt-auto flex items-center justify-between gap-2">
                        {status === 'completed' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-success">
                            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Completed
                          </span>
                        ) : status === 'continue' ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                            Continue
                            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-muted-foreground">
                            Not started
                          </span>
                        )}
                        {status === 'completed' && (
                          <span className="text-xs text-muted-foreground">Review</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </section>
        );
      })}

      {!grouped.length && (
        <p className="text-sm text-muted-foreground">
          This course doesn’t have any lessons yet. Please check back soon.
        </p>
      )}
    </div>
  );
}
