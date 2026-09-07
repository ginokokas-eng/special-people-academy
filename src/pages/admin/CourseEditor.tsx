import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { PortalLayout } from '@/components/layouts/PortalLayout';
import { useRoles } from '@/hooks/useRoles';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Copy, Eye, Loader2, Save, X } from '@/components/icons';
import { toast } from 'sonner';
import { CourseOverviewTab } from '@/components/admin/course-builder/CourseOverviewTab';
import { CourseModulesTab } from '@/components/admin/course-builder/CourseModulesTab';
import { CourseResourcesTab } from '@/components/admin/course-builder/CourseResourcesTab';
import { CourseVideoTab } from '@/components/admin/course-builder/CourseVideoTab';
import { CourseQuizTab } from '@/components/admin/course-builder/CourseQuizTab';
import { CoursePublishingTab } from '@/components/admin/course-builder/CoursePublishingTab';
import { ScormPackageManager } from '@/components/admin/ScormPackageManager';
import { CourseInsightsTab } from '@/components/admin/course-builder/CourseInsightsTab';
import { CourseHistoryTab } from '@/components/admin/course-builder/CourseHistoryTab';
import { CloneCourseDialog, type CloneSource } from '@/components/admin/course-builder/CloneCourseDialog';


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
  prerequisite_course_id: string | null;
  prerequisite_required: boolean;
  require_recompletion_on_change: boolean;
  cloned_from_course_id: string | null;
}



