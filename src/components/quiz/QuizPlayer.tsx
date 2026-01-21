import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  ChevronRight, 
  RotateCcw,
  Trophy,
  Target,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correct_answer: number;
  order_index: number;
}

interface QuizPlayerProps {
  quizId: string;
  quizTitle: string;
  questions: QuizQuestion[];
  passingScore: number;
  onComplete: (passed: boolean, score: number, answers: Record<string, number>) => void;
  onRetry: () => void;
  previousAttempts?: number;
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
}: QuizPlayerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [feedback, setFeedback] = useState<FeedbackState>('none');
  const [showResults, setShowResults] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const answeredCount = Object.keys(answers).length;
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;

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
    setSelectedAnswer(optionIndex);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null) return;

    // Store answer
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: selectedAnswer,
    }));

    // Show feedback
    if (selectedAnswer === currentQuestion.correct_answer) {
      setFeedback('correct');
    } else {
      setFeedback('incorrect');
    }
  };

  const handleNextQuestion = () => {
    if (isLastQuestion) {
      // Calculate final score and complete
      const finalScore = calculateScore();
      const passed = finalScore >= passingScore;
      setShowResults(true);
      onComplete(passed, finalScore, answers);
    } else {
      setCurrentQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
      setFeedback('none');
    }
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
        <Progress value={progress} className="h-2" />
        <CardTitle className="text-lg mt-4">{quizTitle}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Question */}
        <div className="p-4 bg-muted/30 rounded-lg">
          <p className="font-medium text-lg">{currentQuestion.question}</p>
        </div>

        {/* Options */}
        <div className="space-y-3">
          {currentQuestion.options.map((option, index) => {
            const isSelected = selectedAnswer === index;
            const isCorrect = index === currentQuestion.correct_answer;
            const showCorrect = feedback !== 'none' && isCorrect;
            const showIncorrect = feedback === 'incorrect' && isSelected;

            return (
              <button
                key={index}
                onClick={() => handleAnswerSelect(index)}
                disabled={feedback !== 'none'}
                className={cn(
                  "w-full p-4 rounded-lg border-2 text-left transition-all duration-200",
                  "hover:border-primary/50 hover:bg-primary/5",
                  "disabled:cursor-not-allowed",
                  isSelected && feedback === 'none' && "border-primary bg-primary/10",
                  showCorrect && "border-success bg-success/10",
                  showIncorrect && "border-destructive bg-destructive/10",
                  !isSelected && feedback === 'none' && "border-border"
                )}
              >
                <div className="flex items-center gap-3">
                  <div className={cn(
                    "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium border-2",
                    isSelected && feedback === 'none' && "border-primary bg-primary text-primary-foreground",
                    showCorrect && "border-success bg-success text-success-foreground",
                    showIncorrect && "border-destructive bg-destructive text-destructive-foreground",
                    !isSelected && feedback === 'none' && "border-muted-foreground/30"
                  )}>
                    {showCorrect ? (
                      <CheckCircle2 className="h-5 w-5" />
                    ) : showIncorrect ? (
                      <XCircle className="h-5 w-5" />
                    ) : (
                      String.fromCharCode(65 + index)
                    )}
                  </div>
                  <span className={cn(
                    "flex-1",
                    showCorrect && "font-medium text-success",
                    showIncorrect && "text-destructive"
                  )}>
                    {option}
                  </span>
                </div>
              </button>
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
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="text-sm text-muted-foreground">
          {answeredCount} answered
        </div>
        {feedback === 'none' ? (
          <Button 
            onClick={handleSubmitAnswer} 
            disabled={selectedAnswer === null}
          >
            Check Answer
          </Button>
        ) : (
          <Button onClick={handleNextQuestion}>
            {isLastQuestion ? 'See Results' : 'Next Question'}
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
