import { useEffect, useState, type ReactNode, type MutableRefObject } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { cn } from '@/lib/utils';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  ChevronRight as ChevronRightSmall,
  CheckCircle2,
  ListChecks,
  LayoutGrid,
  BookOpen,
  Award,
  Share2,
  MessageCircleQuestion,
  StickyNote,
  Paperclip,
  Megaphone,
  Heart,
} from 'lucide-react';
import { toast } from 'sonner';

import { MobileLectureList } from './MobileLectureList';
import { OverviewTab } from './OverviewTab';
import { QnaTab } from './QnaTab';
import { NotesTab } from './NotesTab';
import { MobileResources } from './MobileResources';
import { CertificateTab } from './CertificateTab';
import { lessonTypeLabel } from './lessonMeta';
import type { LearnCourse, LearnLesson, LearnModule, LearnResource, MediaController } from './types';

const PROVIDER_NAME = 'Special People Training';

interface Props {
  course: LearnCourse;
  modules: LearnModule[];
  visibleLessons: LearnLesson[];
  lessons: LearnLesson[];
  resources: LearnResource[];
  activeLesson: LearnLesson | undefined;
  competencyAssessors: string[];
  canSeek: boolean;
  controllerRef: MutableRefObject<MediaController | null>;
  lessonBody: ReactNode;
  prevLesson: LearnLesson | null;
  nextLesson: LearnLesson | null;
  onSelectLesson: (lessonId: string) => void;
  onBack: () => void;
  onMarkComplete: (lessonId: string) => void;
}

type MoreView =
  | 'menu'
  | 'about'
  | 'certificate'
  | 'qa'
  | 'notes'
  | 'resources'
  | 'announcements';

