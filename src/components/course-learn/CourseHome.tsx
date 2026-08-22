import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, ArrowRight, CheckCircle2, Award, Play } from '@/components/icons';
import { requiredProgress } from '@/lib/progress';
import { cn } from '@/lib/utils';
import type { LearnLesson, LearnModule } from './types';

interface Props {
  courseTitle: string;
  courseSubtitle?: string | null;
  modules: LearnModule[];
  /** Learner-facing lessons only, already filtered and ordered. */
  lessons: LearnLesson[];
  hasCertificate?: boolean;
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
function ProgressRing({ percent }: { percent: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 44 44" className="h-11 w-11 shrink-0" aria-hidden="true">
      <circle cx="22" cy="22" r={r} fill="none" strokeWidth="4" className="stroke-muted" />
      <circle
        cx="22"
        cy="22"
        r={r}
        fill="none"
        strokeWidth="4"
        strokeLinecap="round"
        className="stroke-primary transition-[stroke-dashoffset] duration-500"
        strokeDasharray={c}
        strokeDashoffset={c - (c * Math.min(100, Math.max(0, percent))) / 100}
        transform="rotate(-90 22 22)"
      />
      <text
        x="22"
        y="26"
        textAnchor="middle"
        className="fill-foreground text-[0.6rem] font-semibold"
      >
        {percent}%
      </text>
    </svg>
  );
}

/**
 * Course home ("module hub"): shown when no `?lesson=` is present. Learners
 * choose where to start — no sequencing is enforced.
 */
export function CourseHome({
  courseTitle,
  courseSubtitle,
  modules,
  lessons,
  hasCertificate,
  onSelectLesson,
  onBackToCourse,
  onOpenCertificate,
}: Props) {
  const completedIds = new Set(lessons.filter((l) => l.completed).map((l) => l.id));

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
  const courseDone = overall.total > 0 && overall.completed === overall.total;

  const enterModule = (group: HubModule) => {
    const target = group.lessons.find((l) => !completedIds.has(l.id)) ?? group.lessons[0];
    if (target) onSelectLesson(target.id);
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 p-4 sm:p-6">
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={onBackToCourse} className="-ml-2">
          <ArrowLeft className="mr-1 h-4 w-4" /> Course page
        </Button>
        <h1 className="text-2xl font-bold text-foreground sm:text-3xl">{courseTitle}</h1>
        {courseSubtitle?.trim() && (
          <p className="text-sm text-muted-foreground">{courseSubtitle}</p>
        )}
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="secondary">
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
          Choose any module below — you can work through them in whatever order suits you.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        {grouped.map((group) => {
          const prog = requiredProgress(group.lessons, completedIds);
          const done = prog.total > 0 && prog.completed === prog.total;
          return (
            <Card
              key={group.id ?? 'essentials'}
              role="button"
              tabIndex={0}
              onClick={() => enterModule(group)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  enterModule(group);
                }
              }}
              className={cn(
                'cursor-pointer transition-shadow hover:shadow-md',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                done && 'border-success/40'
              )}
            >
              <CardContent className="flex items-start gap-4 p-5">
                <ProgressRing percent={prog.percent} />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <h2 className="text-base font-semibold text-foreground">{group.title}</h2>
                  <p className="text-xs text-muted-foreground">
                    {group.lessons.length} {group.lessons.length === 1 ? 'lesson' : 'lessons'}
                    {prog.total > 0 && ` · ${prog.completed}/${prog.total} required complete`}
                  </p>
                  <span className="inline-flex items-center gap-1 text-sm font-medium text-primary">
                    {done ? (
                      <>
                        <CheckCircle2 className="h-4 w-4 text-success" /> Revisit module
                      </>
                    ) : (
                      <>
                        {prog.completed > 0 ? 'Continue module' : 'Start module'}
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {!grouped.length && (
        <p className="text-sm text-muted-foreground">
          This course doesn’t have any lessons yet. Please check back soon.
        </p>
      )}
    </div>
  );
}
