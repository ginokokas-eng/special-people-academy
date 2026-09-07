import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { QuizOption } from '@/components/native/QuizOption';
import { haptics } from '@/hooks/useHaptics';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  RotateCcw,
  Trophy,
  Target,
  Loader2,
} from '@/components/icons';
import { cn } from '@/lib/utils';
import { buildAnswersPayload } from '@/lib/quizAttempt';

/** A question as served by get_quiz_for_attempt — no correct answer present. */
export interface AttemptQuestion {
  question_id: string;
  question_text: string;
  /** Labels already permuted by the session's option_order. */
  options: string[];
}

export interface CheckAnswerResult {
  is_correct: boolean;
  correct_displayed_index: number | null;
  explanation: string | null;
}

export interface SubmitResult {
  score: number;
  passed: boolean;
  correct_count: number;
  total: number;
}

interface QuizPlayerProps {
  quizTitle: string;
  questions: AttemptQuestion[];
  passingScore: number;
  /** Server-side check for one answer (displayed index in, verdict out). */
  onCheckAnswer: (questionId: string, displayedIndex: number) => Promise<CheckAnswerResult>;
  /** Server-side grading of the whole attempt. Returns null on failure. */
  onSubmit: (answers: Record<string, number>) => Promise<SubmitResult | null>;
  onRetry: () => void;
  previousAttempts?: number;
  /** Attempts left including this one; 1 means this is the final attempt. */
  attemptsRemaining?: number | null;
}

