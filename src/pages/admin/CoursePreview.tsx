import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PortalLayout } from '@/components/layouts/PortalLayout';
import { useRoles } from '@/hooks/useRoles';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Clock, BookOpen, Award, Users, Play, FileText, HelpCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

interface Course {
  id: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  overview: string | null;
  category: string;
  level: string | null;
  duration_minutes: number;
  learning_outcomes: string[];
  target_audience: string[];
  requirements: string[];
  has_certificate: boolean;
  cpd_hours: number;
  thumbnail_url: string | null;
}

interface Module {
  id: string;
  title: string;
  description: string | null;
  order_index: number;
}

interface Lesson {
  id: string;
  module_id: string | null;
  title: string;
  lesson_type: string;
  duration_minutes: number | null;
  order_index: number;
}

export default function CoursePreview() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isSuperAdmin, isOpsTrainingAdmin, loading: rolesLoading } = useRoles();
  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!rolesLoading && !isSuperAdmin && !isOpsTrainingAdmin) {
      navigate('/access-denied');
    }
  }, [rolesLoading, isSuperAdmin, isOpsTrainingAdmin, navigate]);

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  const fetchData = async () => {
    try {
      const [courseRes, modulesRes, lessonsRes] = await Promise.all([
        supabase.from('courses').select('*').eq('id', id).single(),
        supabase.from('modules').select('*').eq('course_id', id).order('order_index'),
        supabase.from('lessons').select('*').eq('course_id', id).order('order_index'),
      ]);

      if (courseRes.error) throw courseRes.error;
      
      setCourse({
        ...courseRes.data,
        learning_outcomes: Array.isArray(courseRes.data.learning_outcomes) ? (courseRes.data.learning_outcomes as string[]) : [],
        target_audience: Array.isArray(courseRes.data.target_audience) ? (courseRes.data.target_audience as string[]) : [],
        requirements: Array.isArray(courseRes.data.requirements) ? (courseRes.data.requirements as string[]) : [],
      });
      setModules(modulesRes.data || []);
      setLessons(lessonsRes.data || []);
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course');
      navigate('/admin-portal/courses');
    } finally {
      setLoading(false);
    }
  };

  const getLessonIcon = (type: string) => {
    switch (type) {
      case 'video':
        return <Play className="h-4 w-4" />;
      case 'quiz':
        return <HelpCircle className="h-4 w-4" />;
      default:
        return <FileText className="h-4 w-4" />;
    }
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  if (rolesLoading || loading) {
    return (
      <PortalLayout title="Course Preview" backHref={`/admin-portal/courses/${id}/edit`} backLabel="Edit Course">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  if (!course) {
    return (
      <PortalLayout title="Course Preview" backHref="/admin-portal/courses" backLabel="All Courses">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Course not found</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title={`Preview: ${course.title}`} backHref={`/admin-portal/courses/${course.id}/edit`} backLabel="Edit Course">
      <div className="space-y-6 p-4 lg:p-8">
        <div className="flex items-center gap-4">
          <div>
            <Badge variant="outline">Preview Mode</Badge>
            <h1 className="text-2xl font-bold mt-1">{course.title}</h1>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            {/* Hero */}
            <Card>
              <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 rounded-t-lg flex items-center justify-center">
                {course.thumbnail_url ? (
                  <img src={course.thumbnail_url} alt={course.title} className="w-full h-full object-cover rounded-t-lg" />
                ) : (
                  <BookOpen className="h-16 w-16 text-primary/40" />
                )}
              </div>
              <CardHeader>
                <div className="flex items-center gap-2 mb-2">
                  <Badge>{course.category}</Badge>
                  {course.level && <Badge variant="outline">{course.level}</Badge>}
                </div>
                <CardTitle className="text-2xl">{course.title}</CardTitle>
                {course.subtitle && <CardDescription className="text-lg">{course.subtitle}</CardDescription>}
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">{course.description}</p>
              </CardContent>
            </Card>

            {/* Overview */}
            {course.overview && (
              <Card>
                <CardHeader>
                  <CardTitle>About This Course</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-line">{course.overview}</p>
                </CardContent>
              </Card>
            )}

            {/* Learning Outcomes */}
            {course.learning_outcomes.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>What You'll Learn</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {course.learning_outcomes.map((outcome, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <div className="h-5 w-5 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <span className="text-xs text-primary font-medium">{index + 1}</span>
                        </div>
                        <span>{outcome}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Curriculum */}
            <Card>
              <CardHeader>
                <CardTitle>Course Content</CardTitle>
                <CardDescription>
                  {modules.length} modules • {lessons.length} lessons
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Accordion type="multiple" className="space-y-2">
                  {modules.map((module, index) => {
                    const moduleLessons = lessons.filter(l => l.module_id === module.id);
                    return (
                      <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-4">
                        <AccordionTrigger className="hover:no-underline">
                          <div className="text-left">
                            <p className="font-medium">Module {index + 1}: {module.title}</p>
                            <p className="text-sm text-muted-foreground">{moduleLessons.length} lessons</p>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-2 pt-2">
                            {moduleLessons.map((lesson) => (
                              <div key={lesson.id} className="flex items-center justify-between p-2 bg-muted rounded">
                                <div className="flex items-center gap-2">
                                  {getLessonIcon(lesson.lesson_type)}
                                  <span className="text-sm">{lesson.title}</span>
                                </div>
                                {lesson.duration_minutes && (
                                  <span className="text-xs text-muted-foreground">{lesson.duration_minutes} min</span>
                                )}
                              </div>
                            ))}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Course Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Clock className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-sm font-medium">Duration</p>
                    <p className="text-sm text-muted-foreground">{formatDuration(course.duration_minutes)}</p>
                  </div>
                </div>
                
                {course.cpd_hours > 0 && (
                  <div className="flex items-center gap-3">
                    <Award className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">CPD Hours</p>
                      <p className="text-sm text-muted-foreground">{course.cpd_hours} hours</p>
                    </div>
                  </div>
                )}

                {course.has_certificate && (
                  <div className="flex items-center gap-3">
                    <Award className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="text-sm font-medium">Certificate</p>
                      <p className="text-sm text-muted-foreground">Included on completion</p>
                    </div>
                  </div>
                )}

                <Separator />

                <Button className="w-full">Enroll Now</Button>
              </CardContent>
            </Card>

            {course.target_audience.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Who This Is For
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {course.target_audience.map((audience, index) => (
                      <li key={index} className="text-sm text-muted-foreground">• {audience}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {course.requirements.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Requirements</CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {course.requirements.map((req, index) => (
                      <li key={index} className="text-sm text-muted-foreground">• {req}</li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </PortalLayout>
  );
}
