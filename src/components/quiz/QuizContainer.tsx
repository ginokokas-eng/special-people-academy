import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { QuizPlayer, type AttemptQuestion, type SubmitResult } from './QuizPlayer';
import { QUIZ_LOCKOUT_NEXT_STEP } from './quizCopy';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Loader2, Play, Clock, Target, Award, RotateCcw, Lock, CheckCircle2, AlertTriangle } from '@/components/icons';
import { toast } from 'sonner';
import { attemptsRemaining as remainingFor, quizRpcErrorMessage } from '@/lib/quizAttempt';

interface QuizContainerProps {
  lessonId: string;
  courseId: string;
  coursePassMark?: number;
  onQuizComplete?: (passed: boolean) => void;
}

interface QuizAttempt {
  id: string;
  score: number;
  passed: boolean;
  attempted_at: string;
}

/** Live attempt session handed out by start_quiz_attempt. */
interface AttemptSession {
  session_id: string;
  attempts_used: number;
  attempts_allowed: number | null;
  unlimited: boolean;
  passing_score: number;
}

export function QuizContainer({ 
  lessonId, 
  courseId, 
  coursePassMark = 80,
  onQuizComplete 
}: QuizContainerProps) {
  const { user } = useAuth();

  const [quizTitle, setQuizTitle] = useState('');
  const [session, setSession] = useState<AttemptSession | null>(null);
  const [questions, setQuestions] = useState<AttemptQuestion[]>([]);
  const [attempts, setAttempts] = useState<QuizAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [started, setStarted] = useState(false);
  const [bestScore, setBestScore] = useState<number | null>(null);
  const [hasPassed, setHasPassed] = useState(false);
  // True for "knowledge check" lessons that have no authored questions.
  const [isInformational, setIsInformational] = useState(false);
  // True for ungraded self-checks (passing_score = 0) e.g. Pre-Course checks.
  const [isUngraded, setIsUngraded] = useState(false);
  const [infoCompleted, setInfoCompleted] = useState(false);
  const [marking, setMarking] = useState(false);
  /** Set when the server refuses a new attempt because the limit is spent. */
  const [lockedAllowed, setLockedAllowed] = useState<number | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    fetchQuizData();
  }, [lessonId, user]);

  const checkCourseCompletion = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('issue-certificate', {
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

  const loadInformationalProgress = async () => {
    setIsInformational(true);
    if (!user) return;
    const { data: progress } = await supabase
      .from('lesson_progress')
      .select('completed')
      .eq('lesson_id', lessonId)
      .eq('user_id', user.id)
      .maybeSingle();
    setInfoCompleted(!!progress?.completed);
  };

  const fetchQuizData = async (opts?: { silent?: boolean }) => {
    if (!lessonId) return;
    if (!opts?.silent) setLoading(true);

    try {
      // Quiz shell only — questions and answers now come from the server RPCs.
      const { data: quizData } = await supabase
        .from('quizzes')
        .select('id, title, passing_score, attempts_allowed, lesson_id')
        .eq('lesson_id', lessonId)
        .maybeSingle();

      // Informational lesson: no quiz row at all
      if (!quizData) {
        await loadInformationalProgress();
        return;
      }

      setQuizTitle(quizData.title);

      // Attempt history (best score, pass state) still read directly.
      if (user) {
        const { data: attemptsData } = await supabase
          .from('quiz_attempts')
          .select('id, score, passed, attempted_at')
          .eq('quiz_id', quizData.id)
          .eq('user_id', user.id)
          .order('attempted_at', { ascending: false });

        if (attemptsData && attemptsData.length > 0) {
          setAttempts(attemptsData);
          setBestScore(Math.max(...attemptsData.map((a) => a.score)));
          setHasPassed(attemptsData.some((a) => a.passed));
        } else {
          setAttempts([]);
        }
      }

      // Open (or resume) the server-side attempt session.
      const { data: startRows, error: startError } = await supabase.rpc('start_quiz_attempt', {
        _quiz_id: quizData.id,
      });

      if (startError) {
        const msg = startError.message || '';
        if (/quiz_has_no_questions/.test(msg)) {
          await loadInformationalProgress();
          return;
        }
        if (/attempt_limit_reached/.test(msg)) {
          const allowed = quizData.attempts_allowed ?? null;
          setLockedAllowed(allowed);
          setIsUngraded((quizData.passing_score ?? 0) === 0);
          setSession({
            session_id: '',
            attempts_used: attempts.length,
            attempts_allowed: allowed,
            unlimited: false,
            passing_score: quizData.passing_score || coursePassMark,
          });
          return;
        }
        toast.error(quizRpcErrorMessage(msg));
        setUnavailable(true);
        return;
      }

      const start = Array.isArray(startRows) ? startRows[0] : startRows;
      if (!start) {
        setUnavailable(true);
        return;
      }

      const ungraded = (start.passing_score ?? 0) === 0;
      setIsUngraded(ungraded);
      const live: AttemptSession = {
        session_id: start.session_id,
        attempts_used: start.attempts_used ?? 0,
        attempts_allowed: start.attempts_allowed ?? null,
        unlimited: !!start.unlimited,
        passing_score: ungraded ? 0 : start.passing_score || coursePassMark,
      };
      setSession(live);

      // Questions with options already shuffled, correct answers withheld.
      const { data: paper, error: paperError } = await supabase.rpc('get_quiz_for_attempt', {
        _session_id: live.session_id,
      });
      if (paperError) throw paperError;

      const payload = (paper ?? {}) as {
        title?: string;
        questions?: { question_id: string; question_text: string; options: string[] }[];
      };
      if (payload.title) setQuizTitle(payload.title);
      const served = (payload.questions || []).map((q) => ({
        question_id: q.question_id,
        question_text: q.question_text,
        options: Array.isArray(q.options) ? q.options : [],
      }));
      if (served.length === 0) {
        await loadInformationalProgress();
        return;
      }
      setQuestions(served);
    } catch (error) {
      console.error('Error fetching quiz:', error);
      toast.error('Failed to load quiz');
      setUnavailable(true);
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

  /** Server-side check of a single answer (instant reveal preserved). */
  const handleCheckAnswer = async (questionId: string, displayedIndex: number) => {
    if (!session?.session_id) throw new Error('This quiz attempt has expired. Please start again.');
    const { data, error } = await supabase.rpc('check_quiz_answer', {
      _session_id: session.session_id,
      _question_id: questionId,
      _selected: displayedIndex,
    });
    if (error) throw new Error(quizRpcErrorMessage(error.message));
    const row = Array.isArray(data) ? data[0] : data;
    if (!row) throw new Error('Could not check that answer.');
    return {
      is_correct: !!row.is_correct,
      correct_displayed_index:
        typeof row.correct_displayed_index === 'number' ? row.correct_displayed_index : null,
      explanation: row.explanation ?? null,
    };
  };

  /** Server-side grading. All scoring and lesson completion happens in the RPC. */
  const handleSubmit = async (answers: Record<string, number>): Promise<SubmitResult | null> => {
    if (!session?.session_id) {
      toast.error('This quiz attempt has expired. Please start again.');
      return null;
    }
    try {
      const { data, error } = await supabase.rpc('submit_quiz_attempt', {
        _session_id: session.session_id,
        _answers: answers,
      });
      if (error) {
        toast.error(quizRpcErrorMessage(error.message));
        await fetchQuizData({ silent: true });
        return null;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) {
        toast.error('Failed to save quiz result');
        return null;
      }

      const score = row.score ?? 0;
      const passed = !!row.passed;
      if (bestScore === null || score > bestScore) setBestScore(score);

      if (passed) {
        setHasPassed(true);
        toast.success('Quiz passed! Lesson marked as complete.');
        await checkCourseCompletion();
      }

      // Refresh history/attempt counts for the intro screen (silent: the
      // results card must stay on screen).
      await fetchQuizData({ silent: true });
      onQuizComplete?.(passed);

      return {
        score,
        passed,
        correct_count: row.correct_count ?? 0,
        total: row.total ?? 0,
      };
    } catch (error) {
      console.error('Error saving quiz attempt:', error);
      toast.error('Failed to save quiz result');
      return null;
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

  const isLockedOut = lockedAllowed !== null && !hasPassed;

  if (unavailable || (!session && questions.length === 0)) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardContent className="py-12 text-center">
          <p className="text-muted-foreground">Quiz not available</p>
        </CardContent>
      </Card>
    );
  }

  const passingScore = session?.passing_score ?? coursePassMark;
  const attemptsAllowed = isLockedOut
    ? lockedAllowed
    : session && !session.unlimited
      ? session.attempts_allowed
      : null;
  const attemptsUsed = session?.attempts_used ?? attempts.length;
  const attemptsLeft = isLockedOut ? 0 : remainingFor(attemptsAllowed, attemptsUsed);

  // Show quiz intro/start screen
  if (!started || questions.length === 0) {
    return (
      <Card className="max-w-2xl mx-auto">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{quizTitle}</CardTitle>
          <CardDescription>
            {isUngraded
              ? 'A quick self-check of your starting point — this is not graded and does not affect your final grade or certificate.'
              : 'Test your knowledge and understanding of the material'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Quiz info */}
          <div className={`grid gap-4 text-center ${isUngraded ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 sm:grid-cols-3'}`}>
            {!isUngraded && (
              <div className="p-4 rounded-lg bg-muted/30">
                <Target className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-semibold">{passingScore}%</div>
                <div className="text-xs text-muted-foreground">Pass mark</div>
              </div>
            )}
            {questions.length > 0 && (
              <div className="p-4 rounded-lg bg-muted/30">
                <Clock className="h-6 w-6 mx-auto mb-2 text-primary" />
                <div className="text-2xl font-semibold">{questions.length}</div>
                <div className="text-xs text-muted-foreground">Questions</div>
              </div>
            )}
            <div className="p-4 rounded-lg bg-muted/30">
              <RotateCcw className="h-6 w-6 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-semibold">
                {attemptsAllowed !== null ? attemptsAllowed : '∞'}
              </div>
              <div className="text-xs text-muted-foreground">
                {attemptsAllowed !== null ? 'Attempts allowed' : 'Unlimited attempts'}
              </div>
            </div>
          </div>

          {/* Attempts remaining — only when attempts are limited */}
          {attemptsAllowed !== null && !hasPassed && (
            <div className="text-center text-sm text-muted-foreground">
              {attemptsLeft} of {attemptsAllowed} attempt{attemptsAllowed === 1 ? '' : 's'} remaining
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
                You have used all {attemptsAllowed} allowed attempts without reaching the {passingScore}% pass mark.{' '}
                {QUIZ_LOCKOUT_NEXT_STEP}
              </AlertDescription>
            </Alert>
          )}

          {/* Instructions */}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Answer each question and receive instant feedback</p>
            {isUngraded ? (
              <p>• This check is not graded — it won’t affect your final grade, certificate, or completion</p>
            ) : (
              <p>• You must score {passingScore}% or higher to pass</p>
            )}
            <p>
              {isUngraded
                ? '• Answer honestly — it simply helps identify your starting point'
                : attemptsAllowed !== null
                  ? `• You have ${attemptsAllowed} attempt${attemptsAllowed === 1 ? '' : 's'} for this assessment`
                  : '• You can retake this quiz as many times as needed'}
            </p>
          </div>
        </CardContent>
        <div className="p-6 pt-0 flex flex-col items-center gap-3">
          {/* Final attempt is unmissable before starting — emphasis, not a dialog */}
          {!isLockedOut && !hasPassed && attemptsLeft === 1 && (
            <p className="text-sm font-semibold text-warning bg-warning/10 border border-warning/40 rounded-md px-3 py-2 text-center">
              This is your last attempt
            </p>
          )}
          {isLockedOut || questions.length === 0 ? (
            <Button size="lg" variant="outline" disabled>
              <Lock className="h-4 w-4 mr-2" />
              Attempts exhausted
            </Button>
          ) : (
            <Button size="lg" onClick={() => setStarted(true)} disabled={hasPassed && attemptsLeft === 0}>
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
      quizTitle={quizTitle}
      questions={questions}
      passingScore={passingScore}
      onCheckAnswer={handleCheckAnswer}
      onSubmit={handleSubmit}
      onRetry={() => setStarted(true)}
      previousAttempts={attempts.length}
      attemptsRemaining={attemptsLeft}
    />
  );
}
