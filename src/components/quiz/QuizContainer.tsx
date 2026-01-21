import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { QuizPlayer } from './QuizPlayer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Loader2, Play, Clock, Target, Award, RotateCcw } from 'lucide-react';
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

  useEffect(() => {
    fetchQuizData();
  }, [lessonId, user]);

  const fetchQuizData = async () => {
    if (!lessonId) return;

    try {
      // Fetch quiz
      const { data: quizData, error: quizError } = await supabase
        .from('quizzes')
        .select('*')
        .eq('lesson_id', lessonId)
        .single();

      if (quizError) throw quizError;

      // Use course pass mark if quiz doesn't have one
      const quiz = {
        ...quizData,
        passing_score: quizData.passing_score || coursePassMark
      };
      setQuiz(quiz);

      // Fetch questions
      const { data: questionsData, error: questionsError } = await supabase
        .from('quiz_questions')
        .select('*')
        .eq('quiz_id', quizData.id)
        .order('order_index');

      if (questionsError) throw questionsError;

      // Parse options from JSON
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

  const handleQuizComplete = async (passed: boolean, score: number, answers: Record<string, number>) => {
    if (!user || !quiz) return;

    try {
      // Save attempt
      const { error } = await supabase
        .from('quiz_attempts')
        .insert({
          quiz_id: quiz.id,
          user_id: user.id,
          score,
          passed,
          answers
        });

      if (error) throw error;

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
      }

      // Refresh attempts
      fetchQuizData();
      
      // Notify parent
      onQuizComplete?.(passed);
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
      toast.error('Failed to save quiz result');
    }
  };

  const handleRetry = () => {
    setStarted(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
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
              <div className="text-2xl font-semibold">∞</div>
              <div className="text-xs text-muted-foreground">Retakes allowed</div>
            </div>
          </div>

          {/* Previous attempts */}
          {attempts.length > 0 && (
            <div className="p-4 rounded-lg border bg-card">
              <h4 className="font-medium mb-3">Your previous attempts</h4>
              <div className="space-y-2">
                {attempts.slice(0, 3).map((attempt, index) => (
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

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Answer each question and receive instant feedback</p>
            <p>• You must score {quiz.passing_score}% or higher to pass</p>
            <p>• You can retake this quiz as many times as needed</p>
          </div>
        </CardContent>
        <div className="p-6 pt-0 flex justify-center">
          <Button size="lg" onClick={() => setStarted(true)}>
            <Play className="h-4 w-4 mr-2" />
            {attempts.length > 0 ? 'Retake Quiz' : 'Start Quiz'}
          </Button>
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
