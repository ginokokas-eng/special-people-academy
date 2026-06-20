import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  FileText, 
  HelpCircle,
  Users,
  CheckCircle2,
  Circle,
  Clock,
  Lock,
  BookOpen,
  Gamepad2,
  Package
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  duration_seconds?: number | null;
  content?: string | null;
  question_count?: number;
  resource_page_count?: number | null;
  lesson_type: string;
  order_index: number;
  completed?: boolean;
  module_id?: string;
}

/** Whole minutes from exact media seconds: <60s -> 1, else round up. */
function videoMinutes(seconds: number | null | undefined): number {
  if (!seconds || seconds <= 0) return 0;
  if (seconds < 60) return 1;
  return Math.ceil(seconds / 60);
}

/** Printed pages: admin-set count if present, else estimate from content. */
function resourcePages(lesson: Lesson): number {
  if (lesson.resource_page_count != null && lesson.resource_page_count > 0) {
    return lesson.resource_page_count;
  }
  const len = (lesson.content || '').trim().length;
  if (len === 0) return 0;
  return Math.max(1, Math.ceil(len / 2400));
}

/** Sidebar meta label: video=minutes, quiz=questions, resource=pages, etc. */
function lessonMeta(lesson: Lesson): string {
  switch (lesson.lesson_type) {
    case 'scorm':
    case 'video': {
      const m = videoMinutes(lesson.duration_seconds);
      return m > 0 ? `${m} min` : '';
    }
    case 'quiz': {
      const c = lesson.question_count ?? 0;
      return c > 0 ? `${c} question${c === 1 ? '' : 's'}` : '';
    }
    case 'resource': {
      const p = resourcePages(lesson);
      return p > 0 ? `Resource · ${p} page${p === 1 ? '' : 's'}` : 'Resource';
    }
    case 'practical':
      return 'Practical';
    case 'certificate':
      return 'Certificate';
    default:
      return '';
  }
}

/** Sum video-only minutes for a set of lessons. */
function videoTotalMinutes(items: Lesson[]): number {
  const seconds = items.reduce(
    (sum, l) =>
      l.lesson_type === 'scorm' || l.lesson_type === 'video'
        ? sum + (l.duration_seconds || 0)
        : sum,
    0
  );
  return videoMinutes(seconds);
}

interface Module {
  id: string;
  title: string;
  description?: string;
  order_index: number;
  lessons: Lesson[];
}

interface CourseContentProps {
  modules: Module[];
  lessons: Lesson[];
  isEnrolled: boolean;
  onLessonClick: (lesson: Lesson) => void;
  onQuizClick?: (lesson: Lesson) => void;
  // Access control props
  canAccessCourse: boolean;
  requiresSubscription: boolean;
}

const lessonTypeIcons: Record<string, React.ReactNode> = {
  video: <Play className="h-4 w-4" />,
  pdf: <FileText className="h-4 w-4" />,
  quiz: <HelpCircle className="h-4 w-4" />,
  practical: <Users className="h-4 w-4" />,
  text: <BookOpen className="h-4 w-4" />,
  scenario: <Gamepad2 className="h-4 w-4" />,
  scorm: <Package className="h-4 w-4" />,
};

const lessonTypeLabels: Record<string, string> = {
  video: 'Video',
  pdf: 'PDF',
  quiz: 'Quiz',
  practical: 'Practical',
  text: 'Text',
  scenario: 'Scenario',
  scorm: 'Video',
};

