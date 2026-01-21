import { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { QuizContainer } from '@/components/quiz/QuizContainer';
import { Button } from '@/components/ui/button';
import { Loader2, ArrowLeft, BookOpen } from 'lucide-react';

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
    // Could trigger course progress recalculation here if needed
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
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
        <Navbar />
        <div className="container py-20 text-center">
          <h2 className="text-2xl font-semibold mb-4">Quiz not found</h2>
          <Button onClick={() => navigate(`/courses/${courseId}`)}>
            Back to Course
          </Button>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <div className="border-b bg-card">
        <div className="container py-4">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(`/courses/${courseId}`)}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Course
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
        <div className="mb-6 text-center">
          <h1 className="text-2xl font-bold mb-2">{lessonName}</h1>
          <p className="text-muted-foreground">Complete this quiz to continue</p>
        </div>

        <QuizContainer
          lessonId={lessonId}
          courseId={courseId || ''}
          coursePassMark={coursePassMark}
          onQuizComplete={handleQuizComplete}
        />
      </div>

      <Footer />
    </div>
  );
}
