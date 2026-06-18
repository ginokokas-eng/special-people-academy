import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { BookOpen, Trophy, Clock, TrendingUp, ArrowRight, Play } from 'lucide-react';
import { Loader2 } from 'lucide-react';

interface DashboardStats {
  enrolledCourses: number;
  completedCourses: number;
  certificates: number;
  totalLearningMinutes: number;
}

interface EnrolledCourse {
  id: string;
  title: string;
  category: string;
  thumbnail_url: string | null;
  progress: number;
  duration_minutes: number;
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<DashboardStats>({
    enrolledCourses: 0,
    completedCourses: 0,
    certificates: 0,
    totalLearningMinutes: 0,
  });
  const [enrolledCourses, setEnrolledCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchDashboardData();
    }
  }, [user]);

  const fetchDashboardData = async () => {
    if (!user) return;

    try {
      // Fetch enrollments
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          id,
          completed_at,
          course:courses(id, title, category, thumbnail_url, duration_minutes)
        `)
        .eq('user_id', user.id);

      // Fetch certificates
      const { data: certificates } = await supabase
        .from('certificates')
        .select('id')
        .eq('user_id', user.id);

      // Calculate stats
      const completedCount = enrollments?.filter(e => e.completed_at).length || 0;
      const totalMinutes = enrollments?.reduce((acc, e) => {
        const course = e.course as { duration_minutes?: number } | null;
        return acc + (course?.duration_minutes || 0);
      }, 0) || 0;

      setStats({
        enrolledCourses: enrollments?.length || 0,
        completedCourses: completedCount,
        certificates: certificates?.length || 0,
        totalLearningMinutes: totalMinutes,
      });

      // Build the list of enrolled courses once.
      const courseList = (enrollments || [])
        .map(e => e.course as {
          id: string;
          title: string;
          category: string;
          thumbnail_url: string | null;
          duration_minutes: number;
        } | null)
        .filter((c): c is NonNullable<typeof c> => !!c);

      const courseIds = courseList.map(c => c.id);

      // Fetch ALL lessons for ALL enrolled courses in a single query (no N+1).
      const { data: allLessons } = courseIds.length
        ? await supabase
            .from('lessons')
            .select('id, course_id')
            .in('course_id', courseIds)
        : { data: [] as { id: string; course_id: string }[] };

      const lessonIds = (allLessons || []).map(l => l.id);

      // Fetch ALL completed lesson progress for this user in a single query.
      const { data: completed } = lessonIds.length
        ? await supabase
            .from('lesson_progress')
            .select('lesson_id')
            .eq('user_id', user.id)
            .in('lesson_id', lessonIds)
            .eq('completed', true)
        : { data: [] as { lesson_id: string }[] };

      // Index counts by course for O(1) lookups.
      const lessonsByCourse = new Map<string, number>();
      const lessonToCourse = new Map<string, string>();
      for (const l of allLessons || []) {
        lessonsByCourse.set(l.course_id, (lessonsByCourse.get(l.course_id) || 0) + 1);
        lessonToCourse.set(l.id, l.course_id);
      }
      const completedByCourse = new Map<string, number>();
      for (const c of completed || []) {
        const cid = lessonToCourse.get(c.lesson_id);
        if (cid) completedByCourse.set(cid, (completedByCourse.get(cid) || 0) + 1);
      }

      const coursesWithProgress: EnrolledCourse[] = courseList.map(course => {
        const total = lessonsByCourse.get(course.id) || 0;
        const done = completedByCourse.get(course.id) || 0;
        const progress = total ? Math.round((done / total) * 100) : 0;
        return {
          id: course.id,
          title: course.title,
          category: course.category,
          thumbnail_url: course.thumbnail_url,
          progress,
          duration_minutes: course.duration_minutes,
        };
      });

      setEnrolledCourses(coursesWithProgress);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  const statCards = [
    {
      title: 'Enrolled Courses',
      value: stats.enrolledCourses.toString(),
      icon: BookOpen,
      color: 'text-primary',
    },
    {
      title: 'Completed',
      value: stats.completedCourses.toString(),
      icon: Trophy,
      color: 'text-success',
    },
    {
      title: 'Certificates',
      value: stats.certificates.toString(),
      icon: TrendingUp,
      color: 'text-accent',
    },
    {
      title: 'Learning Time',
      value: `${Math.floor(stats.totalLearningMinutes / 60)}h`,
      icon: Clock,
      color: 'text-warning',
    },
  ];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-foreground">My Dashboard</h1>
          <p className="text-muted-foreground mt-1">Track your learning progress</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => (
            <Card key={stat.title} className="hover:shadow-md transition-shadow">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">{stat.title}</p>
                    <p className="text-3xl font-bold">{stat.value}</p>
                  </div>
                  <div className={`p-3 rounded-lg bg-muted ${stat.color}`}>
                    <stat.icon className="h-6 w-6" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Continue Learning */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold">Continue Learning</h2>
            <Button variant="outline" size="sm" onClick={() => navigate('/courses')}>
              View All Courses
              <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {enrolledCourses.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">No courses yet</h3>
                <p className="text-muted-foreground mb-4">Start your learning journey by enrolling in a course</p>
                <Button onClick={() => navigate('/courses')}>
                  Browse Courses
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {enrolledCourses.slice(0, 3).map((course) => (
                <Card 
                  key={course.id} 
                  className="hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => navigate(`/courses/${course.id}`)}
                >
                  <div className="relative aspect-video bg-muted overflow-hidden rounded-t-lg">
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
                    <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                      <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                        <Play className="h-5 w-5 text-foreground ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <CardHeader className="pb-2">
                    <p className="text-xs text-primary font-medium">{course.category}</p>
                    <CardTitle className="text-base line-clamp-2">{course.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Progress</span>
                        <span className="font-medium">{course.progress}%</span>
                      </div>
                      <Progress value={course.progress} className="h-2" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
