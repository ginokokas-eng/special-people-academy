import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { QuizContainer } from '@/components/quiz/QuizContainer';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, BookOpen } from '@/components/icons';

export default function QuizPage() {
  const { courseId } = useParams<{ courseId: string }>();
  const [searchParams] = useSearchParams();
  const lessonId = searchParams.get('lesson');
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();

  const [courseName, setCourseName] = useState('');
  const [lessonName, setLessonName] = useState('');
  const [coursePassMark, setCoursePassMark] = useState(80);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (courseId && lessonId) {
      fetchCourseAndLesson();
    }
  }, [courseId, lessonId]);

  const fetchCourseAndLesson = async () => {
    try {
      // Fetch course
      const { data: courseData } = await supabase
        .from('courses')
        .select('title, pass_mark')
        .eq('id', courseId)
        .single();

      if (courseData) {
        setCourseName(courseData.title);
        setCoursePassMark(courseData.pass_mark || 80);
      }

      // Fetch lesson
      const { data: lessonData } = await supabase
        .from('lessons')
        .select('title')
        .eq('id', lessonId)
        .single();

      if (lessonData) {
        setLessonName(lessonData.title);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleQuizComplete = (passed: boolean) => {
    // Passing completes the lesson (handled in QuizContainer). Return the
    // learner to the course menu with the finished lesson highlighted.
    if (passed && courseId && lessonId) {
      setTimeout(() => {
        navigate(`/courses/${courseId}/learn?complete=${lessonId}`);
      }, 2000);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="flex items-center justify-center h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  if (!user) {
    navigate('/auth');
    return null;
  }

  if (!lessonId) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container py-20 text-center">
          <h2 className="text-2xl font-semibold mb-4">Quiz not found</h2>
          <Button onClick={() => navigate(`/courses/${courseId}/learn`)}>
            Back to the course menu
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Learner chrome: no marketing navbar or footer inside a lesson */}
      <div className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() =>
                navigate(`/courses/${courseId}/learn${lessonId ? `?lesson=${lessonId}` : ''}`)
              }
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to lesson
            </Button>
            <div className="h-4 w-px bg-border" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <BookOpen className="h-4 w-4" />
              <span>{courseName}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quiz Content */}
      <div className="container py-8 lg:py-12">
        <QuizContainer
          lessonId={lessonId}
          courseId={courseId || ''}
          coursePassMark={coursePassMark}
          onQuizComplete={handleQuizComplete}
        />
      </div>
    </div>
  );
}
