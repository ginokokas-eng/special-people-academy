import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { 
  Play, 
  Clock, 
  Users, 
  CheckCircle2, 
  Circle, 
  BookOpen,
  Award,
  Loader2,
  ArrowLeft
} from 'lucide-react';
import { toast } from 'sonner';

interface Lesson {
  id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  duration_minutes: number;
  order_index: number;
  completed?: boolean;
}

interface Course {
  id: string;
  title: string;
  description: string | null;
  category: string;
  thumbnail_url: string | null;
  duration_minutes: number;
  level: string;
}

interface Enrollment {
  id: string;
  enrolled_at: string;
  completed_at: string | null;
}

export default function CourseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const [course, setCourse] = useState<Course | null>(null);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [loading, setLoading] = useState(true);
  const [enrolling, setEnrolling] = useState(false);
  const [currentLesson, setCurrentLesson] = useState<Lesson | null>(null);

  useEffect(() => {
    if (id) {
      fetchCourseData();
    }
  }, [id, user]);

  const fetchCourseData = async () => {
    if (!id) return;

    try {
      // Fetch course
      const { data: courseData, error: courseError } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (courseError) throw courseError;
      setCourse(courseData);

      // Fetch lessons
      const { data: lessonsData } = await supabase
        .from('lessons')
        .select('*')
        .eq('course_id', id)
        .order('order_index');

      // Fetch lesson progress and enrollment only if user is logged in
      if (user) {
        const { data: progressData } = await supabase
          .from('lesson_progress')
          .select('lesson_id, completed')
          .eq('user_id', user.id);

        const progressMap = new Map(progressData?.map(p => [p.lesson_id, p.completed]) || []);
        
        const lessonsWithProgress = (lessonsData || []).map(lesson => ({
          ...lesson,
          completed: progressMap.get(lesson.id) || false,
        }));

        setLessons(lessonsWithProgress);
        
        // Set first incomplete lesson as current, or first lesson if all complete
        const firstIncomplete = lessonsWithProgress.find(l => !l.completed);
        setCurrentLesson(firstIncomplete || lessonsWithProgress[0] || null);

        // Fetch enrollment
        const { data: enrollmentData } = await supabase
          .from('enrollments')
          .select('*')
          .eq('user_id', user.id)
          .eq('course_id', id)
          .maybeSingle();

        setEnrollment(enrollmentData);
      } else {
        // Not logged in - just set lessons without progress
        setLessons((lessonsData || []).map(lesson => ({ ...lesson, completed: false })));
        setCurrentLesson((lessonsData || [])[0] || null);
        setEnrollment(null);
      }
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course');
    } finally {
      setLoading(false);
    }
  };

  const handleEnroll = async () => {
    if (!user || !course) return;
    
    setEnrolling(true);
    try {
      const { error } = await supabase
        .from('enrollments')
        .insert({
          user_id: user.id,
          course_id: course.id,
        });

      if (error) throw error;
      
      toast.success('Successfully enrolled!');
      fetchCourseData();
    } catch (error) {
      console.error('Error enrolling:', error);
      toast.error('Failed to enroll');
    } finally {
      setEnrolling(false);
    }
  };

  const handleLessonComplete = async (lessonId: string) => {
    if (!user) return;

    try {
      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          user_id: user.id,
          lesson_id: lessonId,
          completed: true,
          completed_at: new Date().toISOString(),
        });

      if (error) throw error;
      
      toast.success('Lesson completed!');
      fetchCourseData();
    } catch (error) {
      console.error('Error marking lesson complete:', error);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins} min`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const progress = lessons.length > 0 
    ? Math.round((lessons.filter(l => l.completed).length / lessons.length) * 100)
    : 0;

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  if (!course) {
    return (
      <DashboardLayout>
        <div className="text-center py-12">
          <h2 className="text-xl font-semibold mb-2">Course not found</h2>
          <Button onClick={() => navigate('/courses')}>Back to Courses</Button>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Back button */}
        <Button variant="ghost" onClick={() => navigate('/courses')} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Courses
        </Button>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Main content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Video player */}
            <div className="relative aspect-video bg-muted rounded-xl overflow-hidden">
              {currentLesson?.video_url ? (
                <iframe
                  src={currentLesson.video_url}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
                  <div className="text-center">
                    <Play className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">
                      {currentLesson ? 'No video available for this lesson' : 'Select a lesson to start'}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Current lesson info */}
            {currentLesson && enrollment && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>{currentLesson.title}</CardTitle>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDuration(currentLesson.duration_minutes)}
                    </p>
                  </div>
                  {!currentLesson.completed && (
                    <Button onClick={() => handleLessonComplete(currentLesson.id)}>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Complete
                    </Button>
                  )}
                </CardHeader>
                {currentLesson.description && (
                  <CardContent>
                    <p className="text-muted-foreground">{currentLesson.description}</p>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Course description */}
            <Card>
              <CardHeader>
                <CardTitle>About This Course</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{course.description}</p>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Course info card */}
            <Card>
              <CardContent className="pt-6">
                <Badge variant="secondary" className="mb-4">{course.category}</Badge>
                <h1 className="text-xl font-bold mb-2">{course.title}</h1>
                <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {formatDuration(course.duration_minutes || 0)}
                  </span>
                  <span className="flex items-center gap-1">
                    <BookOpen className="h-4 w-4" />
                    {lessons.length} lessons
                  </span>
                </div>
                <Badge variant="outline">{course.level}</Badge>

              {user ? (
                  enrollment ? (
                    <div className="mt-6 space-y-3">
                      <div className="flex justify-between text-sm">
                        <span>Progress</span>
                        <span className="font-medium">{progress}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                      {progress === 100 && (
                        <Button className="w-full mt-4" onClick={() => navigate('/certificates')}>
                          <Award className="h-4 w-4 mr-2" />
                          View Certificate
                        </Button>
                      )}
                    </div>
                  ) : (
                    <Button 
                      className="w-full mt-6" 
                      onClick={handleEnroll}
                      disabled={enrolling}
                    >
                      {enrolling ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Enrolling...
                        </>
                      ) : (
                        'Enroll Now'
                      )}
                    </Button>
                  )
                ) : (
                  <Button 
                    className="w-full mt-6" 
                    onClick={() => navigate('/auth')}
                  >
                    Sign In to Enroll
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Lessons list */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Course Content</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Accordion type="single" collapsible className="w-full">
                  {lessons.map((lesson, index) => (
                    <AccordionItem key={lesson.id} value={lesson.id} className="border-0">
                      <AccordionTrigger 
                        className={`px-4 hover:no-underline hover:bg-muted/50 ${
                          currentLesson?.id === lesson.id ? 'bg-primary/5' : ''
                        }`}
                        onClick={(e) => {
                          if (enrollment) {
                            e.preventDefault();
                            setCurrentLesson(lesson);
                          }
                        }}
                      >
                        <div className="flex items-center gap-3 text-left">
                          {lesson.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-success flex-shrink-0" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                          )}
                          <div>
                            <p className="font-medium text-sm">{index + 1}. {lesson.title}</p>
                            <p className="text-xs text-muted-foreground">
                              {formatDuration(lesson.duration_minutes)}
                            </p>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pl-12">
                        <p className="text-sm text-muted-foreground">
                          {lesson.description || 'No description available'}
                        </p>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                {lessons.length === 0 && (
                  <p className="px-4 py-8 text-center text-muted-foreground">
                    No lessons available yet
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
