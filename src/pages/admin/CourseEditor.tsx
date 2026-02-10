import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { PortalLayout } from '@/components/layouts/PortalLayout';
import { useRoles } from '@/hooks/useRoles';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Eye, Loader2, Save } from 'lucide-react';
import { toast } from 'sonner';
import { CourseOverviewTab } from '@/components/admin/course-builder/CourseOverviewTab';
import { CourseModulesTab } from '@/components/admin/course-builder/CourseModulesTab';
import { CourseResourcesTab } from '@/components/admin/course-builder/CourseResourcesTab';
import { CourseVideoTab } from '@/components/admin/course-builder/CourseVideoTab';
import { CourseQuizTab } from '@/components/admin/course-builder/CourseQuizTab';
import { CoursePublishingTab } from '@/components/admin/course-builder/CoursePublishingTab';
import { ScormPackageManager } from '@/components/admin/ScormPackageManager';

interface Course {
  id: string;
  title: string;
  slug: string | null;
  description: string | null;
  category: string;
  subtitle: string | null;
  overview: string | null;
  learning_outcomes: string[];
  target_audience: string[];
  requirements: string[];
  duration_minutes: number;
  delivery_type: string | null;
  available_delivery_types: string[];
  requires_practical_signoff: boolean;
  has_certificate: boolean;
  certificate_expiry_months: number | null;
  cpd_hours: number;
  cpd_eligible: boolean;
  cpd_certified: boolean;
  status: string;
  is_published: boolean;
  level: string | null;
  thumbnail_url: string | null;
}

export default function CourseEditor() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isSuperAdmin, isOpsTrainingAdmin, loading: rolesLoading } = useRoles();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!rolesLoading && !isSuperAdmin && !isOpsTrainingAdmin) {
      navigate('/access-denied');
    }
  }, [rolesLoading, isSuperAdmin, isOpsTrainingAdmin, navigate]);

  useEffect(() => {
    if (id) {
      fetchCourse();
    }
  }, [id]);

  const fetchCourse = async () => {
    try {
      const { data, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      setCourse({
        ...data,
        learning_outcomes: Array.isArray(data.learning_outcomes) ? (data.learning_outcomes as string[]) : [],
        target_audience: Array.isArray(data.target_audience) ? (data.target_audience as string[]) : [],
        requirements: Array.isArray(data.requirements) ? (data.requirements as string[]) : [],
        available_delivery_types: Array.isArray(data.available_delivery_types) ? data.available_delivery_types : [],
      });
    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course');
      navigate('/app/admin/courses');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!course) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({
          title: course.title,
          slug: course.slug,
          description: course.description,
          category: course.category,
          subtitle: course.subtitle,
          overview: course.overview,
          learning_outcomes: course.learning_outcomes,
          target_audience: course.target_audience,
          requirements: course.requirements,
          duration_minutes: course.duration_minutes,
          delivery_type: course.delivery_type,
          available_delivery_types: course.available_delivery_types,
          requires_practical_signoff: course.requires_practical_signoff,
          has_certificate: course.has_certificate,
          certificate_expiry_months: course.certificate_expiry_months,
          cpd_hours: course.cpd_hours,
          cpd_eligible: course.cpd_eligible,
          cpd_certified: course.cpd_certified,
          status: course.status,
          level: course.level,
          thumbnail_url: course.thumbnail_url,
          updated_at: new Date().toISOString(),
        })
        .eq('id', course.id);

      if (error) throw error;
      toast.success('Course saved');
    } catch (error) {
      console.error('Error saving course:', error);
      toast.error('Failed to save course');
    } finally {
      setSaving(false);
    }
  };

  const updateCourse = (updates: Partial<Course>) => {
    setCourse(prev => prev ? { ...prev, ...updates } : null);
  };

  if (rolesLoading || loading) {
    return (
      <PortalLayout title="Course Editor" backHref="/app/admin/courses" backLabel="All Courses">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  if (!course) {
    return (
      <PortalLayout title="Course Editor" backHref="/app/admin/courses" backLabel="All Courses">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Course not found</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title={course.title} backHref="/app/admin/courses" backLabel="All Courses">
      <div className="space-y-6 p-4 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground">Course Editor</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/app/admin/courses/${course.id}/preview`)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-7">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="modules">Modules & Lessons</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="quiz">Quiz Builder</TabsTrigger>
            <TabsTrigger value="scorm">SCORM</TabsTrigger>
            <TabsTrigger value="publishing">Publishing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <CourseOverviewTab course={course} onUpdate={updateCourse} />
          </TabsContent>

          <TabsContent value="modules">
            <CourseModulesTab courseId={course.id} />
          </TabsContent>

          <TabsContent value="resources">
            <CourseResourcesTab courseId={course.id} />
          </TabsContent>

          <TabsContent value="video">
            <CourseVideoTab courseId={course.id} />
          </TabsContent>

          <TabsContent value="quiz">
            <CourseQuizTab courseId={course.id} />
          </TabsContent>

          <TabsContent value="scorm">
            <ScormPackageManager />
          </TabsContent>

          <TabsContent value="publishing">
            <CoursePublishingTab 
              course={course} 
              onUpdate={updateCourse}
              isSuperAdmin={isSuperAdmin}
              userEmail={user?.email || ''}
            />
          </TabsContent>
        </Tabs>
      </div>
    </PortalLayout>
  );
}
