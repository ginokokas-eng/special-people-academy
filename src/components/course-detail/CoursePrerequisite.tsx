import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, BookOpen } from 'lucide-react';

interface CoursePrerequisiteProps {
  prerequisiteCourseId: string;
  prerequisiteRequired: boolean;
  userId?: string;
}

export function CoursePrerequisite({ prerequisiteCourseId, prerequisiteRequired, userId }: CoursePrerequisiteProps) {
  const [prereqCourse, setPrereqCourse] = useState<{ title: string; slug: string | null } | null>(null);
  const [completed, setCompleted] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPrerequisite();
  }, [prerequisiteCourseId, userId]);

  const fetchPrerequisite = async () => {
    try {
      const { data: courseData } = await supabase
        .from('courses')
        .select('title, slug')
        .eq('id', prerequisiteCourseId)
        .single();

      if (courseData) setPrereqCourse(courseData);

      if (userId) {
        const { data: enrollment } = await supabase
          .from('enrollments')
          .select('completed_at')
          .eq('user_id', userId)
          .eq('course_id', prerequisiteCourseId)
          .maybeSingle();

        setCompleted(!!enrollment?.completed_at);
      }
    } catch (error) {
      console.error('Error fetching prerequisite:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !prereqCourse) return null;

  const prereqSlug = prereqCourse.slug || prerequisiteCourseId;
  const isBlocked = prerequisiteRequired && !completed;

  if (completed) {
    return (
      <div className="rounded-lg border border-border bg-card p-4 flex items-center gap-3">
        <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
        <div className="flex-1">
          <p className="text-sm font-medium text-foreground">
            Prerequisite completed: {prereqCourse.title}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`rounded-lg border p-4 ${isBlocked ? 'border-destructive/50 bg-destructive/5' : 'border-accent bg-accent/10'}`}>
      <div className="flex items-start gap-3">
        {isBlocked ? (
          <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0 mt-0.5" />
        ) : (
          <BookOpen className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
        )}
        <div className="flex-1 space-y-2">
          <p className="text-sm font-medium text-foreground">
            {isBlocked ? 'Required prerequisite' : 'Recommended prerequisite'}: {prereqCourse.title}
          </p>
          <p className="text-xs text-muted-foreground">
            {isBlocked
              ? 'You must complete this course before you can start this one.'
              : 'We recommend completing this course first for the best learning experience.'}
          </p>
          <Button asChild variant="outline" size="sm">
            <Link to={`/courses/${prereqSlug}`}>
              View {prereqCourse.title}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
