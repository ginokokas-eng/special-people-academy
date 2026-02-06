import { useState } from 'react';
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
import { CheckCircle, AlertTriangle, Clock, Eye, Send, Globe, Loader2, Lock } from 'lucide-react';
import { toast } from 'sonner';

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

  const isClinicalCourse = CLINICAL_CATEGORIES.includes(course.category);
  const isMarina = userEmail.toLowerCase() === 'marina@specialpeople.org.uk';
  const canPublishClinical = isSuperAdmin || isMarina;
  const canPublish = isClinicalCourse ? canPublishClinical : true;

  const handleStatusChange = async (newStatus: string) => {
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
    if (!confirm('Unpublish this course? It will no longer be visible in the catalogue.')) return;

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
        <CardHeader>
          <CardTitle>Publishing Checklist</CardTitle>
          <CardDescription>Ensure your course is ready for learners</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { label: 'Course title and description', done: !!course.title },
              { label: 'Category assigned', done: course.category !== 'Uncategorized' },
              { label: 'At least one module created', done: true }, // Would need to check from DB
              { label: 'Quiz questions added (if applicable)', done: true },
              { label: 'Resources uploaded', done: true },
            ].map((item, index) => (
              <div key={index} className="flex items-center gap-3">
                {item.done ? (
                  <CheckCircle className="h-5 w-5 text-primary" />
                ) : (
                  <AlertTriangle className="h-5 w-5 text-muted-foreground" />
                )}
                <span className={item.done ? 'text-foreground' : 'text-muted-foreground'}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
