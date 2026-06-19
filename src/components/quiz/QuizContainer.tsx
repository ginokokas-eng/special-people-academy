import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { QuizPlayer } from './QuizPlayer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Play, Clock, Target, Award, RotateCcw, Lock, CheckCircle2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';

interface QuizContainerProps {
  lessonId: string;
  courseId: string;
  coursePassMark?: number;
  onQuizComplete?: (passed: boolean) => void;
}

interface Quiz {
  id: string;
  title: string;
  passing_score: number;
  attempts_allowed: number | null;
}

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  order_index: number;
}

interface QuizAttempt {
  id: string;
  score: number;
  passed: boolean;
  attempted_at: string;
}

export function QuizContainer({ 
  lessonId, 
  courseId, 
  coursePassMark = 80,
  onQuizComplete 
}: QuizContainerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [questions, setQuestions] = useState<QuizQuestion[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [hasPassed, setHasPassed] = useState(false);
  // True for "knowledge check" lessons that have no authored questions.
  const [isInformational, setIsInformational] = useState(false);
  const [infoCompleted, setInfoCompleted] = useState(false);
  const [marking, setMarking] = useState(false);

  useEffect(() => {
    fetchQuizData();
  }, [lessonId, user]);

  const checkCourseCompletion = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('check-course-completion', {
        body: { course_id: courseId },
      });
      if (!error && data?.completed && data?.certificate_id) {
        toast.success('🎉 Congratulations! You have completed the course and earned a certificate!', {
          duration: 5000,
        });
      }
    } catch (certError) {
      console.log('Certificate check error (non-fatal):', certError);
    }
  };

  const fetchQuizData = async () => {
    if (!lessonId) return;

    try {
      // Fetch quiz (may not exist for informational knowledge-check lessons)
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('*')
        .eq('lesson_id', lessonId)
        .maybeSingle();

      // Informational lesson: no quiz row at all
      if (!quizData) {
        setIsInformational(true);
        if (user) {
          const { data: progress } = await supabase
            .from('lesson_progress')
            .select('completed')
            .eq('lesson_id', lessonId)
            .eq('user_id', user.id)
            .maybeSingle();
          setInfoCompleted(!!progress?.completed);
        }
        return;
      }

      const loadedQuiz: Quiz = {
        ...quizData,
        passing_score: quizData.passing_score || coursePassMark,
        attempts_allowed: quizData.attempts_allowed ?? null,
      };
      setQuiz(loadedQuiz);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizData.id)
        .order('order_index');

      if (questionsError) throw questionsError;

      // No authored questions -> treat as informational check
      if (!questionsData || questionsData.length === 0) {
        setIsInformational(true);
        if (user) {
          const { data: progress } = await supabase
            .from('lesson_progress')
            .select('completed')
            .eq('lesson_id', lessonId)
            .eq('user_id', user.id)
            .maybeSingle();
          setInfoCompleted(!!progress?.completed);
        }
        return;
      }

      const parsedQuestions = questionsData.map(q => ({
        ...q,
        options: Array.isArray(q.options) ? q.options as string[] : JSON.parse(q.options as string)
      }));
      setQuestions(parsedQuestions);

      // Fetch previous attempts if user is logged in
      if (user) {
        const { data: attemptsData } = await supabase
          .from('quiz_attempts')
          .select('*')
          .eq('quiz_id', quizData.id)
          .eq('user_id', user.id)
          .order('attempted_at', { ascending: false });

        if (attemptsData && attemptsData.length > 0) {
          setAttempts(attemptsData);
          const best = Math.max(...attemptsData.map(a => a.score));
          setBestScore(best);
          setHasPassed(attemptsData.some(a => a.passed));
        }
      }
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast.error('Failed to load quiz');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkInformationalComplete = async () => {
    if (!user) return;
    setMarking(true);
    try {
      const { error } = await supabase
        .from('lesson_progress')
        .upsert({
          lesson_id: lessonId,
          user_id: user.id,
          completed: true,
          completed_at: new Date().toISOString(),
        }, { onConflict: 'lesson_id,user_id' });

      if (error) throw error;
      setInfoCompleted(true);
      toast.success('Marked as complete.');
      await checkCourseCompletion();
      onQuizComplete?.(true);
    } catch (error) {
      console.error('Error marking complete:', error);
      toast.error('Failed to update progress');
    } finally {
      setMarking(false);
    }
  };

  const handleQuizComplete = async (passed: boolean, score: number, answers: Record<string, number>) => {
    if (!user || !quiz) return;

    try {
      // Save attempt (backend trigger also enforces the attempt limit)
      const { error } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quiz.id,
          user_id: user.id,
          score,
          passed,
          answers
        });

      if (error) {
        // Attempt-limit violations are raised by the DB trigger
        if ((error as any).code === '23514' || /attempt limit/i.test(error.message)) {
          toast.error('You have used all your allowed attempts for this quiz.');
        } else {
          throw error;
        }
        await fetchQuizData();
        return;
      }

      // Update best score
      if (bestScore === null || score > bestScore) {
        setBestScore(score);
      }

      if (passed) {
        setHasPassed(true);

        // Mark lesson as completed
        await supabase
          .from('lesson_progress')
          .upsert({
            lesson_id: lessonId,
            user_id: user.id,
            completed: true,
            completed_at: new Date().toISOString()
          }, {
            onConflict: 'lesson_id,user_id'
          });

        toast.success('Quiz passed! Lesson marked as complete.');
        await checkCourseCompletion();
      }

      // Refresh attempts
      await fetchQuizData();

      // Notify parent
      onQuizComplete?.(passed);
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
      toast.error('Failed to save quiz result');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Informational knowledge check (no authored questions) -> completable
  if (isInformational) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Knowledge Check</CardTitle>
          <CardDescription>
            This is a reflective checkpoint — review the module material before continuing.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {infoCompleted ? (
            <div className="flex items-center justify-center gap-2 p-4 rounded-lg bg-success/10 text-success">
              <CheckCircle2 className="h-5 w-5" />
              <span className="font-medium">Completed</span>
            </div>
          ) : (
            <div className="flex justify-center">
              <Button size="lg" onClick={handleMarkInformationalComplete} disabled={marking}>
                {marking ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle2 className="h-4 w-4 mr-2" />}
                Mark as complete & continue
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  if (!quiz || questions.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Quiz not available</p>
        </CardContent>
      </Card>
    );
  }

  const attemptsAllowed = quiz.attempts_allowed && quiz.attempts_allowed > 0 ? quiz.attempts_allowed : null;
  const attemptsUsed = attempts.length;
  const attemptsRemaining = attemptsAllowed !== null ? Math.max(0, attemptsAllowed - attemptsUsed) : null;
  const isLockedOut = attemptsRemaining === 0 && !hasPassed;

  // Show quiz intro/start screen
  if (!started) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{quiz.title}</CardTitle>
          <CardDescription>
            Test your knowledge and understanding of the material
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quiz info */}
          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="p-4 rounded-lg bg-muted/30">
              <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-semibold">{quiz.passing_score}%</div>
              <div className="text-xs text-muted-foreground">Pass mark</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-semibold">{questions.length}</div>
              <div className="text-xs text-muted-foreground">Questions</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30">
              <RotateCcw className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-semibold">
                {attemptsAllowed !== null ? attemptsAllowed : '∞'}
              </div>
              <div className="text-xs text-muted-foreground">
                {attemptsAllowed !== null ? 'Attempts allowed' : 'Retakes allowed'}
              </div>
            </div>
          </div>

          {/* Attempts remaining */}
          {attemptsAllowed !== null && !hasPassed && (
            <div className="text-center text-sm text-muted-foreground">
              {attemptsRemaining} of {attemptsAllowed} attempt{attemptsAllowed === 1 ? '' : 's'} remaining
            </div>
          )}

          {/* Previous attempts */}
          {attempts.length > 0 && (
            <div className="p-4 rounded-lg border bg-card">
              <h4 className="font-medium mb-3">Your previous attempts</h4>
              <div className="space-y-2">
                {attempts.slice(0, 3).map((attempt) => (
                  <div key={attempt.id} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {new Date(attempt.attempted_at).toLocaleDateString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className={attempt.passed ? 'text-success' : 'text-destructive'}>
                        {attempt.score}%
                      </span>
                      <Badge variant={attempt.passed ? 'default' : 'secondary'} className="text-xs">
                        {attempt.passed ? 'Passed' : 'Failed'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
              {bestScore !== null && (
                <div className="mt-3 pt-3 border-t flex items-center justify-between">
                  <span className="text-sm font-medium">Best score</span>
                  <span className={`font-semibold ${hasPassed ? 'text-success' : 'text-foreground'}`}>
                    {bestScore}%
                  </span>
                </div>
              )}
            </div>
          )}

          {/* Status badge */}
          {hasPassed && (
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-success/10 text-success">
              <Award className="h-5 w-5" />
              <span className="font-medium">You have passed this quiz</span>
            </div>
          )}

          {/* Locked out — escalation */}
          {isLockedOut && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>No attempts remaining</AlertTitle>
              <AlertDescription>
                You have used all {attemptsAllowed} allowed attempts without reaching the {quiz.passing_score}% pass mark.
                Please contact your trainer or clinical sign-off lead for support before this assessment can be reopened.
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Answer each question and receive instant feedback</p>
            <p>• You must score {quiz.passing_score}% or higher to pass</p>
            <p>
              {attemptsAllowed !== null
                ? `• You have ${attemptsAllowed} attempt${attemptsAllowed === 1 ? '' : 's'} for this assessment`
                : '• You can retake this quiz as many times as needed'}
            </p>
          </div>
        </CardContent>
        <div className="p-6 pt-0 flex justify-center">
          {isLockedOut ? (
            <Button size="lg" variant="outline" disabled>
              <Lock className="h-4 w-4 mr-2" />
              Attempts exhausted
            </Button>
          ) : (
            <Button size="lg" onClick={() => setStarted(true)} disabled={hasPassed && attemptsRemaining === 0}>
              <Play className="h-4 w-4 mr-2" />
              {attempts.length > 0 ? 'Retake Quiz' : 'Start Quiz'}
            </Button>
          )}
        </div>
      </Card>
    );
  }

  return (
    <QuizPlayer
      quizId={quiz.id}
      quizTitle={quiz.title}
      questions={questions}
      passingScore={quiz.passing_score}
      onComplete={handleQuizComplete}
      onRetry={() => setStarted(true)}
      previousAttempts={attempts.length}
    />
  );
}