export function MobileCoursePlayer({
  course,
  modules,
  visibleLessons,
  lessons,
  resources,
  activeLesson,
  competencyAssessors,
  canSeek,
  controllerRef,
  lessonBody,
  prevLesson,
  nextLesson,
  onSelectLesson,
  onBack,
  onMarkComplete,
}: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<'lectures' | 'more'>('lectures');
  const [moreView, setMoreView] = useState<MoreView>('menu');
  const [favourite, setFavourite] = useState(false);
  const [certificateEarned, setCertificateEarned] = useState(false);

  // Whether this learner has earned a certificate for the course yet — drives
  // the "Course Certificate" row subtitle. Read-only; never changes cert logic.
  useEffect(() => {
    let cancelled = false;
    if (!user || !course.has_certificate) {
      setCertificateEarned(false);
      return;
    }
    (async () => {
      const { count } = await (supabase as any)
        .from('certificates')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('course_id', course.id);
      if (!cancelled) setCertificateEarned((count ?? 0) > 0);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, course.id, course.has_certificate]);

  const completedCount = visibleLessons.filter((l) => l.completed).length;
  const total = visibleLessons.length;
  const progressPct = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  const handleShare = async () => {
    const url = `${window.location.origin}/courses/${course.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: course.title, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success('Course link copied');
      }
    } catch {
      /* user dismissed the share sheet — no action needed */
    }
  };

  const toggleFavourite = () => {
    setFavourite((f) => {
      const next = !f;
      toast.success(next ? 'Added to favourites' : 'Removed from favourites');
      return next;
    });
  };

  const hasResources = resources.length > 0;

  type MoreMenuItem = {
    key: MoreView | 'share' | 'favourite';
    label: string;
    subtitle?: string;
    icon: ReactNode;
    onClick: () => void;
    enabled: boolean;
    drillIn: boolean;
  };

  const moreMenu: MoreMenuItem[] = ([
    {
      key: 'about',
      label: 'About this Course',
      icon: <BookOpen className="h-5 w-5" />,
      onClick: () => setMoreView('about'),
      enabled: true,
      drillIn: true,
    },
    {
      key: 'certificate',
      label: 'Course Certificate',
      subtitle: certificateEarned
        ? 'Tap to view and download'
        : 'Certificate available after course completion',
      icon: <Award className="h-5 w-5" />,
      onClick: () => setMoreView('certificate'),
      enabled: !!course.has_certificate,
      drillIn: true,
    },
    {
      key: 'share',
      label: 'Share this Course',
      icon: <Share2 className="h-5 w-5" />,
      onClick: handleShare,
      enabled: true,
      drillIn: false,
    },
    {
      key: 'qa',
      label: 'Q&A',
      icon: <MessageCircleQuestion className="h-5 w-5" />,
      onClick: () => setMoreView('qa'),
      enabled: true,
      drillIn: true,
    },
    {
      key: 'notes',
      label: 'Notes',
      icon: <StickyNote className="h-5 w-5" />,
      onClick: () => setMoreView('notes'),
      enabled: true,
      drillIn: true,
    },
    {
      key: 'resources',
      label: 'Resources',
      subtitle: hasResources ? undefined : 'No resources for this course yet',
      icon: <Paperclip className="h-5 w-5" />,
      onClick: () => setMoreView('resources'),
      enabled: hasResources,
      drillIn: true,
    },
    {
      key: 'announcements',
      label: 'Announcements',
      subtitle: 'No announcements yet',
      icon: <Megaphone className="h-5 w-5" />,
      onClick: () => setMoreView('announcements'),
      enabled: true,
      drillIn: true,
    },
    {
      key: 'favourite',
      label: favourite ? 'Remove from Favourites' : 'Add Course to Favourites',
      icon: <Heart className={cn('h-5 w-5', favourite && 'fill-primary text-primary')} />,
      onClick: toggleFavourite,
      enabled: true,
      drillIn: false,
    },
  ] as MoreMenuItem[]).filter((item) => item.enabled);

  const moreTitles: Record<Exclude<MoreView, 'menu'>, string> = {
    about: 'About this Course',
    certificate: 'Course Certificate',
    qa: 'Q&A',
    notes: 'Notes',
    resources: 'Resources',
    announcements: 'Announcements',
  };

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Compact header */}
      <header className="flex items-center gap-2 border-b bg-card px-3 py-2">
        <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onBack} aria-label="Back to course">
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="truncate text-sm font-semibold text-foreground">{course.title}</h1>
      </header>

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
        {/* Top video area — full width, 16:9 handled inside the lesson body */}
        <div className="w-full bg-background px-3 pt-3">{lessonBody}</div>

        {/* Course + lesson meta */}
        <div className="border-b px-4 pb-4 pt-3">
          {activeLesson && (
            <div className="mb-1.5 flex flex-wrap items-center gap-2">
              <Badge variant="outline">{lessonTypeLabel(activeLesson.lesson_type)}</Badge>
              {activeLesson.completed && (
                <Badge className="bg-status-success-bg text-status-success-foreground">
                  <CheckCircle2 className="mr-1 h-3 w-3" /> Completed
                </Badge>
              )}
            </div>
          )}
          <h2 className="text-lg font-bold leading-snug text-foreground">
            {activeLesson?.title ?? course.title}
          </h2>
          <p className="mt-0.5 text-sm text-muted-foreground">{PROVIDER_NAME}</p>
          {total > 0 && (
            <div className="mt-3">
              <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  {completedCount}/{total} lessons complete
                </span>
                <span>{progressPct}%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${progressPct}%` }} />
              </div>
            </div>
          )}

          {/* Lesson navigation */}
          {activeLesson && (
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                disabled={!prevLesson}
                onClick={() => prevLesson && onSelectLesson(prevLesson.id)}
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Previous
              </Button>
              {activeLesson.lesson_type !== 'quiz' &&
                activeLesson.lesson_type !== 'scorm' &&
                activeLesson.lesson_type !== 'resource' &&
                !activeLesson.completed && (
                  <Button variant="secondary" size="sm" onClick={() => onMarkComplete(activeLesson.id)}>
                    <CheckCircle2 className="h-4 w-4" />
                  </Button>
                )}
              <Button
                size="sm"
                className="flex-1"
                disabled={!nextLesson}
                onClick={() => nextLesson && onSelectLesson(nextLesson.id)}
              >
                Next <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          )}
        </div>

        {/* Tabs: Lectures / More */}
        <Tabs
          value={tab}
          onValueChange={(v) => {
            setTab(v as 'lectures' | 'more');
            if (v === 'more') setMoreView('menu');
          }}
          className="flex min-h-0 flex-1 flex-col"
        >
          <TabsList className="grid h-12 w-full shrink-0 grid-cols-2 rounded-none border-b bg-card p-0">
            <TabsTrigger
              value="lectures"
              className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <ListChecks className="mr-1.5 h-4 w-4" /> Lectures
            </TabsTrigger>
            <TabsTrigger
              value="more"
              className="h-full rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none"
            >
              <LayoutGrid className="mr-1.5 h-4 w-4" /> More
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lectures" className="mt-0 min-h-0 flex-1 overflow-y-auto">
            <MobileLectureList
              courseId={course.id}
              modules={modules}
              lessons={visibleLessons}
              resources={resources}
              activeLessonId={activeLesson?.id}
              onSelect={onSelectLesson}
            />
          </TabsContent>

          <TabsContent value="more" className="mt-0 min-h-0 flex-1 overflow-y-auto">
            {moreView === 'menu' ? (
              <ul className="divide-y">
                {moreMenu.map((item) => (
                  <li key={item.key}>
                    <button
                      onClick={item.onClick}
                      className="flex min-h-[60px] w-full items-center gap-3 px-4 py-3.5 text-left transition-colors hover:bg-muted/50 active:bg-muted"
                    >
                      <span className="shrink-0 text-muted-foreground">{item.icon}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-foreground">{item.label}</span>
                        {item.subtitle && (
                          <span className="mt-0.5 block text-xs text-muted-foreground">{item.subtitle}</span>
                        )}
                      </span>
                      {item.drillIn && <ChevronRightSmall className="h-4 w-4 shrink-0 text-muted-foreground" />}
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="p-4">
                <button
                  onClick={() => setMoreView('menu')}
                  className="mb-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary"
                >
                  <ArrowLeft className="h-4 w-4" /> {moreTitles[moreView]}
                </button>
                {moreView === 'about' && (
                  <OverviewTab course={course} activeLesson={activeLesson} competencyAssessors={competencyAssessors} />
                )}
                {moreView === 'certificate' && <CertificateTab course={course} />}
                {moreView === 'qa' && <QnaTab courseId={course.id} activeLesson={activeLesson} />}
                {moreView === 'notes' && (
                  <NotesTab
                    courseId={course.id}
                    activeLesson={activeLesson}
                    lessons={lessons}
                    canSeek={canSeek}
                    controllerRef={controllerRef}
                  />
                )}
                {moreView === 'resources' && (
                  <ResourcesTab courseId={course.id} resources={resources} lessons={lessons} />
                )}
                {moreView === 'announcements' && (
                  <div className="rounded-lg border bg-card p-8 text-center">
                    <Megaphone className="mx-auto mb-3 h-9 w-9 text-muted-foreground" />
                    <p className="text-sm font-medium text-foreground">No announcements yet</p>
                    <p className="mx-auto mt-1 max-w-xs text-xs text-muted-foreground">
                      Updates from your trainer about this course will appear here.
                    </p>
                  </div>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
