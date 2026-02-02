import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BookOpen, Clock, Play, CheckCircle2, Loader2 } from 'lucide-react';

interface EnrolledCourse {
  id: string;
  title: string;
  category: string;
  thumbnail_url: string | null;
  duration_minutes: number;
  level: string;
  progress: number;
  enrolledAt: string;
  completedAt: string | null;
}

export default function MyLearning() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchEnrolledCourses();
    }
  }, [user]);

  const fetchEnrolledCourses = async () => {
    if (!user) return;

    try {
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          enrolled_at,
          completed_at,
          course:courses(id, title, category, thumbnail_url, duration_minutes, level)
        `)
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false });

      const coursesWithProgress: EnrolledCourse[] = [];

      for (const enrollment of enrollments || []) {
        const course = enrollment.course as {
          id: string;
          title: string;
          category: string;
          thumbnail_url: string | null;
          duration_minutes: number;
          level: string;
        } | null;

        if (!course) continue;

        // Get lessons count
        const { data: lessons } = await supabase
          .from('lessons')
          .select('id')
          .eq('course_id', course.id);

        // Get completed lessons
        const { data: completedLessons } = await supabase
          .from('lesson_progress')
          .select('id')
          .eq('user_id', user.id)
          .in('lesson_id', lessons?.map(l => l.id) || [])
          .eq('completed', true);

        const progress = lessons?.length
          ? Math.round((completedLessons?.length || 0) / lessons.length * 100)
          : 0;

        coursesWithProgress.push({
          id: course.id,
          title: course.title,
          category: course.category,
          thumbnail_url: course.thumbnail_url,
          duration_minutes: course.duration_minutes,
          level: course.level,
          progress,
          enrolledAt: enrollment.enrolled_at,
          completedAt: enrollment.completed_at,
        });
      }

      setCourses(coursesWithProgress);
    } catch (error) {
      console.error('Error fetching courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const inProgressCourses = courses.filter(c => c.progress > 0 && c.progress < 100);
  const completedCourses = courses.filter(c => c.progress === 100);
  const notStartedCourses = courses.filter(c => c.progress === 0);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const CourseCard = ({ course }: { course: EnrolledCourse }) => (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer overflow-hidden"
      onClick={() => navigate(`/courses/${course.id}`)}
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {course.thumbnail_url ? (
          <img 
            src={course.thumbnail_url} 
            alt={course.title}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {course.progress === 100 && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-success text-success-foreground">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <p className="text-xs font-medium text-primary">{course.category}</p>
        <CardTitle className="text-base line-clamp-2">{course.title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDuration(course.duration_minutes)}
          </span>
          
        </div>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Progress</span>
            <span className="font-medium">{course.progress}%</span>
          </div>
          <Progress value={course.progress} className="h-2" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Learning</h1>
          <p className="text-muted-foreground mt-1">Track your enrolled courses and progress</p>
        </div>

        {courses.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No courses yet</h3>
              <p className="text-muted-foreground mb-4">Start your learning journey today</p>
              <Button onClick={() => navigate('/courses')}>Browse Courses</Button>
            </CardContent>
          </Card>
        ) : (
          <Tabs defaultValue="in-progress" className="w-full">
            <TabsList>
              <TabsTrigger value="in-progress">
                In Progress ({inProgressCourses.length})
              </TabsTrigger>
              <TabsTrigger value="not-started">
                Not Started ({notStartedCourses.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedCourses.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="in-progress" className="mt-6">
              {inProgressCourses.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No courses in progress
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inProgressCourses.map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="not-started" className="mt-6">
              {notStartedCourses.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    All enrolled courses have been started
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {notStartedCourses.map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {completedCourses.length === 0 ? (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    No completed courses yet. Keep learning!
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedCourses.map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
