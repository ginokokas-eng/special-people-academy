import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { ResumeCard } from '@/components/native/ResumeCard';
import { ApertureIcon } from '@/components/ds/ApertureIcon';
import { Button } from '@/components/ui/button';
import { Loader2 } from '@/components/icons';
import { FigureMark, hueFor } from '@/components/ds/FigureMark';
import {
  entries as offlineEntries,
  formatBytes,
  offlineSupported,
  storageUsed,
  subscribeOffline,
} from '@/lib/offline';

/**
 * Learn — the native tab. Opens on the exact next required lesson so a carer
 * can finish training in the gap between two tasks.
 *
 * Deliberately NOT the web page: no four-stat grid and no In progress /
 * Not started / Completed switcher. Completed work lives under Certificates;
 * the full list stays on the Catalogue tab.
 */

interface NextLesson {
  courseId: string;
  courseTitle: string;
  lessonId: string;
  lessonTitle: string;
  moduleLabel: string;
  minutesLeft: number;
  percent: number;
}

interface DueItem {
  id: string;
  title: string;
  subLine: string;
  daysLeft: number;
  kind: 'renewal' | 'practical';
  booked?: boolean;
}

const kickerFor = (date: Date) => {
  const day = date.toLocaleDateString('en-GB', { weekday: 'long' });
  const hour = date.getHours();
  const shift = hour < 12 ? 'Early shift' : hour < 17 ? 'Day shift' : 'Late shift';
  return `${day} · ${shift}`;
};

