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
import { BookOpen, Clock, CheckCircle2, Loader2, Play, ArrowRight, Mail } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useCart } from '@/hooks/useCart';
import { useGeneralSettings } from '@/hooks/useGeneralSettings';
import { MobileMyCourses, MobileCourseItem } from '@/components/course-learn/MobileMyCourses';

interface MyCourse {
  id: string;
  title: string;
  category: string;
  thumbnail_url: string | null;
  duration_minutes: number;
  level: string;
  delivery_type: string | null;
  progress: number;
  enrolledAt: string;
  completedAt: string | null;
  isAssigned: boolean; // true if admin-assigned, false if purchased/self-enrolled
  hasCertificate: boolean;
  certificateEarned: boolean;
  requiresPracticalSignoff: boolean;
}


export default function MyCourses() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { itemCount } = useCart();
  const { organisationName } = useGeneralSettings();
  const [courses, setCourses] = useState<MyCourse[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  useEffect(() => {
    if (user) {
      fetchMyCourses();
    }
  }, [user]);

  const fetchMyCourses = async () => {
    if (!user) return;

    try {
      // Fetch all enrollments for this user
      const { data: enrollments } = await supabase
        .from('enrollments')
        .select(`
          enrolled_at,
          completed_at,
          course:courses(id, title, category, thumbnail_url, duration_minutes, level, delivery_type, is_internal, has_certificate, requires_practical_signoff)
        `)
        .eq('user_id', user.id)
        .order('enrolled_at', { ascending: false });

      // Certificates this learner has earned (drives "Certificate available" status)
      const { data: earnedCerts } = await supabase
        .from('certificates')
        .select('course_id')
        .eq('user_id', user.id);
      const earnedCertIds = new Set((earnedCerts || []).map((c) => c.course_id));

      const coursesWithProgress: MyCourse[] = [];


      for (const enrollment of enrollments || []) {
        const course = enrollment.course as {
          id: string;
          title: string;
          category: string;
          thumbnail_url: string | null;
          duration_minutes: number;
          level: string;
          delivery_type: string | null;
          is_internal: boolean | null;
          has_certificate: boolean | null;
          requires_practical_signoff: boolean | null;
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
          delivery_type: course.delivery_type,
          progress,
          enrolledAt: enrollment.enrolled_at,
          completedAt: enrollment.completed_at,
          isAssigned: course.is_internal ?? false,
          hasCertificate: course.has_certificate ?? false,
          certificateEarned: earnedCertIds.has(course.id),
          requiresPracticalSignoff: course.requires_practical_signoff ?? false,
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
    if (!minutes) return 'N/A';
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}m`;
    if (mins === 0) return `${hours}h`;
    return `${hours}h ${mins}m`;
  };

  const formatDeliveryType = (type: string | null) => {
    if (!type) return 'Online';
    return type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Filter courses by tab
  const assignedCourses = courses.filter(c => c.isAssigned);
  const inProgressCourses = courses.filter(c => c.progress > 0 && c.progress < 100);
  const completedCourses = courses.filter(c => c.progress === 100 || c.completedAt);
  const allCourses = courses;

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  // Mobile learning-app experience (<= 768px). Desktop layout below is unchanged.
  if (isMobile) {
    const mobileCourses: MobileCourseItem[] = courses.map((c) => ({
      id: c.id,
      title: c.title,
      thumbnail_url: c.thumbnail_url,
      progress: c.progress,
      completedAt: c.completedAt,
      hasCertificate: c.hasCertificate,
      certificateEarned: c.certificateEarned,
      requiresPracticalSignoff: c.requiresPracticalSignoff,
    }));
    return (
      <MobileMyCourses
        courses={mobileCourses}
        providerName={organisationName || 'Special People Training'}
        cartCount={itemCount}
        cartEnabled={true}
      />
    );
  }


  const CourseCard = ({ course }: { course: MyCourse }) => (
    <Card 
      className="hover:shadow-lg transition-all cursor-pointer overflow-hidden group"
      onClick={() => navigate(`/courses/${course.id}`)}
    >
      <div className="relative aspect-video bg-muted overflow-hidden">
        {course.thumbnail_url ? (
          <img 
            src={course.thumbnail_url} 
            alt={course.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-accent/20">
            <BookOpen className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        {course.progress === 100 && (
          <div className="absolute top-2 right-2">
            <Badge className="bg-primary text-primary-foreground">
              <CheckCircle2 className="h-3 w-3 mr-1" />
              Completed
            </Badge>
          </div>
        )}
        {course.isAssigned && course.progress < 100 && (
          <div className="absolute top-2 left-2">
            <Badge variant="secondary">Assigned</Badge>
          </div>
        )}
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <span className="font-medium text-primary">{course.category}</span>
          <span>•</span>
          <span>{formatDeliveryType(course.delivery_type)}</span>
        </div>
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
        <Button 
          className="w-full mt-4" 
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/courses/${course.id}`);
          }}
        >
          {course.progress === 0 ? (
            <>
              <Play className="h-4 w-4 mr-2" />
              Start Course
            </>
          ) : course.progress === 100 ? (
            <>
              <CheckCircle2 className="h-4 w-4 mr-2" />
              Review Course
            </>
          ) : (
            <>
              <ArrowRight className="h-4 w-4 mr-2" />
              Continue
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );

  const EmptyState = () => (
    <Card>
      <CardContent className="py-16 text-center">
        <BookOpen className="h-16 w-16 mx-auto text-muted-foreground mb-6" />
        <h3 className="text-xl font-semibold mb-2">No courses yet</h3>
        <p className="text-muted-foreground mb-6 max-w-md mx-auto">
          You haven't been assigned any courses or purchased any training yet. 
          Browse our catalogue to get started.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button onClick={() => navigate('/courses')}>
            <BookOpen className="h-4 w-4 mr-2" />
            Browse Catalogue
          </Button>
          <Button variant="outline" onClick={() => navigate('/contact')}>
            <Mail className="h-4 w-4 mr-2" />
            Contact Sales
          </Button>
        </div>
      </CardContent>
    </Card>
  );

  const TabEmptyState = ({ message }: { message: string }) => (
    <Card>
      <CardContent className="py-8 text-center text-muted-foreground">
        {message}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-foreground">My Courses</h1>
            <p className="text-muted-foreground mt-1">
              View all courses assigned to you or that you've enrolled in
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate('/courses')}>
            <BookOpen className="h-4 w-4 mr-2" />
            Browse all courses
          </Button>
        </div>

        {courses.length === 0 ? (
          <EmptyState />
        ) : (
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
              <TabsTrigger value="assigned">
                Assigned ({assignedCourses.length})
              </TabsTrigger>
              <TabsTrigger value="in-progress">
                In Progress ({inProgressCourses.length})
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed ({completedCourses.length})
              </TabsTrigger>
              <TabsTrigger value="all">
                All ({allCourses.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="assigned" className="mt-6">
              {assignedCourses.length === 0 ? (
                <TabEmptyState message="No assigned courses. Courses assigned by your organisation will appear here." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {assignedCourses.map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="in-progress" className="mt-6">
              {inProgressCourses.length === 0 ? (
                <TabEmptyState message="No courses in progress. Start a course to see it here." />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {inProgressCourses.map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="completed" className="mt-6">
              {completedCourses.length === 0 ? (
                <TabEmptyState message="No completed courses yet. Keep learning!" />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {completedCourses.map(course => (
                    <CourseCard key={course.id} course={course} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="all" className="mt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {allCourses.map(course => (
                  <CourseCard key={course.id} course={course} />
                ))}
              </div>
            </TabsContent>
          </Tabs>
        )}
      </div>
    </DashboardLayout>
  );
}
