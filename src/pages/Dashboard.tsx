import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { StatCard } from '@/components/ds/StatCard';
import { ComplianceRing } from '@/components/ds/ComplianceRing';
import { CertificateRing } from '@/components/ds/CertificateRing';
import { LessonRow } from '@/components/ds/LessonRow';
import { hueFor } from '@/components/ds/FigureMark';
import { ArrowRight, BookOpen, Loader2 } from '@/components/icons';

interface DashboardStats {
  enrolledCourses: number;
  completedCourses: number;
  certificates: number;
  totalLearningMinutes: number;
}

interface EnrolledCourse {
  id: string;
  title: string;
  category: string;
  thumbnail_url: string | null;
  progress: number;
  duration_minutes: number;
  is_mandatory: boolean;
  cpd_hours: number;
  requiredTotal: number;
  requiredDone: number;
  completed: boolean;
  lastActivity: number;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    enrolledCourses: 0,
    completedCourses: 0,
    certificates: 0,
    totalLearningMinutes: 0,
  });
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          id,
          completed_at,
          course:courses(id, title, category, thumbnail_url, duration_minutes, is_mandatory, cpd_hours)
        `)
        .eq('user_id', user.id);

      // Fetch certificates
      const { data: certificates } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', user.id);

      // Calculate stats
      const completedCount = enrollments?.filter(e => e.completed_at).length || 0;
      const totalMinutes = enrollments?.reduce((acc, e) => {
        const course = e.course as { duration_minutes?: number } | null;
        return acc + (course?.duration_minutes || 0);
      }, 0) || 0;

      setStats({
        enrolledCourses: enrollments?.length || 0,
        completedCourses: completedCount,
        certificates: certificates?.length || 0,
        totalLearningMinutes: totalMinutes,
      });

      // Build the list of enrolled courses once.
      type CourseRow = {
        id: string;
        title: string;
        category: string;
        thumbnail_url: string | null;
        duration_minutes: number;
        is_mandatory: boolean | null;
        cpd_hours: number | null;
      };
      const enrolmentRows = (enrollments || [])
        .map(e => ({ completedAt: e.completed_at as string | null, course: e.course as CourseRow | null }))
        .filter((row): row is { completedAt: string | null; course: CourseRow } => !!row.course);

      const courseIds = enrolmentRows.map(r => r.course.id);

      // Fetch ALL lessons for ALL enrolled courses in a single query (no N+1).
      const { data: allLessons } = courseIds.length
        ? await supabase
            .from('lessons')
            .select('id, course_id')
            .in('course_id', courseIds)
            // Progress counts required lessons only — same rule as the
            // certificate gate (see src/lib/progress.ts).
            .eq('is_required', true)
        : { data: [] as { id: string; course_id: string }[] };

      const lessonIds = (allLessons || []).map(l => l.id);

      // Fetch ALL completed lesson progress for this user in a single query.
      // completed_at doubles as the "most recent activity" signal that picks
      // which course the hero band offers to resume.
      const { data: completed } = lessonIds.length
        ? await supabase
            .from('lesson_progress')
            .select('lesson_id, completed_at')
            .eq('user_id', user.id)
            .in('lesson_id', lessonIds)
            .eq('completed', true)
        : { data: [] as { lesson_id: string; completed_at: string | null }[] };

      // Index counts by course for O(1) lookups.
      const lessonsByCourse = new Map<string, number>();
      const lessonToCourse = new Map<string, string>();
      for (const l of allLessons || []) {
        lessonsByCourse.set(l.course_id, (lessonsByCourse.get(l.course_id) || 0) + 1);
        lessonToCourse.set(l.id, l.course_id);
      }
      const completedByCourse = new Map<string, number>();
      const lastActivityByCourse = new Map<string, number>();
      for (const c of completed || []) {
        const cid = lessonToCourse.get(c.lesson_id);
        if (!cid) continue;
        completedByCourse.set(cid, (completedByCourse.get(cid) || 0) + 1);
        const at = c.completed_at ? new Date(c.completed_at).getTime() : 0;
        lastActivityByCourse.set(cid, Math.max(lastActivityByCourse.get(cid) || 0, at));
      }

      const coursesWithProgress: EnrolledCourse[] = enrolmentRows.map(({ completedAt, course }) => {
        const total = lessonsByCourse.get(course.id) || 0;
        const done = completedByCourse.get(course.id) || 0;
        const progress = total ? Math.round((done / total) * 100) : 0;
        return {
          id: course.id,
          title: course.title,
          category: course.category,
          thumbnail_url: course.thumbnail_url,
          progress,
          duration_minutes: course.duration_minutes,
          is_mandatory: !!course.is_mandatory,
          cpd_hours: Number(course.cpd_hours ?? 0),
          requiredTotal: total,
          requiredDone: done,
          completed: !!completedAt || (total > 0 && done >= total),
          lastActivity: lastActivityByCourse.get(course.id) || 0,
        };
      });

      setEnrolledCourses(coursesWithProgress);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Everything the hero band shows is derived from the queries above — no new
   * data and no invented numbers. Compliance counts required lessons across
   * MANDATORY enrolments only, the same rule as the certificate gate.
   */
  const overview = useMemo(() => {
    const mandatory = enrolledCourses.filter(c => c.is_mandatory);
    const requiredTotal = mandatory.reduce((a, c) => a + c.requiredTotal, 0);
    const requiredDone = mandatory.reduce((a, c) => a + c.requiredDone, 0);
    const compliancePct = requiredTotal ? Math.round((requiredDone / requiredTotal) * 100) : 0;

    const inProgress = [...enrolledCourses]
      .filter(c => !c.completed)
      .sort((a, b) => b.lastActivity - a.lastActivity || b.progress - a.progress);

    return {
      mandatory,
      compliancePct,
      hasMandatory: mandatory.length > 0,
      mandatoryDone: mandatory.filter(c => c.completed).length,
      outstanding: mandatory.filter(c => !c.completed).length,
      // CPD is only banked once a course is finished.
      cpdLogged: enrolledCourses.filter(c => c.completed).reduce((a, c) => a + c.cpd_hours, 0),
      resume: inProgress[0] ?? null,
      rest: inProgress.slice(1, 5),
    };
  }, [enrolledCourses]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    { label: 'Enrolled Courses', value: stats.enrolledCourses.toString(), icon: 'documents', tone: 'violet' as const },
    { label: 'Completed', value: stats.completedCourses.toString(), icon: 'ok', tone: 'green' as const },
    { label: 'Certificates', value: stats.certificates.toString(), icon: 'milestone', tone: 'teal' as const },
    { label: 'Learning Time', value: `${Math.floor(stats.totalLearningMinutes / 60)}h`, icon: 'schedule', tone: 'amber' as const },
  ];

  const { resume } = overview;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div className="page-heading">
          <h1 className="text-3xl font-bold text-foreground">My Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your learning progress</p>
        </div>

        {/* Hero band — compliance at a glance, and the shortest path to clearing it. */}
        {enrolledCourses.length > 0 && (
          <section className="learner-card sp-hero-band relative overflow-hidden rounded-[22px] px-6 py-8 sm:px-10 sm:pb-[34px] sm:pt-[38px]">
            <div className="relative flex flex-wrap items-center justify-between gap-8">
              <div className="max-w-[560px] min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[hsl(var(--learner-kicker))]">
                  Your training
                </p>
                <h2 className="font-display mt-2 text-[32px] leading-[1.06] tracking-[-0.02em] text-foreground sm:text-[44px]">
                  {overview.outstanding > 0
                    ? `${overview.outstanding} mandatory ${overview.outstanding === 1 ? 'course' : 'courses'} to finish.`
                    : overview.hasMandatory
                      ? 'Your mandatory training is complete.'
                      : 'Pick up where you left off.'}
                </h2>
                <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
                  {overview.hasMandatory
                    ? `You are ${overview.compliancePct}% through your mandatory set.`
                    : 'None of your enrolments are marked mandatory.'}
                  {resume ? ` ${resume.title} is the one in progress.` : ''}
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  {resume && (
                    <Button
                      className="pressable rounded-[10px] font-semibold"
                      onClick={() => navigate(`/courses/${resume.id}/learn`)}
                    >
                      Resume {resume.title.length > 34 ? `${resume.title.slice(0, 34)}…` : resume.title}
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="pressable rounded-[10px] font-semibold"
                    onClick={() => navigate('/my-learning')}
                  >
                    See my plan
                  </Button>
                </div>
              </div>

              {overview.hasMandatory && (
                <div className="flex items-center gap-6">
                  <ComplianceRing value={overview.compliancePct} />
                  <dl className="space-y-3.5">
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Outstanding
                      </dt>
                      <dd className="font-display text-[22px] leading-none tabular-nums text-[hsl(var(--warning-ink))]">
                        {overview.outstanding}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        Completed
                      </dt>
                      <dd className="font-display text-[22px] leading-none tabular-nums text-[hsl(var(--success-ink))]">
                        {overview.mandatoryDone}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                        CPD logged
                      </dt>
                      <dd className="font-display text-[22px] leading-none tabular-nums text-foreground">
                        {overview.cpdLogged.toFixed(overview.cpdLogged % 1 ? 1 : 0)}h
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Stats Grid — reflows by width rather than at a fixed breakpoint. */}
        <div className="grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4">
          {statCards.map((stat) => (
            <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} tone={stat.tone} />
          ))}
        </div>

        {/* Continue Learning */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Continue Learning</h2>
            <Button variant="outline" size="sm" onClick={() => navigate('/courses')}>
              View All Courses
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {enrolledCourses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No courses yet</h3>
                <p className="text-muted-foreground mb-4">Start your learning journey by enrolling in a course</p>
                <Button onClick={() => navigate('/courses')}>
                  Browse Courses
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-[repeat(auto-fit,minmax(320px,1fr))] gap-[18px]">
              {resume && (
                <article className="learner-card learner-accent flex flex-col justify-center p-6">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[hsl(var(--learner-kicker))]">
                    {resume.category}
                  </p>
                  <h3 className="font-display mt-1.5 text-[26px] leading-tight tracking-tight text-foreground">
                    {resume.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {resume.requiredTotal > 0
                      ? `${resume.requiredDone} of ${resume.requiredTotal} required ${
                          resume.requiredTotal === 1 ? 'lesson' : 'lessons'
                        } done.`
                      : 'Ready when you are.'}
                    {resume.duration_minutes ? ` About ${resume.duration_minutes} minutes in total.` : ''}
                  </p>

                  <div className="mt-5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Progress</span>
                      <span className="font-medium tabular-nums">{resume.progress}%</span>
                    </div>
                    <Progress value={resume.progress} className="mt-2 h-2" />
                  </div>

                  <div className="flex flex-wrap items-center gap-3 pt-6">
                    <Button
                      className="pressable rounded-[10px] font-semibold"
                      onClick={() => navigate(`/courses/${resume.id}/learn`)}
                    >
                      Continue
                    </Button>
                    {resume.cpd_hours > 0 && (
                      <span className="inline-flex h-7 items-center rounded-full bg-[hsl(189_94%_94%)] px-3 text-xs font-semibold text-[hsl(189_94%_30%)]">
                        {resume.cpd_hours} CPD {resume.cpd_hours === 1 ? 'hour' : 'hours'}
                      </span>
                    )}
                  </div>
                </article>
              )}

              <div className="flex flex-col gap-3">
                {overview.rest.map((course, index) => (
                  <LessonRow
                    key={course.id}
                    category={course.category}
                    title={course.title}
                    progress={course.progress}
                    hue={hueFor(index)}
                    done={course.completed}
                    onClick={() => navigate(`/courses/${course.id}/learn`)}
                  />
                ))}
                {overview.rest.length === 0 && (
                  <div className="learner-card flex flex-1 items-center justify-center p-6 text-center text-sm text-muted-foreground">
                    Nothing else in progress right now.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Mandatory set — one figure from the brand mark per assigned course. */}
        {overview.hasMandatory && (
          <section className="learner-card p-6">
            <h2 className="font-display text-[18px] tracking-tight text-foreground">Your mandatory set</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              {overview.outstanding === 0
                ? `All ${overview.mandatory.length} lit. Every mandatory course is complete.`
                : `Each figure is one mandatory course. ${overview.outstanding} left to light.`}
            </p>
            <div className="mt-5">
              <CertificateRing lit={overview.mandatoryDone} total={Math.min(overview.mandatory.length, 6)} />
            </div>
          </section>
        )}
      </div>
    </DashboardLayout>
  );
}