export function NativeLearn() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [next, setNext] = useState<NextLesson | null>(null);
  const [due, setDue] = useState<DueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cached, setCached] = useState(() => offlineEntries());
  const [courseNames, setCourseNames] = useState<Record<string, string>>({});

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);

    const { data: enrolments } = await supabase
      .from('enrollments')
      .select('course:courses(id, title, duration_minutes)')
      .eq('user_id', user.id);

    type CourseRow = { id: string; title: string; duration_minutes: number | null };
    const courses = (enrolments ?? [])
      .map((e) => e.course as CourseRow | null)
      .filter((c): c is CourseRow => !!c);

    if (courses.length === 0) {
      setNext(null);
      setDue([]);
      setLoading(false);
      return;
    }

    const courseIds = courses.map((c) => c.id);

    // Required lessons only — the same rule as the certificate gate.
    const { data: lessons } = await supabase
      .from('lessons')
      .select('id, course_id, title, order_index, duration_minutes')
      .in('course_id', courseIds)
      .eq('is_required', true)
      .order('order_index', { ascending: true });

    const lessonIds = (lessons ?? []).map((l) => l.id);
    const { data: progress } = lessonIds.length
      ? await supabase
          .from('lesson_progress')
          .select('lesson_id, completed, completed_at')
          .eq('user_id', user.id)
          .in('lesson_id', lessonIds)
      : { data: [] as { lesson_id: string; completed: boolean; completed_at: string | null }[] };

    const doneIds = new Set((progress ?? []).filter((p) => p.completed).map((p) => p.lesson_id));

    // Most recently touched course wins; otherwise the first with work left.
    const lastTouchedCourse = (() => {
      let best: { courseId: string; at: number } | null = null;
      const lessonToCourse = new Map((lessons ?? []).map((l) => [l.id, l.course_id]));
      for (const p of progress ?? []) {
        const cid = lessonToCourse.get(p.lesson_id);
        const at = p.completed_at ? new Date(p.completed_at).getTime() : 0;
        if (cid && (!best || at > best.at)) best = { courseId: cid, at };
      }
      return best?.courseId ?? null;
    })();

    const ordered = [...courses].sort((a, b) => {
      if (a.id === lastTouchedCourse) return -1;
      if (b.id === lastTouchedCourse) return 1;
      return 0;
    });

    let picked: NextLesson | null = null;
    for (const course of ordered) {
      const courseLessons = (lessons ?? []).filter((l) => l.course_id === course.id);
      if (!courseLessons.length) continue;
      const doneCount = courseLessons.filter((l) => doneIds.has(l.id)).length;
      if (doneCount >= courseLessons.length) continue;
      const idx = courseLessons.findIndex((l) => !doneIds.has(l.id));
      const lesson = courseLessons[idx];
      const remaining = courseLessons.slice(idx).reduce((a, l) => a + (l.duration_minutes ?? 0), 0);
      picked = {
        courseId: course.id,
        courseTitle: course.title,
        lessonId: lesson.id,
        lessonTitle: lesson.title,
        moduleLabel: `Lesson ${idx + 1} of ${courseLessons.length}`,
        minutesLeft: remaining || lesson.duration_minutes || 0,
        percent: Math.round((doneCount / courseLessons.length) * 100),
      };
      break;
    }
    setNext(picked);

    // "Due this month" is driven by certificate expiry. Until certificates are
    // issued there is no real date to show, and a compliance surface must not
    // invent one — the section simply does not render.
    const { data: certs } = await supabase
      .from('certificates')
      .select('id, expires_at, course:courses(title)')
      .eq('user_id', user.id)
      .not('expires_at', 'is', null)
      .order('expires_at', { ascending: true })
      .limit(3);

    const now = Date.now();
    setDue(
      (certs ?? [])
        .map((c) => {
          const course = c.course as { title?: string } | null;
          const days = Math.ceil((new Date(c.expires_at as string).getTime() - now) / 86_400_000);
          return {
            id: c.id as string,
            title: course?.title ?? 'Course',
            subLine: 'Renewal due',
            daysLeft: days,
            kind: 'renewal' as const,
          };
        })
        .filter((d) => d.daysLeft <= 31),
    );

    setLoading(false);
  }, [user]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => subscribeOffline(() => setCached(offlineEntries())), []);

  // Names for whatever is cached, so the tiles read as courses not ids.
  useEffect(() => {
    const ids = [...new Set(cached.map((c) => c.courseId))];
    if (!ids.length) return;
    void (async () => {
      const { data } = await supabase.from('courses').select('id, title').in('id', ids);
      setCourseNames(Object.fromEntries((data ?? []).map((c) => [c.id as string, c.title as string])));
    })();
  }, [cached]);

  const kicker = useMemo(() => kickerFor(new Date()), []);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-7 w-7 animate-spin text-primary" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="space-y-7 pb-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.1em] text-[hsl(var(--learner-kicker))]">
        {kicker}
      </p>

      {next ? (
        <ResumeCard
          courseTitle={next.courseTitle}
          lessonTitle={next.lessonTitle}
          minutesLeft={next.minutesLeft}
          moduleLabel={next.moduleLabel}
          percent={next.percent}
          onResume={() => navigate(`/courses/${next.courseId}/learn?lesson=${next.lessonId}`)}
        />
      ) : (
        <article className="learner-card p-6 text-center">
          <p className="font-display text-[19px] text-foreground">Nothing outstanding</p>
          <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
            Every required lesson on your courses is done. New training appears here as soon as it
            is assigned.
          </p>
          <Button className="pressable mt-4 h-11 rounded-full font-semibold" onClick={() => navigate('/courses')}>
            Browse the catalogue
          </Button>
        </article>
      )}

      {due.length > 0 && (
        <section>
          <h2 className="mb-3 font-display text-[17px] tracking-tight text-foreground">Due this month</h2>
          <div className="space-y-2.5">
            {due.map((item) => (
              <article key={item.id} className="learner-card flex items-center gap-3 p-3.5">
                <span
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[var(--sp-warning-tint)] text-[var(--sp-warning-ink)]"
                  aria-hidden="true"
                >
                  <ApertureIcon name={item.kind === 'practical' ? 'urgent-help' : 'schedule'} size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">{item.subLine}</p>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                    item.booked
                      ? 'bg-[hsl(var(--violet-soft))] text-[hsl(var(--violet-soft-foreground))]'
                      : 'bg-[var(--sp-warning-tint)] text-[var(--sp-warning-ink)]'
                  }`}
                >
                  {item.booked ? 'Booked' : `${item.daysLeft}d`}
                </span>
              </article>
            ))}
          </div>
        </section>
      )}

      {offlineSupported() && cached.length > 0 && (
        <section>
          <div className="mb-3 flex items-baseline justify-between gap-3">
            <h2 className="font-display text-[17px] tracking-tight text-foreground">Ready offline</h2>
            <span className="text-xs text-muted-foreground tabular-nums">{formatBytes(storageUsed())}</span>
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            {Object.entries(
              cached.reduce<Record<string, number>>((acc, e) => {
                acc[e.courseId] = (acc[e.courseId] ?? 0) + 1;
                return acc;
              }, {}),
            ).map(([courseId, count], i) => (
              <article key={courseId} className="learner-card flex flex-col gap-2 p-3.5">
                <FigureMark hue={hueFor(i)} size={26} />
                <p className="line-clamp-2 text-[14px] font-semibold leading-snug text-foreground">
                  {courseNames[courseId] ?? 'Course'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {count} {count === 1 ? 'lesson' : 'lessons'} ready
                </p>
              </article>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
