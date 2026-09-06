import { useCallback, useEffect, useState } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { CheckCircle, AlertTriangle, Clock, Eye, Send, Globe, Loader2, Lock, RefreshCw } from '@/components/icons';
import { toast } from 'sonner';
import { evaluatePublishChecks, type PublishCheck } from './publishChecks';

interface CourseVersion {
  id: string;
  version: number;
  published_at: string | null;
  published_by: string | null;
  snapshot: unknown;
}


interface Course {
  id: string;
  title: string;
  category: string;
  status: string;
  is_published: boolean;
}

interface CoursePublishingTabProps {
  course: Course;
  onUpdate: (updates: Partial<Course>) => void;
  isSuperAdmin: boolean;
  userEmail: string;
}

const CLINICAL_CATEGORIES = [
  'Clinical & Emergency Care',
  'Complex Needs & Specialist Care',
];

export function CoursePublishingTab({ course, onUpdate, isSuperAdmin, userEmail }: CoursePublishingTabProps) {
  const [saving, setSaving] = useState(false);
  const [checks, setChecks] = useState<PublishCheck[]>([]);
  const [checking, setChecking] = useState(true);
  const [versions, setVersions] = useState<CourseVersion[]>([]);
  const [names, setNames] = useState<Record<string, string>>({});
  const [openSnapshot, setOpenSnapshot] = useState<CourseVersion | null>(null);

  const isClinicalCourse = CLINICAL_CATEGORIES.includes(course.category);
  const isMarina = userEmail.toLowerCase() === 'marina@specialpeople.org.uk';
  const canPublishClinical = isSuperAdmin || isMarina;
  const permittedToPublish = isClinicalCourse ? canPublishClinical : true;

  const failing = checks.filter((c) => !c.passed);
  const readyToPublish = !checking && failing.length === 0;
  // Publishing is blocked while any check fails. Draft/review moves stay open.
  const canPublish = permittedToPublish && readyToPublish;

  const runChecks = useCallback(async () => {
    setChecking(true);
    try {
      setChecks(await evaluatePublishChecks(course.id));
    } catch (error) {
      console.error('Error running publish checks:', error);
      toast.error('Could not check publish readiness');
      setChecks([]);
    } finally {
      setChecking(false);
    }
  }, [course.id]);

  /** Published snapshots, newest first (staff-only audit trail). */
  const loadVersions = useCallback(async () => {
    const { data, error } = await supabase
      .from('course_versions')
      .select('id, version, published_at, published_by, snapshot')
      .eq('course_id', course.id)
      .order('version', { ascending: false });
    if (error) {
      console.error('Error loading course versions:', error);
      return;
    }
    const rows = (data || []) as unknown as CourseVersion[];
    setVersions(rows);
    const ids = [...new Set(rows.map((r) => r.published_by).filter(Boolean))] as string[];
    if (ids.length) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('user_id, full_name')
        .in('user_id', ids);
      setNames(
        Object.fromEntries(
          (profiles || []).map((p) => [p.user_id as string, (p.full_name as string) || 'Unknown'])
        )
      );
    }
  }, [course.id]);

  useEffect(() => {
    void runChecks();
  }, [runChecks]);

  useEffect(() => {
    void loadVersions();
  }, [loadVersions]);



  const handleStatusChange = async (newStatus: string) => {
    // Only the transition to published is gated.
    if (newStatus === 'published') {
      if (!permittedToPublish) {
        toast.error('You do not have permission to publish this course');
        return;
      }
      if (!readyToPublish) {
        toast.error('Fix the “Ready to publish” checklist first');
        return;
      }
    }
    setSaving(true);
    try {

      const updates: any = { status: newStatus };
      
      // If moving to published, also set is_published
      if (newStatus === 'published') {
        updates.is_published = true;
      } else {
        updates.is_published = false;
      }

      const { error } = await supabase
        .from('courses')
        .update(updates)
        .eq('id', course.id);

      if (error) throw error;

      // Audit artefact only: a snapshot of the course as published. The learner
      // renderer keeps reading the live lesson_blocks rows.
      if (newStatus === 'published') {
        const { data: version, error: versionError } = await supabase.rpc('publish_course_version', {
          _course_id: course.id,
        });
        if (versionError) {
          console.error('Error snapshotting course version:', versionError);
          toast.error('Published, but the version snapshot could not be saved');
        } else {
          toast.success(`Version ${version} published`);
        }
        void loadVersions();
      }

      onUpdate(updates);
      toast.success(`Course ${newStatus === 'published' ? 'published' : 'status updated'}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    } finally {
      setSaving(false);
    }
  };


  const handleUnpublish = async () => {
    if (!(await confirmDialog({ title: 'Unpublish course?', description: 'It will no longer be visible in the catalogue.', confirmLabel: 'Unpublish' }))) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('courses')
        .update({ status: 'draft', is_published: false })
        .eq('id', course.id);

      if (error) throw error;
      
      onUpdate({ status: 'draft', is_published: false });
      toast.success('Course unpublished');
    } catch (error) {
      console.error('Error unpublishing:', error);
      toast.error('Failed to unpublish');
    } finally {
      setSaving(false);
    }
  };

  const getStatusIcon = () => {
    if (course.is_published) return <Globe className="h-5 w-5 text-primary" />;
    switch (course.status) {
      case 'review':
        return <Clock className="h-5 w-5 text-accent-foreground" />;
      default:
        return <Eye className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getStatusLabel = () => {
    if (course.is_published) return 'Published';
    switch (course.status) {
      case 'review':
        return 'In Review';
      default:
        return 'Draft';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Publishing Status</CardTitle>
          <CardDescription>Manage course visibility and publishing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center gap-4 p-4 bg-muted rounded-lg">
            {getStatusIcon()}
            <div className="flex-1">
              <p className="font-medium">Current Status</p>
              <p className="text-sm text-muted-foreground">{getStatusLabel()}</p>
            </div>
            <Badge variant={course.is_published ? 'default' : 'secondary'}>
              {getStatusLabel()}
            </Badge>
          </div>

          {isClinicalCourse && !canPublishClinical && (
            <Alert>
              <Lock className="h-4 w-4" />
              <AlertTitle>Clinical Course Approval Required</AlertTitle>
              <AlertDescription>
                This is a clinical course ({course.category}). Only Super Admins or Marina (Clinical Governance Lead) can publish clinical courses.
                You can submit it for review, and they will be able to publish it.
              </AlertDescription>
            </Alert>
          )}

          {!course.is_published && permittedToPublish && !checking && failing.length > 0 && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Not ready to publish yet</AlertTitle>
              <AlertDescription>
                {failing.length} {failing.length === 1 ? 'item still needs' : 'items still need'}{' '}
                attention — see the “Ready to publish” list below. You can still save as draft or
                send for review.
              </AlertDescription>
            </Alert>
          )}



          {!course.is_published && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Change Status</Label>
                <Select
                  value={course.status}
                  onValueChange={handleStatusChange}
                  disabled={saving}
                >
                  <SelectTrigger className="w-64">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">
                      <div className="flex items-center gap-2">
                        <Eye className="h-4 w-4" />
                        Draft
                      </div>
                    </SelectItem>
                    <SelectItem value="review">
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        Submit for Review
                      </div>
                    </SelectItem>
                    {canPublish && (
                      <SelectItem value="published">
                        <div className="flex items-center gap-2">
                          <Globe className="h-4 w-4" />
                          Publish
                        </div>
                      </SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {course.status === 'review' && canPublish && (
                <Button onClick={() => handleStatusChange('published')} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Send className="h-4 w-4 mr-2" />}
                  Publish Course
                </Button>
              )}
            </div>
          )}

          {course.is_published && (
            <div className="space-y-4">
              <Alert className="bg-primary/10 border-primary/20">
                <CheckCircle className="h-4 w-4 text-primary" />
                <AlertTitle className="text-primary">Course is Live</AlertTitle>
                <AlertDescription className="text-muted-foreground">
                  This course is visible in the public catalogue and available for learners.
                </AlertDescription>
              </Alert>

              <Button variant="outline" onClick={handleUnpublish} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Eye className="h-4 w-4 mr-2" />}
                Unpublish
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle>Ready to publish</CardTitle>
            <CardDescription>
              Checked against this course's real content. Publishing stays locked until everything
              passes — saving as draft or sending for review is always allowed.
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => void runChecks()} disabled={checking}>
            {checking ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4 mr-2" />
            )}
            Re-check
          </Button>
        </CardHeader>
        <CardContent>
          {checking ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Checking this course…
            </div>
          ) : checks.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Checks are unavailable right now. Try Re-check.
            </p>
          ) : (
            <div className="space-y-3">
              {checks.map((check) => (
                <div key={check.id} className="flex items-start gap-3">
                  {check.passed ? (
                    <CheckCircle className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  ) : (
                    <AlertTriangle
                      className="h-5 w-5 shrink-0 text-destructive"
                      aria-hidden="true"
                    />
                  )}
                  <div className="space-y-0.5">
                    <p
                      className={
                        check.passed
                          ? 'text-sm text-foreground'
                          : 'text-sm font-medium text-foreground'
                      }
                    >
                      {check.label}
                    </p>
                    {!check.passed && (
                      <p className="text-sm text-muted-foreground">
                        {check.detail} Fix this in the “{check.tab}” tab.
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
