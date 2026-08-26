import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
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
  XCircle, 
  AlertCircle, 
  ChevronRight, 
  RotateCcw,
  Trophy,
  Target,
  Clock
} from '@/components/icons';
import { cn } from '@/lib/utils';


interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  order_index: number;
  explanation?: string | null;
}

interface QuizPlayerProps {
  quizId: string;
  quizTitle: string;
  questions: QuizQuestion[];
  passingScore: number;
  onComplete: (passed: boolean, score: number, answers: Record<string, number>) => void;
  onRetry: () => void;
  previousAttempts?: number;
  /** Attempts left including this one; 1 means this is the final attempt. */
  attemptsRemaining?: number | null;
}

type FeedbackState = 'none' | 'correct' | 'incorrect';

export function QuizPlayer({
  quizId,
  quizTitle,
  questions,
  passingScore,
  onComplete,
  onRetry,
  previousAttempts = 0,
  attemptsRemaining = null,
}: QuizPlayerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<FeedbackState>('none');
  const [showResults, setShowResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [unansweredOpen, setUnansweredOpen] = useState(false);
  const [finalConfirmOpen, setFinalConfirmOpen] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isFinalAttempt = attemptsRemaining === 1;

  // Calculate score
  const calculateScore = () => {
    let correct = 0;
    questions.forEach((q) => {
      if (answers[q.id] === q.correct_answer) {
        correct++;
      }
    });
    return Math.round((correct / questions.length) * 100);
  };

  const handleAnswerSelect = (optionIndex: number) => {
    if (feedback !== 'none') return; // Already answered
    haptics.selection();
    setSelectedAnswer(optionIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    // Store answer
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: selectedAnswer,
    }));

    // Show feedback. Haptics stay sparse: a win always confirms; a miss only
    // buzzes when there is no attempt left to fix it.
    if (selectedAnswer === currentQuestion.correct_answer) {
      haptics.success();
      setFeedback('correct');
    } else {
      if (isFinalAttempt) haptics.warning();
      setFeedback('incorrect');
    }
  };

  /** Questions with no recorded answer, in authored order. */
  const unansweredIndexes = questions
    .map((q, i) => (answers[q.id] === undefined ? i : -1))
    .filter((i) => i >= 0);

  const submitAttempt = () => {
    const finalScore = calculateScore();
    const passed = finalScore >= passingScore;
    setShowResults(true);
    onComplete(passed, finalScore, answers);
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
      submitAttempt();
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setFeedback('none');
    }
  };

  const goToFirstUnanswered = () => {
    const target = unansweredIndexes[0];
    setUnansweredOpen(false);
    if (target === undefined) return;
    setCurrentQuestionIndex(target);
    setSelectedAnswer(null);
    setFeedback('none');
  };

  const submitAnyway = () => {
    setUnansweredOpen(false);
    if (isFinalAttempt) {
      setFinalConfirmOpen(true);
      return;
    }
    submitAttempt();
  };


  const handleRetry = () => {
    setCurrentQuestionIndex(0);
    setSelectedAnswer(null);
    setAnswers({});
    setFeedback('none');
    setShowResults(false);
    onRetry();
  };

  // Results screen
  if (showResults) {
    const score = calculateScore();
    const passed = score >= passingScore;
    const correctCount = questions.filter((q) => answers[q.id] === q.correct_answer).length;

    return (
      <Card className="max-w-2xl mx-auto">
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
              {correctCount} of {questions.length} questions correct
            </p>
          </div>

          {/* Score breakdown */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-2xl font-semibold text-success">{correctCount}</div>
              <div className="text-sm text-muted-foreground">Correct</div>
            </div>
            <div className="p-4 rounded-lg bg-muted/30 text-center">
              <div className="text-2xl font-semibold text-destructive">{questions.length - correctCount}</div>
              <div className="text-sm text-muted-foreground">Incorrect</div>
            </div>
          </div>

          {/* Pass threshold indicator */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Your score</span>
              <span>Pass mark: {passingScore}%</span>
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
        {/* One segment per question: answered-correct green, current violet,
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
            const recorded = answers[q.id];
            const isAnswered = recorded !== undefined;
            const isRight = isAnswered && recorded === q.correct_answer;
            return (
              <span
                key={q.id}
                className={cn(
                  'h-1 flex-1 rounded-full transition-colors',
                  i === currentQuestionIndex
                    ? 'bg-primary'
                    : isRight
                      ? 'bg-[hsl(var(--success))]'
                      : isAnswered
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
        {currentQuestion.question.startsWith('SCENARIO:') && (
          <Badge variant="secondary" className="bg-accent/10 text-accent border-accent/30">
            <AlertCircle className="h-3 w-3 mr-1" />
            Scenario Question
          </Badge>
        )}

        {/* Question */}
        <div className={cn(
          "p-4 rounded-lg",
          currentQuestion.question.startsWith('SCENARIO:') 
            ? "bg-accent/5 border border-accent/20" 
            : "bg-muted/30"
        )}>
          <p className="font-medium text-lg">
            {currentQuestion.question.startsWith('SCENARIO:') 
              ? currentQuestion.question.replace('SCENARIO:', '').trim()
              : currentQuestion.question
            }
          </p>
        </div>

        {/* Options — 68dp targets, whole row tappable. */}
        <div className="space-y-2.5">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === currentQuestion.correct_answer;
            const state =
              feedback === 'none'
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
                disabled={feedback !== 'none'}
                onSelect={() => handleAnswerSelect(index)}
              />
            );
          })}
        </div>

        {/* Feedback */}
        {feedback !== 'none' && (
          <Alert className={cn(
            feedback === 'correct' 
              ? "border-success/50 bg-success/10" 
              : "border-destructive/50 bg-destructive/10"
          )}>
            {feedback === 'correct' ? (
              <CheckCircle2 className="h-4 w-4 text-success" />
            ) : (
              <AlertCircle className="h-4 w-4 text-destructive" />
            )}
            <AlertDescription className={cn(
              feedback === 'correct' ? "text-success" : "text-destructive"
            )}>
              {feedback === 'correct' 
                ? "Correct! Well done." 
                : `Incorrect. The correct answer is: ${currentQuestion.options[currentQuestion.correct_answer]}`}
              {currentQuestion.explanation && (
                <span className="block mt-2 text-foreground/80 font-normal">
                  {currentQuestion.explanation}
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
        {feedback === 'none' ? (
          <Button
            className="pressable h-[52px] w-full rounded-full text-[15px] font-semibold"
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null}
          >
            Check answer
          </Button>
        ) : (
          <Button
            className="pressable h-[52px] w-full rounded-full text-[15px] font-semibold"
            onClick={handleNextQuestion}
          >
            {isLastQuestion ? (isFinalAttempt ? 'Submit final attempt' : 'See Results') : 'Next Question'}
            <ChevronRight className="h-4 w-4 ml-1" />
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
              Your score will be locked in once you submit. Pass mark: {passingScore}%.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Go back</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                setFinalConfirmOpen(false);
                submitAttempt();
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

