import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ScormApiAdapter } from '@/lib/scorm-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet';
import {
  Loader2,
  CheckCircle2,
  HelpCircle,
  ChevronLeft,
  ChevronRight,
  ArrowLeft,
  ListChecks,
  MessageCircleQuestion,
  StickyNote,
  Paperclip,
  ClipboardCheck,
  Award,
  Sparkles,
  BookOpen,
} from 'lucide-react';
import { toast } from 'sonner';

import { CourseContentSidebar } from '@/components/course-learn/CourseContentSidebar';
import { OverviewTab } from '@/components/course-learn/OverviewTab';
import { QnaTab } from '@/components/course-learn/QnaTab';
import { NotesTab } from '@/components/course-learn/NotesTab';
import { ResourcesTab } from '@/components/course-learn/ResourcesTab';
import { PracticalTab } from '@/components/course-learn/PracticalTab';
import { CertificateTab } from '@/components/course-learn/CertificateTab';
import { AIAssistantTab } from '@/components/course-learn/AIAssistantTab';
import { lessonTypeLabel } from '@/components/course-learn/lessonMeta';
import type { LearnCourse, LearnLesson, LearnModule, LearnResource } from '@/components/course-learn/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const sb = supabase as any;

export default function CourseLearn() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [course, setCourse] = useState<LearnCourse | null>(null);
  const [modules, setModules] = useState<LearnModule[]>([]);
  const [lessons, setLessons] = useState<LearnLesson[]>([]);
  const [resources, setResources] = useState<LearnResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [scormHtml, setScormHtml] = useState('');
  const [scormLoading, setScormLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const apiRef = useRef<ScormApiAdapter | null>(null);

  const courseId = course?.id ?? null;

  const isUUID = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const activeLessonId = searchParams.get('lesson') ?? undefined;
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
      const { data: courseData, error: courseError } = await sb
        .from('courses')
        .select(
          'id, title, subtitle, description, overview, has_certificate, requires_practical_signoff, practical_details, certificate_details'
        )
        .eq(lookupField, id)
        .single();
      if (courseError || !courseData) throw courseError || new Error('Course not found');

      setCourse(courseData);

      const { data: enrollment } = await supabase
        .from('enrollments')
        .select('id')
        .eq('user_id', user!.id)
        .eq('course_id', courseData.id)
        .maybeSingle();

      if (!enrollment) {
        toast.error('Please enrol in this course first');
        navigate(`/courses/${courseData.id}`);
        return;
      }

      const [{ data: modulesData }, { data: lessonsData }, { data: progressData }, { data: resourcesData }] =
        await Promise.all([
          supabase.from('modules').select('id, title, order_index').eq('course_id', courseData.id).order('order_index'),
          supabase.from('lessons').select('*').eq('course_id', courseData.id).order('order_index'),
          supabase.from('lesson_progress').select('lesson_id, completed').eq('user_id', user!.id),
          sb
            .from('course_resources')
            .select('id, title, description, resource_type, url, order_index, lesson_id')
            .eq('course_id', courseData.id)
            .order('order_index'),
        ]);

      const progressMap = new Map(progressData?.map((p) => [p.lesson_id, p.completed]) || []);
      const withProgress: LearnLesson[] = (lessonsData || []).map((l: any) => ({
        ...l,
        completed: progressMap.get(l.id) || false,
      }));

      setModules(modulesData || []);
      setLessons(withProgress);
      setResources(resourcesData || []);

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
      setLessons((prev) => prev.map((l) => (l.id === lessonId ? { ...l, completed: true } : l)));
      if (courseId) {
        supabase.functions
          .invoke('check-course-completion', { body: { course_id: courseId } })
          .catch((e) => console.error('completion check error', e));
      }
    },
    [user, courseId]
  );

  // Load SCORM content when active lesson is a SCORM lesson (preserved logic)
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
          await supabase.from('scorm_registrations').update({ status: 'in_progress' }).eq('id', regId);
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
    setMobileNavOpen(false);
    setActiveTab('overview');
  };

  const currentIndex = lessons.findIndex((l) => l.id === activeLesson?.id);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  if (authLoading || loading || !course) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderLessonBody = () => {
    if (!activeLesson) {
      return (
        <div className="aspect-video w-full rounded-lg border bg-muted flex items-center justify-center text-muted-foreground">
          No lessons available in this course yet.
        </div>
      );
    }

    if (activeLesson.lesson_type === 'scorm') {
      return (
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
              allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-modals allow-downloads"
            />
          ) : (
            <div className="h-full flex items-center justify-center text-primary-foreground/70 text-sm">
              Unable to load this module.
            </div>
          )}
        </div>
      );
    }

    if (activeLesson.lesson_type === 'video') {
      return (
        <div className="aspect-video w-full rounded-lg overflow-hidden border bg-black">
          {activeLesson.video_url ? (
            <video src={activeLesson.video_url} controls className="w-full h-full" />
          ) : (
            <div className="h-full flex items-center justify-center text-primary-foreground/70 text-sm">
              No video available for this lesson.
            </div>
          )}
        </div>
      );
    }

    if (activeLesson.lesson_type === 'quiz') {
      return (
        <div className="rounded-lg border bg-card p-8 text-center">
          <HelpCircle className="h-10 w-10 mx-auto text-primary mb-3" />
          <h3 className="text-lg font-semibold mb-1">{activeLesson.title}</h3>
          {activeLesson.description && (
            <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
              {activeLesson.description}
            </p>
          )}
          <Button size="lg" onClick={() => navigate(`/courses/${courseId}/quiz?lesson=${activeLesson.id}`)}>
            <HelpCircle className="h-4 w-4 mr-2" />
            Start Assessment
          </Button>
        </div>
      );
    }

    if (activeLesson.lesson_type === 'practical') {
      return (
        <div className="rounded-lg border bg-card p-8 text-center">
          <ClipboardCheck className="h-10 w-10 mx-auto text-primary mb-3" />
          <h3 className="text-lg font-semibold mb-1">Practical session</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            This lesson is completed in person with a trainer. See the Practical sign-off tab below for
            your status and next steps.
          </p>
        </div>
      );
    }

    // text / scenario / pdf
    return (
      <div className="rounded-lg border bg-card p-6">
        {activeLesson.description ? (
          <div className="prose prose-sm max-w-none text-foreground whitespace-pre-line leading-relaxed">
            {activeLesson.description}
          </div>
        ) : (
          <p className="text-muted-foreground">No content for this lesson yet.</p>
        )}
      </div>
    );
  };

  const tabList = (
    <TabsList className="h-auto flex-wrap justify-start gap-1 bg-transparent p-0">
      <TabsTrigger value="overview" className="data-[state=active]:bg-secondary">
        <BookOpen className="h-4 w-4 mr-1.5" /> Overview
      </TabsTrigger>
      <TabsTrigger value="qa" className="data-[state=active]:bg-secondary">
        <MessageCircleQuestion className="h-4 w-4 mr-1.5" /> Q&amp;A
      </TabsTrigger>
      <TabsTrigger value="notes" className="data-[state=active]:bg-secondary">
        <StickyNote className="h-4 w-4 mr-1.5" /> Notes
      </TabsTrigger>
      <TabsTrigger value="resources" className="data-[state=active]:bg-secondary">
        <Paperclip className="h-4 w-4 mr-1.5" /> Resources
      </TabsTrigger>
      <TabsTrigger value="practical" className="data-[state=active]:bg-secondary">
        <ClipboardCheck className="h-4 w-4 mr-1.5" /> Practical
      </TabsTrigger>
      <TabsTrigger value="certificate" className="data-[state=active]:bg-secondary">
        <Award className="h-4 w-4 mr-1.5" /> Certificate
      </TabsTrigger>
      <TabsTrigger value="assistant" className="data-[state=active]:bg-secondary">
        <Sparkles className="h-4 w-4 mr-1.5" /> AI Assistant
      </TabsTrigger>
    </TabsList>
  );

  const sidebar = (
    <CourseContentSidebar
      courseId={course.id}
      modules={modules}
      lessons={lessons}
      resources={resources}
      activeLessonId={activeLesson?.id}
      onSelect={goToLesson}
    />
  );

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 px-4 py-2.5 border-b bg-card">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${courseId || id}`)}>
            <ArrowLeft className="h-4 w-4 mr-1" />
            <span className="hidden sm:inline">Course</span>
          </Button>
          <h1 className="text-sm font-semibold truncate text-foreground">{course.title}</h1>
        </div>
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="lg:hidden">
              <ListChecks className="h-4 w-4 mr-1.5" /> Content
            </Button>
          </SheetTrigger>
          <SheetContent side="right" className="w-[88vw] max-w-sm p-0">
            <SheetHeader className="sr-only">
              <SheetTitle>Course content</SheetTitle>
            </SheetHeader>
            {sidebar}
          </SheetContent>
        </Sheet>
      </header>

      <div className="flex-1 flex min-h-0">
        {/* Main */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="max-w-4xl mx-auto px-4 py-6 lg:px-8">
            {activeLesson && (
              <div className="mb-4">
                <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                  <Badge variant="outline">{lessonTypeLabel(activeLesson.lesson_type)}</Badge>
                  {activeLesson.completed && (
                    <Badge className="bg-status-success-bg text-status-success-foreground">
                      <CheckCircle2 className="h-3 w-3 mr-1" /> Completed
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-foreground">{activeLesson.title}</h2>
              </div>
            )}

            {renderLessonBody()}

            {/* Lesson navigation */}
            {activeLesson && (
              <div className="flex flex-wrap items-center justify-between gap-3 mt-5 pb-5 border-b">
                <Button
                  variant="outline"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && goToLesson(prevLesson.id)}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" /> Previous
                </Button>
                <div className="flex items-center gap-2">
                  {activeLesson.lesson_type !== 'quiz' &&
                    activeLesson.lesson_type !== 'scorm' &&
                    !activeLesson.completed && (
                      <Button variant="secondary" onClick={() => markComplete(activeLesson.id)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Mark complete
                      </Button>
                    )}
                  <Button disabled={!nextLesson} onClick={() => nextLesson && goToLesson(nextLesson.id)}>
                    Next <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* Workspace tabs */}
            <div className="mt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="overflow-x-auto -mx-1 px-1 pb-1">{tabList}</div>
                <div className="mt-5">
                  <TabsContent value="overview">
                    <OverviewTab course={course} activeLesson={activeLesson} />
                  </TabsContent>
                  <TabsContent value="qa">
                    <QnaTab courseId={course.id} activeLesson={activeLesson} />
                  </TabsContent>
                  <TabsContent value="notes">
                    <NotesTab courseId={course.id} activeLesson={activeLesson} lessons={lessons} />
                  </TabsContent>
                  <TabsContent value="resources">
                    <ResourcesTab courseId={course.id} resources={resources} lessons={lessons} />
                  </TabsContent>
                  <TabsContent value="practical">
                    <PracticalTab course={course} />
                  </TabsContent>
                  <TabsContent value="certificate">
                    <CertificateTab course={course} />
                  </TabsContent>
                  <TabsContent value="assistant">
                    <AIAssistantTab courseId={course.id} />
                  </TabsContent>
                </div>
              </Tabs>
            </div>
          </div>
        </main>

        {/* Desktop sidebar */}
        <aside className="hidden lg:flex flex-col w-80 xl:w-96 border-l bg-card">{sidebar}</aside>
      </div>
    </div>
  );
}