export function QuizPlayer({
  quizTitle,
  questions,
  passingScore,
  onCheckAnswer,
  onSubmit,
  onRetry,
  previousAttempts = 0,
  attemptsRemaining = null,
}: QuizPlayerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  /** Per-question server verdicts, keyed by question_id. */
  const [verdicts, setVerdicts] = useState<Record<string, CheckAnswerResult>>({});
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [unansweredOpen, setUnansweredOpen] = useState(false);
  const [finalConfirmOpen, setFinalConfirmOpen] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const isFinalAttempt = attemptsRemaining === 1;
  const currentVerdict = currentQuestion ? verdicts[currentQuestion.question_id] : undefined;
  const revealed = !!currentVerdict;

  const handleAnswerSelect = (optionIndex: number) => {
    if (revealed) return; // Already checked
    haptics.selection();
    setSelectedAnswer(optionIndex);
  };

  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null || checking) return;
    setChecking(true);
    setCheckError(null);
    try {
      const verdict = await onCheckAnswer(currentQuestion.question_id, selectedAnswer);
      setAnswers((prev) => ({ ...prev, [currentQuestion.question_id]: selectedAnswer }));
      setVerdicts((prev) => ({ ...prev, [currentQuestion.question_id]: verdict }));
      // Haptics stay sparse: a win always confirms; a miss only buzzes when
      // there is no attempt left to fix it.
      if (verdict.is_correct) haptics.success();
      else if (isFinalAttempt) haptics.warning();
    } catch (error) {
      setCheckError(error instanceof Error ? error.message : 'Could not check that answer.');
    } finally {
      setChecking(false);
    }
  };

  /** Questions with no recorded answer, in authored order. */
  const unansweredIndexes = questions
    .map((q, i) => (answers[q.question_id] === undefined ? i : -1))
    .filter((i) => i >= 0);

  const submitAttempt = async () => {
    if (submitting) return;
    setSubmitting(true);
    try {
      const outcome = await onSubmit(buildAnswersPayload(answers));
      if (outcome) setResult(outcome);
    } finally {
      setSubmitting(false);
    }
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) {
      // Guard the irreversible step: unanswered questions first, then the
      // final-attempt confirmation when this really is the last attempt.
      if (unansweredIndexes.length > 0) {
        setUnansweredOpen(true);
        return;
      }
      if (isFinalAttempt) {
        setFinalConfirmOpen(true);
        return;
      }
      void submitAttempt();
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setCheckError(null);
    }
  };

  const goToFirstUnanswered = () => {
    const target = unansweredIndexes[0];
    setUnansweredOpen(false);
    if (target === undefined) return;
    setCurrentQuestionIndex(target);
    setSelectedAnswer(null);
    setCheckError(null);
  };

  const submitAnyway = () => {
    setUnansweredOpen(false);
    if (isFinalAttempt) {
      setFinalConfirmOpen(true);
      return;
    }
    void submitAttempt();
  };

  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswers({});
    setVerdicts({});
    setCheckError(null);
    setResult(null);
    onRetry();
  };

  // Results screen — every number comes from the server.
  if (result) {
    const { score, passed, correct_count: correctCount, total } = result;

    return (
      <Card className="max-w-2xl mx-auto" data-testid="quiz-result">
        <CardHeader className="text-center pb-2">
          <div className={cn(
            "w-20 h-20 rounded-full mx-auto mb-4 flex items-center justify-center",
            passed ? "bg-success/10" : "bg-destructive/10"
          )}>
            {passed ? (
              <Trophy className="h-10 w-10 text-success" />
            ) : (
              <Target className="h-10 w-10 text-destructive" />
            )}
          </div>
          <CardTitle className="text-2xl">
            {passed ? 'Congratulations! You passed!' : 'Keep trying!'}
          </CardTitle>
          <CardDescription>
            {passed 
              ? 'You have successfully completed this quiz.' 
              : `You need ${passingScore}% to pass. You can retake this quiz.`}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score display */}
          <div className="text-center">
            <div className={cn(
              "text-5xl font-bold mb-2",
              passed ? "text-success" : "text-destructive"
            )}>
              {score}%
            </div>
            <p className="text-muted-foreground">
              {correctCount} of {total} questions correct
            </p>
          </div>

          {/* Score breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-2xl font-semibold text-success">{correctCount}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-2xl font-semibold text-destructive">{total - correctCount}</div>
              <div className="text-sm text-muted-foreground">Incorrect</div>
            </div>
          </div>

          {/* Pass threshold indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Your score</span>
              {passingScore > 0 && <span>Pass mark: {passingScore}%</span>}
            </div>

            <div className="relative h-3 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn(
                  "absolute left-0 top-0 h-full rounded-full transition-all duration-500",
                  passed ? "bg-success" : "bg-destructive"
                )}
                style={{ width: `${score}%` }}
              />
              <div 
                className="absolute top-0 h-full w-0.5 bg-foreground/50"
                style={{ left: `${passingScore}%` }}
              />
            </div>
          </div>

          {/* Previous attempts */}
          {previousAttempts > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              Attempt {previousAttempts + 1}
            </p>
          )}
        </CardContent>
        <CardFooter className="flex justify-center gap-3">
          {!passed && (
            <Button onClick={handleRetry} variant="outline">
              <RotateCcw className="h-4 w-4 mr-2" />
              Retry Quiz
            </Button>
          )}
          {passed && (
            <Button onClick={() => window.history.back()}>
              Continue Learning
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }

  if (!currentQuestion) return null;

  const isScenario = currentQuestion.question_text.startsWith('SCENARIO:');

  return (
    <Card className="max-w-2xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <Badge variant="outline" className="text-xs">
            Question {currentQuestionIndex + 1} of {questions.length}
          </Badge>
          <Badge variant="secondary" className="text-xs">
            <Target className="h-3 w-3 mr-1" />
            Pass: {passingScore}%
          </Badge>
        </div>
        {/* One segment per question: checked-correct green, current violet,
            still ahead grey — position and score in a single glance. */}
        <div
          className="flex gap-1"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={questions.length}
          aria-valuenow={currentQuestionIndex + 1}
          aria-label={`Question ${currentQuestionIndex + 1} of ${questions.length}`}
        >
          {questions.map((q, i) => {
            const verdict = verdicts[q.question_id];
            return (
              <span
                key={q.question_id}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i === currentQuestionIndex
                    ? 'bg-primary'
                    : verdict?.is_correct
                      ? 'bg-[hsl(var(--success))]'
                      : verdict
                        ? 'bg-[hsl(var(--destructive))]'
                        : 'bg-muted',
                )}
              />
            );
          })}
        </div>
        <CardTitle className="text-lg mt-4">{quizTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scenario indicator */}
        {isScenario && (
          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Scenario Question
          </Badge>
        )}

        {/* Question */}
        <div className={cn(
          "p-4 rounded-lg",
          isScenario ? "bg-accent/5 border border-accent/20" : "bg-muted/30"
        )}>
          <p className="font-medium text-lg">
            {isScenario
              ? currentQuestion.question_text.replace('SCENARIO:', '').trim()
              : currentQuestion.question_text}
          </p>
        </div>

        {/* Options — 68dp targets, whole row tappable. */}
        <div className="space-y-2.5">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = currentVerdict?.correct_displayed_index === index;
            const state = !revealed
              ? isSelected
                ? 'selected'
                : 'idle'
              : isCorrect
                ? 'correct'
                : isSelected
                  ? 'incorrect'
                  : 'idle';
            return (
              <QuizOption
                key={index}
                letter={String.fromCharCode(65 + index)}
                text={option}
                state={state}
                disabled={revealed || checking}
                onSelect={() => handleAnswerSelect(index)}
                testId={`quiz-option-${index}`}
              />
            );
          })}
        </div>

        {/* Check failed */}
        {checkError && !revealed && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{checkError}</AlertDescription>
          </Alert>
        )}

        {/* Feedback — verdict and explanation come from the server */}
        {currentVerdict && (
          <Alert className={cn(
            currentVerdict.is_correct
              ? "border-success/50 bg-success/10" 
              : "border-destructive/50 bg-destructive/10"
          )}>
            {currentVerdict.is_correct ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
            <AlertDescription className={cn(
              currentVerdict.is_correct ? "text-success" : "text-destructive"
            )}>
              {currentVerdict.is_correct
                ? "Correct! Well done."
                : currentVerdict.correct_displayed_index !== null
                  ? `Incorrect. The correct answer is: ${currentQuestion.options[currentVerdict.correct_displayed_index]}`
                  : 'Incorrect.'}
              {currentVerdict.explanation && (
                <span className="block mt-2 text-foreground/80 font-normal">
                  {currentVerdict.explanation}
                </span>
              )}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex-col items-stretch gap-3">
        <p className="text-center text-xs text-muted-foreground">
          {attemptsRemaining !== null && (
            <>
              {attemptsRemaining} {attemptsRemaining === 1 ? 'attempt' : 'attempts'} left ·{' '}
            </>
          )}
          pass mark {passingScore}% · {answeredCount} answered
        </p>
        {!revealed ? (
          <Button
            className="pressable h-[52px] w-full rounded-full text-[15px] font-semibold"
            data-testid="quiz-check"
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null || checking}
          >
            {checking && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {checking ? 'Checking…' : 'Check answer'}
          </Button>
        ) : (
          <Button
            className="pressable h-[52px] w-full rounded-full text-[15px] font-semibold"
            data-testid="quiz-submit"
            onClick={handleNextQuestion}
            disabled={submitting}
          >
            {submitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isLastQuestion ? (isFinalAttempt ? 'Submit final attempt' : 'See Results') : 'Next Question'}
            {!submitting && <ChevronRight className="h-4 w-4 ml-1" />}
          </Button>
        )}
      </CardFooter>

      {/* Unanswered-questions guard */}
      <AlertDialog open={unansweredOpen} onOpenChange={setUnansweredOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              You haven’t answered {unansweredIndexes.length}{' '}
              {unansweredIndexes.length === 1 ? 'question' : 'questions'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Unanswered questions are marked incorrect. You can go back and complete them before
              submitting.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={goToFirstUnanswered}>Review answers</AlertDialogCancel>
            <AlertDialogAction onClick={submitAnyway}>Submit anyway</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Final-attempt confirmation — only when it truly is the last one */}
      <AlertDialog open={finalConfirmOpen} onOpenChange={setFinalConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>This is your final attempt</AlertDialogTitle>
            <AlertDialogDescription>
              Your score will be locked in once you submit.
              {passingScore > 0 ? ` Pass mark: ${passingScore}%.` : ''}
            </AlertDialogDescription>

          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setFinalConfirmOpen(false);
                void submitAttempt();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Submit final attempt
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
