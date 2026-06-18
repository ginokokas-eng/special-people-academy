import { useEffect, useState } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Plus, Trash2, Edit, Loader2, HelpCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

interface Quiz {
  id: string;
  lesson_id: string;
  title: string;
  passing_score: number | null;
  attempts_allowed: number | null;
}

interface Question {
  id: string;
  quiz_id: string;
  question: string;
  question_type: string;
  options: string[];
  correct_answer: number;
  explanation: string | null;
  order_index: number;
}

interface Lesson {
  id: string;
  title: string;
  lesson_type: string;
}

interface CourseQuizTabProps {
  courseId: string;
}

export function CourseQuizTab({ courseId }: CourseQuizTabProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [quizLessons, setQuizLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [quizDialog, setQuizDialog] = useState<{ open: boolean; quiz: Quiz | null; lessonId: string | null }>({ open: false, quiz: null, lessonId: null });
  const [questionDialog, setQuestionDialog] = useState<{ open: boolean; question: Question | null; quizId: string | null }>({ open: false, question: null, quizId: null });

  const [quizForm, setQuizForm] = useState({ title: '', passing_score: 70, attempts_allowed: 3 });
  const [questionForm, setQuestionForm] = useState({
    question: '',
    question_type: 'multiple_choice',
    options: ['', '', '', ''],
    correct_answer: 0,
    explanation: '',
  });

  useEffect(() => {
    fetchData();
  }, [courseId]);

  const fetchData = async () => {
    try {
      // Get quiz lessons
      const { data: lessonsData, error: lessonsError } = await supabase
        .from('lessons')
        .select('id, title, lesson_type')
        .eq('course_id', courseId)
        .eq('lesson_type', 'quiz');

      if (lessonsError) throw lessonsError;
      setQuizLessons(lessonsData || []);

      if (lessonsData && lessonsData.length > 0) {
        const lessonIds = lessonsData.map(l => l.id);
        
        // Get quizzes for these lessons
        const { data: quizzesData, error: quizzesError } = await supabase
          .from('quizzes')
          .select('*')
          .in('lesson_id', lessonIds);

        if (quizzesError) throw quizzesError;
        setQuizzes(quizzesData || []);

        if (quizzesData && quizzesData.length > 0) {
          const quizIds = quizzesData.map(q => q.id);
          
          // Get questions for these quizzes
          const { data: questionsData, error: questionsError } = await supabase
            .from('quiz_questions')
            .select('*')
            .in('quiz_id', quizIds)
            .order('order_index');

          if (questionsError) throw questionsError;
          setQuestions((questionsData || []).map(q => ({
            ...q,
            options: Array.isArray(q.options) ? q.options as string[] : [],
          })));
        }
      }
    } catch (error) {
      console.error('Error fetching quiz data:', error);
      toast.error('Failed to load quiz data');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateQuiz = async () => {
    if (!quizDialog.lessonId || !quizForm.title.trim()) {
      toast.error('Title is required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('quizzes').insert({
        lesson_id: quizDialog.lessonId,
        title: quizForm.title,
        passing_score: quizForm.passing_score,
        attempts_allowed: quizForm.attempts_allowed,
      });

      if (error) throw error;
      toast.success('Quiz created');
      setQuizDialog({ open: false, quiz: null, lessonId: null });
      setQuizForm({ title: '', passing_score: 70, attempts_allowed: 3 });
      fetchData();
    } catch (error) {
      console.error('Error creating quiz:', error);
      toast.error('Failed to create quiz');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateQuiz = async () => {
    if (!quizDialog.quiz) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('quizzes')
        .update({
          title: quizForm.title,
          passing_score: quizForm.passing_score,
          attempts_allowed: quizForm.attempts_allowed,
        })
        .eq('id', quizDialog.quiz.id);

      if (error) throw error;
      toast.success('Quiz updated');
      setQuizDialog({ open: false, quiz: null, lessonId: null });
      fetchData();
    } catch (error) {
      console.error('Error updating quiz:', error);
      toast.error('Failed to update quiz');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuiz = async (quizId: string) => {
    if (!(await confirmDialog({ title: 'Delete quiz?', description: 'This will permanently delete this quiz and all its questions.' }))) return;

    try {
      const { error } = await supabase.from('quizzes').delete().eq('id', quizId);
      if (error) throw error;
      toast.success('Quiz deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting quiz:', error);
      toast.error('Failed to delete quiz');
    }
  };

  const handleCreateQuestion = async () => {
    if (!questionDialog.quizId || !questionForm.question.trim()) {
      toast.error('Question is required');
      return;
    }

    const validOptions = questionForm.options.filter(o => o.trim());
    if (validOptions.length < 2) {
      toast.error('At least 2 options are required');
      return;
    }

    setSaving(true);
    try {
      const quizQuestions = questions.filter(q => q.quiz_id === questionDialog.quizId);
      const { error } = await supabase.from('quiz_questions').insert({
        quiz_id: questionDialog.quizId,
        question: questionForm.question,
        question_type: questionForm.question_type,
        options: validOptions,
        correct_answer: questionForm.correct_answer,
        explanation: questionForm.explanation || null,
        order_index: quizQuestions.length,
      });

      if (error) throw error;
      toast.success('Question added');
      setQuestionDialog({ open: false, question: null, quizId: null });
      setQuestionForm({ question: '', question_type: 'multiple_choice', options: ['', '', '', ''], correct_answer: 0, explanation: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating question:', error);
      toast.error('Failed to add question');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!(await confirmDialog({ title: 'Delete question?', description: 'This will permanently delete this question.' }))) return;

    try {
      const { error } = await supabase.from('quiz_questions').delete().eq('id', questionId);
      if (error) throw error;
      toast.success('Question deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting question:', error);
      toast.error('Failed to delete question');
    }
  };

  const openEditQuiz = (quiz: Quiz) => {
    setQuizForm({
      title: quiz.title,
      passing_score: quiz.passing_score || 70,
      attempts_allowed: quiz.attempts_allowed || 3,
    });
    setQuizDialog({ open: true, quiz, lessonId: quiz.lesson_id });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (quizLessons.length === 0) {
    return (
      <Card>
        <CardContent className="py-12">
          <div className="text-center text-muted-foreground">
            <HelpCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="mb-2">No quiz lessons in this course</p>
            <p className="text-sm">Add quiz lessons in the Modules & Lessons tab first</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Quiz Builder</CardTitle>
          <CardDescription>Create and manage quizzes for your course</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="multiple" className="space-y-4">
            {quizLessons.map((lesson) => {
              const quiz = quizzes.find(q => q.lesson_id === lesson.id);
              const quizQuestions = quiz ? questions.filter(q => q.quiz_id === quiz.id) : [];

              return (
                <AccordionItem key={lesson.id} value={lesson.id} className="border rounded-lg px-4">
                  <AccordionTrigger className="hover:no-underline">
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-4 w-4" />
                      <span className="font-medium">{lesson.title}</span>
                      {quiz ? (
                        <span className="text-sm text-muted-foreground">({quizQuestions.length} questions)</span>
                      ) : (
                        <span className="text-sm text-warning">No quiz configured</span>
                      )}
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="pt-4">
                    {quiz ? (
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                          <div>
                            <p className="font-medium">{quiz.title}</p>
                            <p className="text-sm text-muted-foreground">
                              Pass: {quiz.passing_score}% | Attempts: {quiz.attempts_allowed || 'Unlimited'}
                            </p>
                          </div>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditQuiz(quiz)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteQuiz(quiz.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {quizQuestions.map((question, index) => (
                            <div key={question.id} className="flex items-start justify-between p-3 border rounded-lg">
                              <div className="space-y-1">
                                <p className="font-medium text-sm">{index + 1}. {question.question}</p>
                                <div className="flex flex-wrap gap-2">
                                  {question.options.map((opt, i) => (
                                    <span
                                      key={i}
                                      className={`text-xs px-2 py-1 rounded ${i === question.correct_answer ? 'bg-status-success-bg text-status-success-foreground' : 'bg-muted'}`}
                                    >
                                      {i === question.correct_answer && <CheckCircle className="h-3 w-3 inline mr-1" />}
                                      {opt}
                                    </span>
                                  ))}
                                </div>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(question.id)}>
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          ))}
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setQuestionForm({ question: '', question_type: 'multiple_choice', options: ['', '', '', ''], correct_answer: 0, explanation: '' });
                            setQuestionDialog({ open: true, question: null, quizId: quiz.id });
                          }}
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Add Question
                        </Button>
                      </div>
                    ) : (
                      <Button
                        onClick={() => {
                          setQuizForm({ title: lesson.title + ' Quiz', passing_score: 70, attempts_allowed: 3 });
                          setQuizDialog({ open: true, quiz: null, lessonId: lesson.id });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Quiz
                      </Button>
                    )}
                  </AccordionContent>
                </AccordionItem>
              );
            })}
          </Accordion>
        </CardContent>
      </Card>

      {/* Quiz Dialog */}
      <Dialog open={quizDialog.open} onOpenChange={(open) => setQuizDialog({ ...quizDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{quizDialog.quiz ? 'Edit Quiz' : 'Create Quiz'}</DialogTitle>
            <DialogDescription>Configure quiz settings</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={quizForm.title}
                onChange={(e) => setQuizForm({ ...quizForm, title: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Passing Score (%)</Label>
                <Input
                  type="number"
                  value={quizForm.passing_score}
                  onChange={(e) => setQuizForm({ ...quizForm, passing_score: parseInt(e.target.value) || 70 })}
                />
              </div>
              <div className="space-y-2">
                <Label>Attempts Allowed</Label>
                <Input
                  type="number"
                  value={quizForm.attempts_allowed}
                  onChange={(e) => setQuizForm({ ...quizForm, attempts_allowed: parseInt(e.target.value) || 3 })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuizDialog({ open: false, quiz: null, lessonId: null })}>Cancel</Button>
            <Button onClick={quizDialog.quiz ? handleUpdateQuiz : handleCreateQuiz} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {quizDialog.quiz ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question Dialog */}
      <Dialog open={questionDialog.open} onOpenChange={(open) => setQuestionDialog({ ...questionDialog, open })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add Question</DialogTitle>
            <DialogDescription>Create a new quiz question</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Question</Label>
              <Textarea
                value={questionForm.question}
                onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Options</Label>
              {questionForm.options.map((opt, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="correct"
                    checked={questionForm.correct_answer === index}
                    onChange={() => setQuestionForm({ ...questionForm, correct_answer: index })}
                  />
                  <Input
                    value={opt}
                    onChange={(e) => {
                      const newOptions = [...questionForm.options];
                      newOptions[index] = e.target.value;
                      setQuestionForm({ ...questionForm, options: newOptions });
                    }}
                    placeholder={`Option ${index + 1}`}
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground">Select the radio button next to the correct answer</p>
            </div>
            <div className="space-y-2">
              <Label>Explanation (shown after answering)</Label>
              <Textarea
                value={questionForm.explanation}
                onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                placeholder="Optional explanation of the correct answer"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setQuestionDialog({ open: false, question: null, quizId: null })}>Cancel</Button>
            <Button onClick={handleCreateQuestion} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Add Question
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
