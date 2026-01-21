import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  CheckCircle, 
  Circle, 
  BookOpen, 
  ClipboardCheck, 
  Users, 
  Award,
  Loader2,
  Trophy
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface CourseProgressTrackerProps {
  courseId: string;
  userId: string;
  lessonProgress: {
    total: number;
    completed: number;
  };
  quizProgress: {
    total: number;
    passed: number;
  };
  practicalProgress: {
    required: boolean;
    completed: boolean;
  };
  hasCertificate: boolean;
  isCompleted: boolean;
  certificateId?: string;
}

export function CourseProgressTracker({
  courseId,
  userId,
  lessonProgress,
  quizProgress,
  practicalProgress,
  hasCertificate,
  isCompleted,
  certificateId,
}: CourseProgressTrackerProps) {
  const navigate = useNavigate();
  const [claiming, setClaiming] = useState(false);

  // Calculate overall progress
  const totalRequirements = 
    1 + // Lessons
    (quizProgress.total > 0 ? 1 : 0) + // Quizzes
    (practicalProgress.required ? 1 : 0); // Practical

  const completedRequirements = 
    (lessonProgress.completed === lessonProgress.total && lessonProgress.total > 0 ? 1 : 0) +
    (quizProgress.passed === quizProgress.total && quizProgress.total > 0 ? 1 : 0) +
    (practicalProgress.required ? (practicalProgress.completed ? 1 : 0) : 0);

  const overallProgress = totalRequirements > 0 
    ? Math.round((completedRequirements / totalRequirements) * 100) 
    : 0;

  const allComplete = completedRequirements === totalRequirements && totalRequirements > 0;

  const handleClaimCertificate = async () => {
    if (certificateId) {
      navigate('/certificates');
      return;
    }

    setClaiming(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to claim your certificate');
        return;
      }

      const response = await supabase.functions.invoke('check-course-completion', {
        body: { course_id: courseId },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (response.error) {
        throw response.error;
      }

      const result = response.data;
      
      if (result.completed) {
        toast.success('🎉 Certificate issued! Check your certificates page.');
        navigate('/certificates');
      } else if (result.already_completed) {
        toast.info('You already have a certificate for this course.');
        navigate('/certificates');
      } else {
        toast.error(result.message || 'Not all requirements are complete yet.');
      }
    } catch (error) {
      console.error('Error claiming certificate:', error);
      toast.error('Failed to claim certificate');
    } finally {
      setClaiming(false);
    }
  };

  const requirements = [
    {
      id: 'lessons',
      label: 'Complete all lessons',
      icon: BookOpen,
      progress: `${lessonProgress.completed}/${lessonProgress.total}`,
      completed: lessonProgress.completed === lessonProgress.total && lessonProgress.total > 0,
      show: true,
    },
    {
      id: 'quizzes',
      label: 'Pass all quizzes',
      icon: ClipboardCheck,
      progress: `${quizProgress.passed}/${quizProgress.total}`,
      completed: quizProgress.passed === quizProgress.total && quizProgress.total > 0,
      show: quizProgress.total > 0,
    },
    {
      id: 'practical',
      label: 'Complete practical session',
      icon: Users,
      progress: practicalProgress.completed ? 'Passed' : 'Pending',
      completed: practicalProgress.completed,
      show: practicalProgress.required,
    },
  ].filter(r => r.show);

  return (
    <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-accent/5">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Trophy className="h-5 w-5 text-primary" />
            Your Progress
          </CardTitle>
          {allComplete && !isCompleted && (
            <Badge className="bg-success text-success-foreground animate-pulse">
              Ready to complete!
            </Badge>
          )}
          {isCompleted && (
            <Badge className="bg-primary text-primary-foreground">
              <Award className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Overall Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Overall completion</span>
            <span className="font-semibold text-primary">{overallProgress}%</span>
          </div>
          <Progress value={overallProgress} className="h-3" />
        </div>

        {/* Requirements Checklist */}
        <div className="space-y-3">
          {requirements.map((req) => {
            const Icon = req.icon;
            return (
              <div 
                key={req.id}
                className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${
                  req.completed 
                    ? 'bg-success/10 border border-success/20' 
                    : 'bg-muted/50 border border-border'
                }`}
              >
                {req.completed ? (
                  <CheckCircle className="h-5 w-5 text-success flex-shrink-0" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    <span className={`text-sm font-medium ${req.completed ? 'text-success' : ''}`}>
                      {req.label}
                    </span>
                  </div>
                </div>
                <Badge variant={req.completed ? 'default' : 'secondary'} className="text-xs">
                  {req.progress}
                </Badge>
              </div>
            );
          })}
        </div>

        {/* Claim Certificate Button */}
        {hasCertificate && (
          <div className="pt-2">
            {allComplete ? (
              <Button 
                onClick={handleClaimCertificate}
                disabled={claiming}
                className="w-full h-12 text-base font-semibold bg-gradient-to-r from-primary to-accent hover:from-primary/90 hover:to-accent/90"
              >
                {claiming ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Processing...
                  </>
                ) : certificateId ? (
                  <>
                    <Award className="h-4 w-4 mr-2" />
                    View Certificate
                  </>
                ) : (
                  <>
                    <Award className="h-4 w-4 mr-2" />
                    Claim Certificate
                  </>
                )}
              </Button>
            ) : (
              <div className="text-center p-4 rounded-lg bg-muted/50 border border-dashed border-muted-foreground/30">
                <Award className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">
                  Complete all requirements to claim your certificate
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