export function CourseContent({ 
  modules, 
  lessons, 
  isEnrolled, 
  onLessonClick,
  onQuizClick,
  canAccessCourse,
  requiresSubscription,
}: CourseContentProps) {
  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Group lessons by module if modules exist
  const hasModules = modules.length > 0;

  // Calculate totals
  const totalLessons = lessons.length;
  const totalDuration = videoTotalMinutes(lessons);
  const completedCount = lessons.filter(l => l.completed).length;

  // Determine if lessons should appear locked
  const showLockedState = requiresSubscription || (!isEnrolled && !canAccessCourse);

  const renderLessonItem = (lesson: Lesson, index: number) => {
    const isLocked = showLockedState;
    const isClickable = canAccessCourse && isEnrolled;
    const isQuiz = lesson.lesson_type === 'quiz';

    const handleClick = () => {
      if (!isClickable) return;
      if (isQuiz && onQuizClick) {
        onQuizClick(lesson);
      } else {
        onLessonClick(lesson);
      }
    };

    return (
      <div
        key={lesson.id}
        className={`flex items-center gap-4 p-4 rounded-lg transition-colors ${
          isClickable ? 'hover:bg-muted/50 cursor-pointer' : 'opacity-75'
        } ${isLocked ? 'bg-muted/20' : ''} ${isQuiz && isClickable ? 'hover:bg-primary/5 border border-transparent hover:border-primary/20' : ''}`}
        onClick={handleClick}
      >
        {/* Completion status or lock icon */}
        <div className="flex-shrink-0">
          {isLocked ? (
            <Lock className="h-5 w-5 text-muted-foreground" />
          ) : lesson.completed ? (
            <CheckCircle2 className="h-5 w-5 text-success" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </div>

        {/* Lesson info */}
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm truncate ${isLocked ? 'text-muted-foreground' : ''}`}>
            {index + 1}. {lesson.title}
          </p>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs px-2 py-0 h-5">
              {lessonTypeIcons[lesson.lesson_type || 'video']}
              <span className="ml-1">{lessonTypeLabels[lesson.lesson_type || 'video']}</span>
            </Badge>
            {(() => {
              const meta = lessonMeta(lesson);
              if (!meta) return null;
              const isVideo = lesson.lesson_type === 'video' || lesson.lesson_type === 'scorm';
              return (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  {isVideo && <Clock className="h-3 w-3" />}
                  {meta}
                </span>
              );
            })()}
          </div>
        </div>

        {/* Lock/Preview indicator */}
        {isLocked ? (
          <Badge variant="secondary" className="text-xs bg-muted">
            <Lock className="h-3 w-3 mr-1" />
            Locked
          </Badge>
        ) : !isEnrolled ? (
          <Badge variant="secondary" className="text-xs">Preview</Badge>
        ) : null}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">Course content</CardTitle>
          <div className="text-sm text-muted-foreground">
            {hasModules ? `${modules.length} modules • ` : ''}
            {totalLessons} lessons • {formatDuration(totalDuration)}
            {canAccessCourse && completedCount > 0 && (
              <span className="text-success ml-2">
                ({completedCount}/{totalLessons} complete)
              </span>
            )}
          </div>
        </div>
        {requiresSubscription && (
          <p className="text-sm text-muted-foreground mt-2 flex items-center gap-2">
            <Lock className="h-4 w-4" />
            Subscribe to unlock all lessons
          </p>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        {hasModules ? (
          <Accordion type="multiple" className="space-y-2" defaultValue={modules.map(m => m.id)}>
            {modules.map((module) => {
              const moduleLessons = lessons.filter(l => l.module_id === module.id);
              const moduleCompleted = moduleLessons.filter(l => l.completed).length;
              const moduleDuration = videoTotalMinutes(moduleLessons);

              return (
                <AccordionItem 
                  key={module.id} 
                  value={module.id}
                  className="border rounded-lg px-4"
                >
                  <AccordionTrigger className="hover:no-underline py-4">
                    <div className="flex items-center justify-between w-full pr-4">
                      <div className="text-left">
                        <h4 className="font-semibold">{module.title}</h4>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {moduleLessons.length} lessons • {formatDuration(moduleDuration)}
                          {canAccessCourse && moduleCompleted > 0 && (
                            <span className="text-success ml-2">
                              ({moduleCompleted}/{moduleLessons.length} complete)
                            </span>
                          )}
                        </p>
                      </div>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pb-4">
                    <div className="space-y-1">
                      {moduleLessons
                        .sort((a, b) => a.order_index - b.order_index)
                        .map((lesson, idx) => renderLessonItem(lesson, idx))}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        ) : (
          <div className="space-y-1 border rounded-lg p-2">
            {lessons
              .sort((a, b) => a.order_index - b.order_index)
              .map((lesson, idx) => renderLessonItem(lesson, idx))}
          </div>
        )}

        {lessons.length === 0 && (
          <p className="text-center text-muted-foreground py-8">
            Course content coming soon
          </p>
        )}
      </CardContent>
    </Card>
  );
}
