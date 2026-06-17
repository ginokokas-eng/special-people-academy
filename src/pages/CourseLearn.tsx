import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ScormApiAdapter } from '@/lib/scorm-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  CheckCircle2,
  Circle,
  Play,
  FileText,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
} from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number | null;
  order_index: number;
  lesson_type: string;
  module_id: string | null;
  scorm_package_id: string | null;
  completed?: boolean;
}

interface Module {
  id: string;
  title: string;
  order_index: number;
}

export default function CourseLearn() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [courseId, setCourseId] = useState<string | null>(null);
  const [courseTitle, setCourseTitle] = useState('');
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [scormHtml, setScormHtml] = useState('');
  const [scormLoading, setScormLoading] = useState(false);
  const apiRef = useRef<ScormApiAdapter | null>(null);

  const isUUID = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const activeLessonId = searchParams.get('lesson');
  const activeLesson = useMemo(
    () => lessons.find((l) => l.id === activeLessonId) || lessons[0],
    [lessons, activeLessonId]
  );

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
      return;
    }
    if (user && id) fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, authLoading, id]);

  const fetchData = async () => {
    if (!id) return;
    try {
      const lookupField = isUUID(id) ? 'id' : 'slug';
      const { data: course, error: courseError } = await supabase
        .from('courses')
        .select('id, title')
        .eq(lookupField, id)
        .single();
      if (courseError || !course) throw courseError || new Error('Course not found');

      setCourseId(course.id);
      setCourseTitle(course.title);

      // Verify enrollment
      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user!.id)
        .eq('course_id', course.id)
        .maybeSingle();

      if (!enrollment) {
        toast.error('Please enrol in this course first');
        navigate(`/courses/${course.id}`);
        return;
      }

      const [{ data: modulesData }, { data: lessonsData }, { data: progressData }] =
        await Promise.all([
          supabase.from('modules').select('id, title, order_index').eq('course_id', course.id).order('order_index'),
          supabase.from('lessons').select('*').eq('course_id', course.id).order('order_index'),
          supabase.from('lesson_progress').select('lesson_id, completed').eq('user_id', user!.id),
        ]);

      const progressMap = new Map(progressData?.map((p) => [p.lesson_id, p.completed]) || []);
      const withProgress = (lessonsData || []).map((l) => ({
        ...l,
        completed: progressMap.get(l.id) || false,
      }));

      setModules(modulesData || []);
      setLessons(withProgress);

      if (!searchParams.get('lesson') && withProgress.length > 0) {
        setSearchParams({ lesson: withProgress[0].id }, { replace: true });
      }
    } catch (err) {
      console.error('Error loading course:', err);
      toast.error('Failed to load course');
      navigate('/my-learning');
    } finally {
      setLoading(false);
    }
  };

  const markComplete = useCallback(
    async (lessonId: string) => {
      if (!user) return;
      const { error } = await supabase.from('lesson_progress').upsert(
        {
          user_id: user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        },
        { onConflict: 'lesson_id,user_id' }
      );
      if (error) {
        console.error('Error marking complete:', error);
        toast.error('Could not save progress');
        return;
      }
      setLessons((prev) =>
        prev.map((l) => (l.id === lessonId ? { ...l, completed: true } : l))
      );
      if (courseId) {
        supabase.functions
          .invoke('check-course-completion', { body: { course_id: courseId } })
          .catch((e) => console.error('completion check error', e));
      }
    },
    [user, courseId]
  );

  // Load SCORM content when active lesson is a SCORM lesson
  useEffect(() => {
    let cancelled = false;
    const cleanup = () => {
      if (apiRef.current) {
        apiRef.current.forceCommit().catch(() => {});
        apiRef.current.uninstall();
        apiRef.current = null;
      }
    };

    const loadScorm = async () => {
      cleanup();
      setScormHtml('');
      if (!activeLesson || activeLesson.lesson_type !== 'scorm' || !user || !courseId) return;
      if (!activeLesson.scorm_package_id) return;

      setScormLoading(true);
      try {
        // Find or create registration
        let regId: string | null = null;
        const { data: existing } = await supabase
          .from('scorm_registrations')
          .select('*')
          .eq('user_id', user.id)
          .eq('lesson_id', activeLesson.id)
          .maybeSingle();

        let reg = existing;
        if (!reg) {
          const { data: newReg, error: regError } = await supabase
            .from('scorm_registrations')
            .insert({
              scorm_package_id: activeLesson.scorm_package_id,
              user_id: user.id,
              course_id: courseId,
              lesson_id: activeLesson.id,
              status: 'not_attempted',
            })
            .select('*')
            .single();
          if (regError) throw regError;
          reg = newReg;
        }
        regId = reg!.id;

        const { data: pkg, error: pkgError } = await supabase
          .from('scorm_packages')
          .select('*')
          .eq('id', activeLesson.scorm_package_id)
          .single();
        if (pkgError || !pkg) throw pkgError || new Error('Package not found');

        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData?.session?.access_token;
        if (!accessToken) {
          toast.error('Session expired. Please sign in again.');
          navigate('/auth');
          return;
        }

        const launchUrl = `${SUPABASE_URL}/functions/v1/serve-scorm/${pkg.id}/${pkg.launch_path}?token=${encodeURIComponent(
          accessToken
        )}`;

        const adapter = new ScormApiAdapter({
          registrationId: regId,
          onComplete: () => {
            markComplete(activeLesson.id);
            toast.success('Module completed!');
          },
        });
        await adapter.loadSavedData(reg!);
        adapter.install();
        apiRef.current = adapter;

        if (reg!.status === 'not_attempted') {
          await supabase
            .from('scorm_registrations')
            .update({ status: 'in_progress' })
            .eq('id', regId);
        }

        const resp = await fetch(launchUrl);
        if (!resp.ok) throw new Error('Failed to fetch SCORM content');
        const html = await resp.text();
        if (!cancelled) setScormHtml(html);
      } catch (err) {
        console.error('SCORM load error:', err);
        toast.error('Failed to load module');
      } finally {
        if (!cancelled) setScormLoading(false);
      }
    };

    loadScorm();
    return () => {
      cancelled = true;
      cleanup();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeLesson?.id]);

  const goToLesson = (lessonId: string) => {
    setSearchParams({ lesson: lessonId });
  };

  const currentIndex = lessons.findIndex((l) => l.id === activeLesson?.id);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const lessonIcon = (type: string) => {
    if (type === 'scorm' || type === 'video') return <Play className="h-3.5 w-3.5" />;
    if (type === 'quiz') return <HelpCircle className="h-3.5 w-3.5" />;
    return <FileText className="h-3.5 w-3.5" />;
  };

  const lessonsByModule = (moduleId: string) =>
    lessons.filter((l) => l.module_id === moduleId);
  const unModuled = lessons.filter((l) => !l.module_id);

  if (authLoading || loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderLessonBody = () => {
    if (!activeLesson) {
      return (
        <div className="text-center text-muted-foreground py-20">
          No lessons available in this course yet.
        </div>
      );
    }

    if (activeLesson.lesson_type === 'scorm') {
      return (
        <div className="space-y-4">
          <div className="aspect-video w-full rounded-lg overflow-hidden border bg-black">
            {scormLoading ? (
              <div className="h-full flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-foreground/70" />
              </div>
            ) : scormHtml ? (
              <iframe
                srcDoc={scormHtml}
                className="w-full h-full border-0"
                title={activeLesson.title}
                allow="autoplay; fullscreen"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation"
              />
            ) : (
              <div className="h-full flex items-center justify-center text-primary-foreground/70 text-sm">
                Unable to load this module.
              </div>
            )}
          </div>
          {activeLesson.description && (
            <p className="text-muted-foreground">{activeLesson.description}</p>
          )}
        </div>
      );
    }

    if (activeLesson.lesson_type === 'quiz') {
      return (
        <div className="space-y-4">
          {activeLesson.description && (
            <p className="text-muted-foreground">{activeLesson.description}</p>
          )}
          <Button
            size="lg"
            onClick={() =>
              navigate(`/courses/${courseId}/quiz?lesson=${activeLesson.id}`)
            }
          >
            <HelpCircle className="h-4 w-4 mr-2" />
            Start Assessment
          </Button>
        </div>
      );
    }

    // video or text
    return (
      <div className="space-y-4">
        {activeLesson.video_url && (
          <div className="aspect-video w-full rounded-lg overflow-hidden border bg-black">
            <video src={activeLesson.video_url} controls className="w-full h-full" />
          </div>
        )}
        {activeLesson.description && (
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-line leading-relaxed">
            {activeLesson.description}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/courses/${courseId || id}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Course</span>
          </Button>
          <h1 className="text-sm font-semibold truncate">{courseTitle}</h1>
        </div>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Sidebar */}
        <aside className="hidden md:flex flex-col w-80 border-r bg-card">
          <div className="px-4 py-3 border-b">
            <p className="text-xs font-medium text-muted-foreground">
              Course content · {lessons.length} lessons
            </p>
          </div>
          <ScrollArea className="flex-1">
            <div className="py-2">
              {modules.map((mod) => {
                const modLessons = lessonsByModule(mod.id);
                if (modLessons.length === 0) return null;
                return (
                  <div key={mod.id} className="mb-2">
                    <p className="px-4 py-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      {mod.title}
                    </p>
                    {modLessons.map((l) => (
                      <LessonRow
                        key={l.id}
                        lesson={l}
                        active={l.id === activeLesson?.id}
                        onClick={() => goToLesson(l.id)}
                        icon={lessonIcon(l.lesson_type)}
                      />
                    ))}
                  </div>
                );
              })}
              {unModuled.length > 0 && (
                <div className="mb-2">
                  {unModuled.map((l) => (
                    <LessonRow
                      key={l.id}
                      lesson={l}
                      active={l.id === activeLesson?.id}
                      onClick={() => goToLesson(l.id)}
                      icon={lessonIcon(l.lesson_type)}
                    />
                  ))}
                </div>
              )}
            </div>
          </ScrollArea>
        </aside>

        {/* Main */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 lg:px-8">
            {activeLesson && (
              <div className="mb-5">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant="outline" className="capitalize">
                    {activeLesson.lesson_type === 'scorm' ? 'Video' : activeLesson.lesson_type}
                  </Badge>
                  {activeLesson.completed && (
                    <Badge className="bg-status-success-bg text-status-success-foreground">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl font-bold">{activeLesson.title}</h2>
              </div>
            )}

            {renderLessonBody()}

            {/* Footer actions */}
            {activeLesson && (
              <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-6 border-t">
                <Button
                  variant="outline"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && goToLesson(prevLesson.id)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>

                <div className="flex items-center gap-2">
                  {activeLesson.lesson_type !== 'quiz' && !activeLesson.completed && (
                    <Button variant="secondary" onClick={() => markComplete(activeLesson.id)}>
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Mark complete
                    </Button>
                  )}
                  <Button
                    disabled={!nextLesson}
                    onClick={() => nextLesson && goToLesson(nextLesson.id)}
                  >
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

function LessonRow({
  lesson,
  active,
  onClick,
  icon,
}: {
  lesson: Lesson;
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-start gap-2.5 px-4 py-2 text-left text-sm transition-colors ${
        active ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
      }`}
    >
      <span className="mt-0.5 flex-shrink-0">
        {lesson.completed ? (
          <CheckCircle2 className="h-4 w-4 text-status-success-foreground" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground/50" />
        )}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block leading-snug">{lesson.title}</span>
        <span className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
          {icon}
          {lesson.duration_minutes ? `${lesson.duration_minutes} min` : ''}
        </span>
      </span>
    </button>
  );
}
