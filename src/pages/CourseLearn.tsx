import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { ScormApiAdapter } from '@/lib/scorm-api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetHeader } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
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
  FileText,
  RectangleHorizontal,
  Maximize,
  Minimize,
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
import { TranscriptTab } from '@/components/course-learn/TranscriptTab';
import { VideoPlayer } from '@/components/course-learn/VideoPlayer';
import { ContentInfoDialog } from '@/components/course-learn/ContentInfoDialog';
import { ReportProblemDialog } from '@/components/course-learn/ReportProblemDialog';
import { useLearnerPrefs } from '@/components/course-learn/useLearnerPrefs';
import { lessonTypeLabel } from '@/components/course-learn/lessonMeta';
import type {
  LearnCourse,
  LearnLesson,
  LearnModule,
  LearnResource,
  LessonTranscript,
  LessonVideoSource,
  MediaController,
} from '@/components/course-learn/types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const sb = supabase as any;

export default function CourseLearn() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { prefs, setPrefs } = useLearnerPrefs();

  const [course, setCourse] = useState<LearnCourse | null>(null);
  const [modules, setModules] = useState<LearnModule[]>([]);
  const [lessons, setLessons] = useState<LearnLesson[]>([]);
  const [resources, setResources] = useState<LearnResource[]>([]);
  const [loading, setLoading] = useState(true);
  const [scormHtml, setScormHtml] = useState('');
  const [scormLoading, setScormLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Per-lesson media support
  const [transcript, setTranscript] = useState<LessonTranscript | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [videoSources, setVideoSources] = useState<LessonVideoSource[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

  // Dialogs
  const [contentInfoOpen, setContentInfoOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTime, setReportTime] = useState(0);

  const apiRef = useRef<ScormApiAdapter | null>(null);
  const mediaRef = useRef<MediaController | null>(null);
  const scormFrameWrapRef = useRef<HTMLDivElement>(null);
  const [scormFullscreen, setScormFullscreen] = useState(false);

  const courseId = course?.id ?? null;
  const theatre = prefs.theatre;

  const isUUID = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const activeLessonId = searchParams.get('lesson') ?? undefined;
  const activeLesson = useMemo(
    () => lessons.find((l) => l.id === activeLessonId) || lessons[0],
    [lessons, activeLessonId]
  );

  const isVideoLesson = activeLesson?.lesson_type === 'video';
  const canSeek = isVideoLesson;
  const activeModuleName = useMemo(
    () => modules.find((m) => m.id === activeLesson?.module_id)?.title ?? null,
    [modules, activeLesson]
  );
  const hasTranscript = !!transcript && (!!transcript.transcript_text || (transcript.segments?.length ?? 0) > 0);
  const lessonHasResources = useMemo(
    () =>
      resources.some((r) => !r.lesson_id || r.lesson_id === activeLesson?.id),
    [resources, activeLesson]
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
          'id, title, subtitle, description, overview, has_certificate, requires_practical_signoff, practical_details, certificate_details, scope_notes, learning_outcomes'
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

      const [{ data: modulesData }, { data: lessonsData }, { data: progressData }, { data: resourcesData }, { data: trainersData }] =
        await Promise.all([
          supabase.from('modules').select('id, title, order_index').eq('course_id', courseData.id).order('order_index'),
          supabase.from('lessons').select('*').eq('course_id', courseData.id).order('order_index'),
          supabase.from('lesson_progress').select('lesson_id, completed').eq('user_id', user!.id),
          sb
            .from('course_resources')
            .select('id, title, description, resource_type, url, order_index, lesson_id')
            .eq('course_id', courseData.id)
            .order('order_index'),
          sb
            .from('course_trainers')
            .select('can_sign_off, staff_profiles(full_name)')
            .eq('course_id', courseData.id)
            .eq('can_sign_off', true),
        ]);

      // Question counts for quiz lessons (drives "N questions" labels and which
      // empty placeholder quizzes are hidden from the learner).
      const quizLessonIds = (lessonsData || []).filter((l: any) => l.lesson_type === 'quiz').map((l: any) => l.id);
      const questionCountByLesson = new Map<string, number>();
      if (quizLessonIds.length > 0) {
        const { data: quizzesData } = await sb.from('quizzes').select('id, lesson_id').in('lesson_id', quizLessonIds);
        const quizIdToLesson = new Map((quizzesData || []).map((q: any) => [q.id, q.lesson_id]));
        if ((quizzesData || []).length > 0) {
          const { data: qq } = await sb
            .from('quiz_questions')
            .select('quiz_id')
            .in('quiz_id', (quizzesData || []).map((q: any) => q.id));
          (qq || []).forEach((row: any) => {
            const lessonId = quizIdToLesson.get(row.quiz_id);
            if (lessonId) questionCountByLesson.set(lessonId, (questionCountByLesson.get(lessonId) || 0) + 1);
          });
        }
      }

      const progressMap = new Map(progressData?.map((p) => [p.lesson_id, p.completed]) || []);
      const withProgress: LearnLesson[] = (lessonsData || []).map((l: any) => ({
        ...l,
        completed: progressMap.get(l.id) || false,
        question_count: l.lesson_type === 'quiz' ? questionCountByLesson.get(l.id) || 0 : undefined,
      }));

      const assessors = (trainersData || [])
        .map((t: any) => t.staff_profiles?.full_name?.split(' ')[0])
        .filter(Boolean) as string[];

      setModules(modulesData || []);
      setLessons(withProgress);
      setResources(resourcesData || []);
      setCompetencyAssessors(assessors);

    } catch (err) {
      console.error('Error loading course:', err);
      toast.error('Failed to load course');
      navigate('/my-learning');
    } finally {
      setLoading(false);
    }
  };

  // Load transcript + video sources for the active lesson
  useEffect(() => {
    let cancelled = false;
    setTranscript(null);
    setVideoSources([]);
    setCurrentTime(0);
    if (!activeLesson) return;
    setTranscriptLoading(true);
    (async () => {
      const [{ data: tData }, { data: vData }] = await Promise.all([
        sb
          .from('lesson_transcripts')
          .select('id, lesson_id, language_code, language_label, transcript_text, vtt_url, segments')
          .eq('lesson_id', activeLesson.id)
          .order('language_code')
          .limit(1),
        sb
          .from('lesson_video_sources')
          .select('id, lesson_id, quality_label, source_url, mime_type, width, height, is_default')
          .eq('lesson_id', activeLesson.id)
          .order('height', { ascending: false }),
      ]);
      if (cancelled) return;
      setTranscript((tData && tData[0]) || null);
      setVideoSources(vData || []);
      setTranscriptLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [activeLesson?.id]);

  // Poll current time while the transcript tab is open (for active-segment highlight)
  useEffect(() => {
    if (activeTab !== 'transcript' || !canSeek) return;
    const t = setInterval(() => {
      setCurrentTime(mediaRef.current?.getCurrentTime?.() ?? 0);
    }, 500);
    return () => clearInterval(t);
  }, [activeTab, canSeek, activeLesson?.id]);

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

  useEffect(() => {
    const onFs = () =>
      setScormFullscreen(document.fullscreenElement === scormFrameWrapRef.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  const goToLesson = (lessonId: string) => {
    setSearchParams({ lesson: lessonId });
    setMobileNavOpen(false);
    setActiveTab('overview');
  };

  const currentIndex = lessons.findIndex((l) => l.id === activeLesson?.id);
  const prevLesson = currentIndex > 0 ? lessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < lessons.length - 1 ? lessons[currentIndex + 1] : null;

  const openTranscript = () => setActiveTab('transcript');
  const toggleTheatre = () => setPrefs({ theatre: !prefs.theatre });

  const toggleScormFullscreen = () => {
    const el = scormFrameWrapRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen().catch(() => {});
  };

  const handleVideoEnded = () => {
    if (activeLesson) markComplete(activeLesson.id);
    if (prefs.autoplay && nextLesson) goToLesson(nextLesson.id);
  };

  if (authLoading || loading || !course) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderLessonBody = () => {
    if (!activeLesson) {
      return (
        <div className="flex aspect-video w-full items-center justify-center rounded-lg border bg-muted text-muted-foreground">
          No lessons available in this course yet.
        </div>
      );
    }

    if (activeLesson.lesson_type === 'scorm') {
      return (
        <div className="space-y-2">
          <div
            ref={scormFrameWrapRef}
            className={cn(
              'w-full overflow-hidden rounded-lg border bg-black',
              scormFullscreen ? 'h-screen rounded-none' : 'aspect-video'
            )}
          >
            {scormLoading ? (
              <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary-foreground/70" />
              </div>
            ) : scormHtml ? (
              <iframe
                srcDoc={scormHtml}
                className="h-full w-full border-0"
                title={activeLesson.title}
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-modals allow-downloads"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-primary-foreground/70">
                Unable to load this module.
              </div>
            )}
          </div>
          {/* Wrapper-level tools for SCORM. Lesson Previous/Next live in the
              shared nav below, so we only surface the player tools here to
              avoid duplicate controls (cleaner on mobile). */}
          <div className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap sm:justify-end">
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={openTranscript}>
              <FileText className="mr-1.5 h-4 w-4" /> Transcript
            </Button>
            <Button
              variant={theatre ? 'secondary' : 'outline'}
              size="sm"
              className="w-full sm:w-auto"
              onClick={toggleTheatre}
            >
              <RectangleHorizontal className="mr-1.5 h-4 w-4" /> Theatre
            </Button>
            <Button variant="outline" size="sm" className="w-full sm:w-auto" onClick={toggleScormFullscreen}>
              {scormFullscreen ? (
                <Minimize className="mr-1.5 h-4 w-4" />
              ) : (
                <Maximize className="mr-1.5 h-4 w-4" />
              )}
              Fullscreen
            </Button>
          </div>

        </div>
      );
    }

    if (activeLesson.lesson_type === 'video') {
      return (
        <VideoPlayer
          key={activeLesson.id}
          title={activeLesson.title}
          sources={videoSources}
          fallbackUrl={activeLesson.video_url}
          vttUrl={transcript?.vtt_url}
          hasCaptions={!!transcript?.vtt_url}
          prefs={prefs}
          setPrefs={setPrefs}
          theatre={theatre}
          onToggleTheatre={toggleTheatre}
          onToggleTranscript={openTranscript}
          onPrev={prevLesson ? () => goToLesson(prevLesson.id) : undefined}
          onNext={nextLesson ? () => goToLesson(nextLesson.id) : undefined}
          onEnded={handleVideoEnded}
          onContentInfo={() => setContentInfoOpen(true)}
          onReport={(t) => {
            setReportTime(t);
            setReportOpen(true);
          }}
          controllerRef={mediaRef}
        />
      );
    }

    if (activeLesson.lesson_type === 'quiz') {
      return (
        <div className="rounded-lg border bg-card p-8 text-center">
          <HelpCircle className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h3 className="mb-1 text-lg font-semibold">{activeLesson.title}</h3>
          {activeLesson.description && (
            <p className="mx-auto mb-4 max-w-md text-sm text-muted-foreground">
              {activeLesson.description}
            </p>
          )}
          <Button size="lg" onClick={() => navigate(`/courses/${courseId}/quiz?lesson=${activeLesson.id}`)}>
            <HelpCircle className="mr-2 h-4 w-4" />
            Start Assessment
          </Button>
        </div>
      );
    }

    if (activeLesson.lesson_type === 'practical') {
      return (
        <div className="rounded-lg border bg-card p-8 text-center">
          <ClipboardCheck className="mx-auto mb-3 h-10 w-10 text-primary" />
          <h3 className="mb-1 text-lg font-semibold">Practical session</h3>
          <p className="mx-auto max-w-md text-sm text-muted-foreground">
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
          <div className="prose prose-sm max-w-none whitespace-pre-line leading-relaxed text-foreground">
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
        <BookOpen className="mr-1.5 h-4 w-4" /> Overview
      </TabsTrigger>
      <TabsTrigger value="qa" className="data-[state=active]:bg-secondary">
        <MessageCircleQuestion className="mr-1.5 h-4 w-4" /> Q&amp;A
      </TabsTrigger>
      <TabsTrigger value="notes" className="data-[state=active]:bg-secondary">
        <StickyNote className="mr-1.5 h-4 w-4" /> Notes
      </TabsTrigger>
      <TabsTrigger value="transcript" className="data-[state=active]:bg-secondary">
        <FileText className="mr-1.5 h-4 w-4" /> Transcript
      </TabsTrigger>
      <TabsTrigger value="resources" className="data-[state=active]:bg-secondary">
        <Paperclip className="mr-1.5 h-4 w-4" /> Resources
      </TabsTrigger>
      <TabsTrigger value="practical" className="data-[state=active]:bg-secondary">
        <ClipboardCheck className="mr-1.5 h-4 w-4" /> Practical
      </TabsTrigger>
      <TabsTrigger value="certificate" className="data-[state=active]:bg-secondary">
        <Award className="mr-1.5 h-4 w-4" /> Certificate
      </TabsTrigger>
      <TabsTrigger value="assistant" className="data-[state=active]:bg-secondary">
        <Sparkles className="mr-1.5 h-4 w-4" /> AI Assistant
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
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="flex items-center justify-between gap-3 border-b bg-card px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${courseId || id}`)}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Course</span>
          </Button>
          <h1 className="truncate text-sm font-semibold text-foreground">{course.title}</h1>
        </div>
        <Sheet open={mobileNavOpen} onOpenChange={setMobileNavOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="sm" className="lg:hidden">
              <ListChecks className="mr-1.5 h-4 w-4" /> Content
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

      <div className="flex min-h-0 flex-1">
        {/* Main */}
        <main className="min-w-0 flex-1 overflow-y-auto">
          <div className={cn('mx-auto px-4 py-6 lg:px-8', theatre ? 'max-w-[1500px]' : 'max-w-5xl')}>
            {activeLesson && (
              <div className="mb-4">
                <div className="mb-1.5 flex flex-wrap items-center gap-2">
                  <Badge variant="outline">{lessonTypeLabel(activeLesson.lesson_type)}</Badge>
                  {activeLesson.completed && (
                    <Badge className="bg-status-success-bg text-status-success-foreground">
                      <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
                    </Badge>
                  )}
                </div>
                <h2 className="text-2xl font-bold text-foreground">{activeLesson.title}</h2>
              </div>
            )}

            {renderLessonBody()}

            {/* Lesson navigation */}
            {activeLesson && (
              <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b pb-5">
                <Button
                  variant="outline"
                  disabled={!prevLesson}
                  onClick={() => prevLesson && goToLesson(prevLesson.id)}
                >
                  <ChevronLeft className="mr-1 h-4 w-4" /> Previous
                </Button>
                <div className="flex items-center gap-2">
                  {activeLesson.lesson_type !== 'quiz' &&
                    activeLesson.lesson_type !== 'scorm' &&
                    !activeLesson.completed && (
                      <Button variant="secondary" onClick={() => markComplete(activeLesson.id)}>
                        <CheckCircle2 className="mr-1 h-4 w-4" /> Mark complete
                      </Button>
                    )}
                  <Button disabled={!nextLesson} onClick={() => nextLesson && goToLesson(nextLesson.id)}>
                    Next <ChevronRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Workspace tabs */}
            <div className="mt-6">
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <div className="-mx-1 overflow-x-auto px-1 pb-1">{tabList}</div>
                <div className="mt-5">
                  <TabsContent value="overview">
                    <OverviewTab course={course} activeLesson={activeLesson} />
                  </TabsContent>
                  <TabsContent value="qa">
                    <QnaTab courseId={course.id} activeLesson={activeLesson} />
                  </TabsContent>
                  <TabsContent value="notes">
                    <NotesTab
                      courseId={course.id}
                      activeLesson={activeLesson}
                      lessons={lessons}
                      canSeek={canSeek}
                      controllerRef={mediaRef}
                    />
                  </TabsContent>
                  <TabsContent value="transcript">
                    <TranscriptTab
                      transcript={transcript}
                      loading={transcriptLoading}
                      canSeek={canSeek}
                      controllerRef={mediaRef}
                      currentTime={currentTime}
                    />
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

        {/* Desktop sidebar — hidden in theatre mode */}
        {!theatre && (
          <aside className="hidden w-80 flex-col border-l bg-card lg:flex xl:w-96">{sidebar}</aside>
        )}
      </div>

      <ContentInfoDialog
        open={contentInfoOpen}
        onOpenChange={setContentInfoOpen}
        lesson={activeLesson}
        moduleName={activeModuleName}
        hasTranscript={hasTranscript}
        hasResources={lessonHasResources}
      />
      <ReportProblemDialog
        open={reportOpen}
        onOpenChange={setReportOpen}
        courseId={course.id}
        lessonId={activeLesson?.id}
        playbackTime={reportTime}
      />
    </div>
  );
}