export default function CourseEditor() {
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  // The Modules tab links here (?tab=quiz) when a quiz lesson has no questions.
  const activeTab = searchParams.get('tab') || 'overview';
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isAdmin, isSuperAdmin, isOpsTrainingAdmin, loading: rolesLoading } = useRoles();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [cloneSource, setCloneSource] = useState<CloneSource | null>(null);
  /** Title of the course this one was copied from, when it is a copy. */
  const [clonedFromTitle, setClonedFromTitle] = useState<string | null>(null);
  // The dialog lands here with ?cloned=1&media=ok|partial|failed after a copy.
  const [bannerDismissed, setBannerDismissed] = useState(false);
  const justCloned = searchParams.get('cloned') === '1' && !bannerDismissed;
  /** True while any file in this course still points at the original course. */
  const [mediaStale, setMediaStale] = useState(searchParams.get('media') !== 'ok');
  const [retryingMedia, setRetryingMedia] = useState(false);



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

      if (data.cloned_from_course_id) {
        const { data: sourceRow } = await supabase
          .from('courses')
          .select('title')
          .eq('id', data.cloned_from_course_id)
          .maybeSingle();
        setClonedFromTitle(sourceRow?.title ?? null);
        await checkMedia(data.id, data.cloned_from_course_id);
      } else {
        setClonedFromTitle(null);
        setMediaStale(false);
      }

    } catch (error) {
      console.error('Error fetching course:', error);
      toast.error('Failed to load course');
      navigate('/admin-portal/courses');
    } finally {
      setLoading(false);
    }
  };

  /**
   * Does any uploaded file in this copy still sit in the original course's
   * folder? Files there are refused for this course's learners, so staff are
   * offered a retry until nothing points at the original any more.
   */
  const checkMedia = async (courseId: string, sourceId: string) => {
    const { data: lessons } = await supabase.from('lessons').select('id').eq('course_id', courseId);
    const lessonIds = (lessons ?? []).map((l) => l.id);
    if (!lessonIds.length) {
      setMediaStale(false);
      return;
    }
    const [{ data: blocks }, { data: sources }] = await Promise.all([
      supabase.from('lesson_blocks').select('payload').in('lesson_id', lessonIds),
      supabase.from('lesson_video_sources').select('source_url').in('lesson_id', lessonIds),
    ]);
    const stale =
      (blocks ?? []).some((b) => JSON.stringify(b.payload ?? {}).includes(`${sourceId}/`)) ||
      (sources ?? []).some((s) => String(s.source_url ?? '').startsWith(`${sourceId}/`));
    setMediaStale(stale);
  };

  const retryMedia = async () => {
    if (!course?.cloned_from_course_id) return;
    setRetryingMedia(true);
    try {
      const { error } = await supabase.functions.invoke('clone-course-media', {
        body: { course_id: course.id },
      });
      if (error) throw error;
      await checkMedia(course.id, course.cloned_from_course_id);
      toast.success('Files copied');
    } catch (err) {
      console.error('Retrying the media copy failed:', err);
      toast.error('The files could not be copied. Please try again.');
    } finally {
      setRetryingMedia(false);
    }
  };

  const retryButton = (
    <Button
      variant="outline"
      size="sm"
      data-testid="clone-media-retry"
      onClick={retryMedia}
      disabled={retryingMedia}
    >
      {retryingMedia && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
      Retry media copy
    </Button>
  );

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
          prerequisite_course_id: course.prerequisite_course_id,
          prerequisite_required: course.prerequisite_required,
          require_recompletion_on_change: course.require_recompletion_on_change,
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
      <PortalLayout title="Course Editor" backHref="/admin-portal/courses" backLabel="All Courses">
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </PortalLayout>
    );
  }

  if (!course) {
    return (
      <PortalLayout title="Course Editor" backHref="/admin-portal/courses" backLabel="All Courses">
        <div className="text-center py-12">
          <p className="text-muted-foreground">Course not found</p>
        </div>
      </PortalLayout>
    );
  }

  return (
    <PortalLayout title={course.title} backHref="/admin-portal/courses" backLabel="All Courses">
      <div className="space-y-6 p-4 lg:p-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{course.title}</h1>
            <p className="text-muted-foreground">Course Editor</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate(`/admin-portal/courses/${course.id}/preview`)}>
              <Eye className="h-4 w-4 mr-2" />
              Preview
            </Button>
            <Button
              variant="outline"
              data-testid="course-duplicate"
              onClick={() => setCloneSource({ id: course.id, title: course.title })}
            >
              <Copy className="h-4 w-4 mr-2" />
              Duplicate course
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

        {justCloned && (
          <Alert data-testid="clone-banner">
            <AlertDescription className="flex items-start justify-between gap-4">
              <span className="space-y-2 block">
                <span className="block">
                  Copied from {clonedFromTitle ?? 'the original course'} — nothing is published yet.
                  {mediaStale
                    ? ' Some videos or images could not be copied and still point at the original course.'
                    : ''}
                </span>
                {mediaStale && <span className="block">{retryButton}</span>}
              </span>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Dismiss this message"
                onClick={() => setBannerDismissed(true)}
              >
                <X className="h-4 w-4" />
              </Button>
            </AlertDescription>
          </Alert>
        )}


        <Tabs value={activeTab} onValueChange={(v) => setSearchParams({ tab: v }, { replace: true })} className="space-y-6">
          <TabsList className="grid w-full grid-cols-9">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="modules">Modules & Lessons</TabsTrigger>
            <TabsTrigger value="resources">Resources</TabsTrigger>
            <TabsTrigger value="video">Video</TabsTrigger>
            <TabsTrigger value="quiz">Quiz Builder</TabsTrigger>
            <TabsTrigger value="scorm">SCORM</TabsTrigger>
            <TabsTrigger value="publishing">Publishing</TabsTrigger>
            <TabsTrigger value="insights">Insights</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-3">
            {course.cloned_from_course_id && (
              <p className="text-sm text-muted-foreground" data-testid="cloned-from-line">
                Cloned from{' '}
                <Link
                  to={`/admin-portal/courses/${course.cloned_from_course_id}/edit`}
                  className="underline underline-offset-2"
                >
                  {clonedFromTitle ?? 'the original course'}
                </Link>
              </p>
            )}
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
              isSuperAdmin={isAdmin}
              userEmail={user?.email || ''}
            />
          </TabsContent>

          <TabsContent value="insights">
            <CourseInsightsTab courseId={course.id} />
          </TabsContent>

          <TabsContent value="history">
            <CourseHistoryTab courseId={course.id} />
          </TabsContent>
        </Tabs>
      </div>

      <CloneCourseDialog source={cloneSource} onOpenChange={() => setCloneSource(null)} />
    </PortalLayout>
  );
}

