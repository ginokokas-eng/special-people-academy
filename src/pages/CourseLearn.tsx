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
import logoMark from '@/assets/logo.svg';

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
  VideoOff,
  RotateCcw,
} from '@/components/icons';
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
import { CourseHome } from '@/components/course-learn/CourseHome';
import { deriveLessonCardMedia, type CardMediaBlockRow } from '@/components/course-learn/lessonCardMedia';
import { MobileCoursePlayer } from '@/components/course-learn/MobileCoursePlayer';
import { ResourceLessonBody } from '@/components/course-learn/ResourceLessonBody';
import { LessonBlocks } from '@/components/course-learn/blocks/LessonBlocks';
import type { BlockPayload, BlockType, LessonBlock } from '@/components/course-learn/blocks/types';
import { ContentInfoDialog } from '@/components/course-learn/ContentInfoDialog';
import { ReportProblemDialog } from '@/components/course-learn/ReportProblemDialog';
import { useLearnerPrefs } from '@/components/course-learn/useLearnerPrefs';
import { useIsMobile } from '@/hooks/use-mobile';
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
  const isMobile = useIsMobile();

  const [course, setCourse] = useState<LearnCourse | null>(null);
  const [modules, setModules] = useState<LearnModule[]>([]);
  const [lessons, setLessons] = useState<LearnLesson[]>([]);
  const [resources, setResources] = useState<LearnResource[]>([]);
  const [competencyAssessors, setCompetencyAssessors] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [scormHtml, setScormHtml] = useState('');
  const [scormLoading, setScormLoading] = useState(false);
  const [scormFrameReady, setScormFrameReady] = useState(false);
  // True when the embedded player's <video> reports an unplayable source
  // (e.g. a browser/webview without standard MP4/H.264 codec support).
  const [scormVideoError, setScormVideoError] = useState(false);
  // Bumped to force a fresh reload of the SCORM lesson on "Retry".
  const [scormReloadKey, setScormReloadKey] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  /** Lessons with an existing progress row that is not yet complete. */
  const [startedLessonIds, setStartedLessonIds] = useState<Set<string>>(new Set());
  /** Lesson to scroll into view + highlight once on the course home. */
  const [highlightLessonId, setHighlightLessonId] = useState<string | null>(null);
  /** All block rows for the course, used only to derive course-home card images. */
  const [courseBlockRows, setCourseBlockRows] = useState<CardMediaBlockRow[]>([]);


  // Per-lesson media support
  const [transcript, setTranscript] = useState<LessonTranscript | null>(null);
  const [transcriptLoading, setTranscriptLoading] = useState(false);
  const [videoSources, setVideoSources] = useState<LessonVideoSource[]>([]);
  /** Blocks for the active 'blocks' lesson (empty for every other lesson type). */
  const [lessonBlocks, setLessonBlocks] = useState<LessonBlock[]>([]);
  const [currentTime, setCurrentTime] = useState(0);

  // Dialogs
  const [contentInfoOpen, setContentInfoOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTime, setReportTime] = useState(0);

  const apiRef = useRef<ScormApiAdapter | null>(null);
  const mediaRef = useRef<MediaController | null>(null);
  const scormFrameWrapRef = useRef<HTMLDivElement>(null);
  const scormIframeRef = useRef<HTMLIFrameElement>(null);
  const [scormFullscreen, setScormFullscreen] = useState(false);

  const courseId = course?.id ?? null;
  const theatre = prefs.theatre;

  const isUUID = (str: string) =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);

  const activeLessonId = searchParams.get('lesson') ?? undefined;

  // Lessons whose content has been relocated into the Overview tab and should
  // no longer appear as standalone learner lessons.
  const RELOCATED_LESSON_IDS = useMemo(
    () =>
      new Set<string>([
        '7361160e-1892-488c-820e-461c8f03eb35', // Learning Outcomes -> Overview
        '2d366681-397f-4f0d-96a7-e8cff0729586', // Understanding Your Certification Pathway -> Overview
      ]),
    []
  );

  // Learner-facing lessons: hide relocated lessons, empty quiz placeholders, and
  // empty reading/scenario/pdf placeholders. Required media (SCORM/video) and
  // practical lessons always show.
  const visibleLessons = useMemo(() => {
    const moduleOrder = new Map(modules.map((m, i) => [m.id, m.order_index ?? i]));
    return lessons
      .filter((l) => {
        if (RELOCATED_LESSON_IDS.has(l.id)) return false;
        if (l.lesson_type === 'quiz') return (l.question_count ?? 0) > 0;
        // A resource is only shown once it has reading content; empty
        // resources stay hidden from learners until completed by an admin.
        if (l.lesson_type === 'resource') return !!(l.content && l.content.trim());
        if (l.lesson_type === 'text' || l.lesson_type === 'scenario' || l.lesson_type === 'pdf') {
          return !!(l.description && l.description.trim());
        }
        return true;
      })
      .sort((a, b) => {
        const ma = a.module_id ? moduleOrder.get(a.module_id) ?? 9999 : 9999;
        const mb = b.module_id ? moduleOrder.get(b.module_id) ?? 9999 : 9999;
        if (ma !== mb) return ma - mb;
        return (a.order_index ?? 0) - (b.order_index ?? 0);
      });
  }, [lessons, modules, RELOCATED_LESSON_IDS]);

  /** Course-home card images, derived once from the course's block rows. */
  const lessonCardMedia = useMemo(() => deriveLessonCardMedia(courseBlockRows), [courseBlockRows]);


  const activeLesson = useMemo(
    () => visibleLessons.find((l) => l.id === activeLessonId) || visibleLessons[0],
    [visibleLessons, activeLessonId]
  );

  // No ?lesson= means the learner is on the course home (module hub). We
  // deliberately do NOT auto-fill the first lesson: choosing where to start is
  // the point of the hub. Deep links with ?lesson= are unaffected.
  const showHub = !activeLessonId;


  const isVideoLesson = activeLesson?.lesson_type === 'video';
  const canSeek = isVideoLesson;
  const activeModuleName = useMemo(
    () => modules.find((m) => m.id === activeLesson?.module_id)?.title ?? null,
    [modules, activeLesson]
  );
  /** 1-based position of the active lesson's module, 0 when unknown. */
  const activeModuleIndex = useMemo(
    () => modules.findIndex((m) => m.id === activeLesson?.module_id) + 1,
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
          'id, title, subtitle, description, overview, thumbnail_url, has_certificate, requires_practical_signoff, practical_details, certificate_details, scope_notes, learning_outcomes'
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

      const [{ data: modulesData }, { data: lessonsData }, { data: progressData }, { data: resourcesData }, { data: assessorRows }] =
        await Promise.all([
          supabase.from('modules').select('id, title, order_index').eq('course_id', courseData.id).order('order_index'),
          supabase.from('lessons').select('*').eq('course_id', courseData.id).order('order_index'),
          supabase.from('lesson_progress').select('lesson_id, completed').eq('user_id', user!.id),
          sb
            .from('course_resources')
            .select('id, title, description, resource_type, url, order_index, lesson_id')
            .eq('course_id', courseData.id)
            .order('order_index'),
          sb.rpc('get_course_competency_assessors', { _course_id: courseData.id }),
        ]);

      // Question counts for quiz lessons (drives "N questions" labels and which
      // empty placeholder quizzes are hidden from the learner).
      const quizLessonIds = (lessonsData || []).filter((l: any) => l.lesson_type === 'quiz').map((l: any) => l.id);
      const questionCountByLesson = new Map<string, number>();
      if (quizLessonIds.length > 0) {
        const { data: quizzesData } = await sb.from('quizzes').select('id, lesson_id').in('lesson_id', quizLessonIds);
        const quizIdToLesson = new Map<string, string>((quizzesData || []).map((q: any) => [q.id as string, q.lesson_id as string]));
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
      setStartedLessonIds(
        new Set((progressData || []).filter((p) => !p.completed).map((p) => p.lesson_id))
      );
      const withProgress: LearnLesson[] = (lessonsData || []).map((l: any) => ({
        ...l,
        completed: progressMap.get(l.id) || false,
        question_count: l.lesson_type === 'quiz' ? questionCountByLesson.get(l.id) || 0 : undefined,
      }));


      const assessors = (assessorRows || [])
        .map((t: any) => (t.full_name as string)?.split(' ')[0])
        .filter(Boolean) as string[];

      setModules(modulesData || []);
      setLessons(withProgress);

      // One extra query for the whole course's blocks — used to derive the
      // course-home card images (memoised below; never per-card).
      const blockLessonIds = (lessonsData || [])
        .filter((l: any) => l.lesson_type === 'blocks')
        .map((l: any) => l.id);
      if (blockLessonIds.length) {
        const { data: blockRows } = await sb
          .from('lesson_blocks')
          .select('id, lesson_id, block_type, payload, order_index')
          .in('lesson_id', blockLessonIds);
        setCourseBlockRows((blockRows || []) as CardMediaBlockRow[]);
      } else {
        setCourseBlockRows([]);
      }
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

  // Load block content for the active lesson (only 'blocks' lessons have any).
  useEffect(() => {
    let cancelled = false;
    if (!activeLesson?.id || activeLesson.lesson_type !== 'blocks') {
      setLessonBlocks([]);
      return;
    }
    (async () => {
      const { data, error } = await supabase
        .from('lesson_blocks')
        .select('*')
        .eq('lesson_id', activeLesson.id)
        .order('order_index');
      if (cancelled) return;
      if (error) {
        console.error('Error loading lesson blocks:', error);
        setLessonBlocks([]);
        return;
      }
      setLessonBlocks(
        (data || []).map((row) => ({
          id: row.id,
          lesson_id: row.lesson_id,
          order_index: row.order_index,
          block_type: row.block_type as BlockType,
          payload: (row.payload ?? {}) as unknown as BlockPayload,
          is_graded: row.is_graded,
          contributes_to_completion: row.contributes_to_completion,
        }))
      );
    })();
    return () => {
      cancelled = true;
    };
  }, [activeLesson?.id, activeLesson?.lesson_type]);

  // Poll current time while the transcript tab is open (for active-segment highlight)
  useEffect(() => {
    if (activeTab !== 'transcript' || !canSeek) return;
    const t = setInterval(() => {
      setCurrentTime(mediaRef.current?.getCurrentTime?.() ?? 0);
    }, 500);
    return () => clearInterval(t);
  }, [activeTab, canSeek, activeLesson?.id]);

  const markComplete = useCallback(
    /**
     * Persist lesson completion. `returnHome` is only passed by the explicit
     * "Mark complete" actions — gates, autoplay and video-ended keep the
     * learner where they are.
     */
    async (lessonId: string, opts?: { returnHome?: boolean }) => {
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
      setStartedLessonIds((prev) => {
        if (!prev.has(lessonId)) return prev;
        const next = new Set(prev);
        next.delete(lessonId);
        return next;
      });
      if (courseId) {
        // Fire-and-confirm: certificate issuance is re-verified server-side and
        // must never block the completion UX.
        supabase.functions
          .invoke('issue-certificate', { body: { course_id: courseId } })
          .then(({ data }) => {
            if (data?.completed && data?.certificate_id && !data?.already_issued) {
              toast.success('🎉 Course complete — your certificate is ready', { duration: 6000 });
            }
          })
          .catch((e) => console.error('certificate issuance error', e));
      }
      if (opts?.returnHome) {
        toast.success('Lesson complete');
        setHighlightLessonId(lessonId);
        setSearchParams({}, { replace: false });
      }
    },
    [user, courseId, setSearchParams]
  );

  // Returning from the quiz page after a passing submission: land on the course
  // home with the completed lesson highlighted.
  useEffect(() => {
    const completed = searchParams.get('complete');
    if (!completed) return;
    setLessons((prev) => prev.map((l) => (l.id === completed ? { ...l, completed: true } : l)));
    setHighlightLessonId(completed);
    setSearchParams({}, { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);


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
      setScormFrameReady(false);
      setScormVideoError(false);
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
  }, [activeLesson?.id, scormReloadKey]);

  useEffect(() => {
    const onFs = () =>
      setScormFullscreen(document.fullscreenElement === scormFrameWrapRef.current);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  // Safety net: `srcDoc` iframes do not always fire `onLoad` reliably on some
  // mobile browsers, which can leave the video frame hidden (opacity-0) behind
  // the loading overlay and look like the video "isn't working". Reveal the
  // frame shortly after the content is set so it is never stuck invisible.
  // This is presentation-only and does not touch playback or completion.
  useEffect(() => {
    if (!scormHtml) return;
    const t = setTimeout(() => setScormFrameReady(true), 1200);
    return () => clearTimeout(t);
  }, [scormHtml]);

  // Detect when the embedded player's <video> cannot play its source so we can
  // show the learner a clear message + Retry instead of a confusing broken
  // image. The SCORM HTML is rendered via `srcDoc` with `allow-same-origin`, so
  // the inner document shares our origin and is accessible here. Read-only —
  // we never touch the SCORM runtime, the video source, or completion tracking.
  useEffect(() => {
    if (!scormFrameReady || !scormHtml) return;
    let cancelled = false;
    let cleanupFns: Array<() => void> = [];

    const attach = () => {
      const doc = scormIframeRef.current?.contentDocument;
      if (!doc) return false;
      const videos = Array.from(doc.querySelectorAll('video')) as HTMLVideoElement[];
      if (videos.length === 0) return false;
      videos.forEach((v) => {
        // MEDIA_ERR_SRC_NOT_SUPPORTED (4) / DECODE (3) → unplayable in this browser.
        if (v.error && (v.error.code === 3 || v.error.code === 4)) {
          if (!cancelled) setScormVideoError(true);
        }
        const onErr = () => {
          const code = v.error?.code;
          if (!cancelled && (code === 3 || code === 4)) setScormVideoError(true);
        };
        v.addEventListener('error', onErr, true);
        cleanupFns.push(() => v.removeEventListener('error', onErr, true));
      });
      return true;
    };

    // The HeyGen wrapper sets the <video> source slightly after load; poll a few
    // times until the element exists, then rely on its error event.
    let tries = 0;
    const poll = setInterval(() => {
      tries += 1;
      try {
        if (attach() || tries > 10) clearInterval(poll);
      } catch {
        clearInterval(poll);
      }
    }, 500);

    return () => {
      cancelled = true;
      clearInterval(poll);
      cleanupFns.forEach((fn) => fn());
      cleanupFns = [];
    };
  }, [scormFrameReady, scormHtml]);


  const goToLesson = (lessonId: string) => {
    setHighlightLessonId(null);
    setSearchParams({ lesson: lessonId });
    setMobileNavOpen(false);
    setActiveTab('overview');
  };


  const currentIndex = visibleLessons.findIndex((l) => l.id === activeLesson?.id);
  const prevLesson = currentIndex > 0 ? visibleLessons[currentIndex - 1] : null;
  const nextLesson =
    currentIndex >= 0 && currentIndex < visibleLessons.length - 1 ? visibleLessons[currentIndex + 1] : null;

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
              'relative w-full overflow-hidden rounded-lg border bg-card shadow-sm',
              scormFullscreen ? 'h-screen rounded-none' : 'aspect-video'
            )}
          >
            {scormHtml ? (
              <iframe
                ref={scormIframeRef}
                srcDoc={scormHtml}
                onLoad={() => setScormFrameReady(true)}
                className={cn(
                  'h-full w-full border-0 bg-card transition-opacity duration-500',
                  scormFrameReady && !scormVideoError ? 'opacity-100' : 'opacity-0'
                )}
                title={activeLesson.title}
                allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-presentation allow-modals allow-downloads"
              />
            ) : (
              !scormLoading && (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Unable to load this module.
                </div>
              )
            )}

            {/* Skeleton / loading state until the video frame is ready */}
            {(scormLoading || (scormHtml && !scormFrameReady)) && !scormVideoError && (
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-muted">
                <div className="absolute inset-0 animate-pulse bg-muted" />
                <Loader2 className="relative h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            )}

            {/* Friendly fallback when the embedded video can't play in this
                browser (e.g. an in-app browser without standard video support). */}
            {scormVideoError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-card px-6 text-center">
                <VideoOff className="h-9 w-9 text-muted-foreground" />
                <div className="space-y-1">
                  <p className="text-sm font-medium text-foreground">
                    This video couldn’t play in your current browser.
                  </p>
                  <p className="text-xs text-muted-foreground">
                    If you opened this from another app (email, Teams, Outlook), try opening it in
                    Chrome or Safari. You can also retry below.
                  </p>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setScormVideoError(false);
                    setScormReloadKey((k) => k + 1);
                  }}
                >
                  <RotateCcw className="mr-1.5 h-4 w-4" /> Retry
                </Button>
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

    if (activeLesson.lesson_type === 'blocks') {
      return (
        <LessonBlocks
          blocks={lessonBlocks}
          completed={!!activeLesson.completed}
          trickleEnabled={!!(activeLesson as { trickle_enabled?: boolean }).trickle_enabled}
          onComplete={() => markComplete(activeLesson.id, { returnHome: true })}
        />

      );
    }

    if (activeLesson.lesson_type === 'resource') {
      return (
        <ResourceLessonBody
          lesson={activeLesson}
          onMarkRead={(lessonId) => markComplete(lessonId, { returnHome: true })}
        />
      );

    }

    // text / scenario / pdf
    return (
      <div className="learner-card lesson-content mx-auto w-full max-w-[47rem] p-4 sm:p-6">
        {activeLesson.description ? (
          <div className="prose max-w-none whitespace-pre-line text-foreground">
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
      lessons={visibleLessons}
      resources={resources}
      activeLessonId={activeLesson?.id}
      onSelect={goToLesson}
    />
  );

  // Mobile-only course player (≤768px): video on top, then Lectures / More tabs.
  // Desktop & tablet keep the existing two-column layout untouched.
  const courseHome = (
    <CourseHome
      courseTitle={course.title}
      courseSubtitle={course.subtitle}
      courseDescription={course.description}
      courseThumbnailUrl={course.thumbnail_url}
      lessonMedia={lessonCardMedia}
      modules={modules}
      lessons={visibleLessons}
      hasCertificate={course.has_certificate}
      startedLessonIds={startedLessonIds}
      highlightLessonId={highlightLessonId}
      onSelectLesson={goToLesson}

      onBackToCourse={() => navigate(`/courses/${courseId || id}`)}
      onOpenCertificate={() => {
        if (visibleLessons.length) goToLesson(visibleLessons[0].id);
        setActiveTab('certificate');
      }}
    />
  );

  if (isMobile) {
    if (showHub) return <div className="min-h-screen bg-background">{courseHome}</div>;
    return (
      <>
        <MobileCoursePlayer
          course={course}
          modules={modules}
          visibleLessons={visibleLessons}
          lessons={lessons}
          resources={resources}
          activeLesson={activeLesson}
          competencyAssessors={competencyAssessors}
          canSeek={canSeek}
          controllerRef={mediaRef}
          lessonBody={renderLessonBody()}
          transcript={transcript}
          transcriptLoading={transcriptLoading}
          prevLesson={prevLesson}
          nextLesson={nextLesson}
          onSelectLesson={goToLesson}
          onBack={() => setSearchParams({}, { replace: false })}
          onMarkComplete={(lessonId) => markComplete(lessonId, { returnHome: true })}
        />
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
      </>
    );
  }

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <header className="material-chrome relative z-30 flex items-center justify-between gap-3 px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate(`/courses/${courseId || id}`)}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">Course</span>
          </Button>
          <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">{course.title}</h1>
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
        <main className="learner-surface min-w-0 flex-1 overflow-y-auto">
          {showHub ? (
            courseHome
          ) : (
          <div className={cn('mx-auto px-5 py-6 sm:px-6 lg:px-8', theatre ? 'max-w-[1500px]' : 'max-w-5xl')}>
            <div className="mb-3">
              <Button
                variant="ghost"
                size="sm"
                className="-ml-2"
                onClick={() => setSearchParams({}, { replace: false })}
              >
                <ArrowLeft className="mr-1 h-4 w-4" /> Back to modules
              </Button>
            </div>
            {activeLesson && (
              <header className="learner-header-band mb-5">
                <img
                  src={logoMark}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute -right-6 -top-6 h-40 w-40 opacity-[0.06] sm:h-48 sm:w-48"
                />
                <div className="relative space-y-1.5 p-4 sm:p-6">
                  {activeModuleName && (
                    <p className="text-[0.6875rem] font-semibold uppercase tracking-[0.16em] text-primary">
                      {activeModuleName}
                    </p>
                  )}
                  <h2 className="font-display text-[1.5rem] font-bold leading-tight text-foreground md:text-3xl">
                    {activeLesson.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[0.8125rem] text-muted-foreground">
                    <span>{lessonTypeLabel(activeLesson.lesson_type)}</span>
                    {activeModuleIndex > 0 && (
                      <>
                        <span aria-hidden="true">•</span>
                        <span className="tabular-nums">
                          Module {activeModuleIndex} of {modules.length}
                        </span>
                      </>
                    )}
                    {activeLesson.completed && (
                      <>
                        <span aria-hidden="true">•</span>
                        <span className="inline-flex items-center gap-1 font-semibold text-success">
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> Completed
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </header>
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
                    activeLesson.lesson_type !== 'resource' &&
                    !activeLesson.completed && (
                      <Button
                        variant="secondary"
                        onClick={() => markComplete(activeLesson.id, { returnHome: true })}
                      >

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
                    <OverviewTab course={course} activeLesson={activeLesson} competencyAssessors={competencyAssessors} />
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
          )}
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
