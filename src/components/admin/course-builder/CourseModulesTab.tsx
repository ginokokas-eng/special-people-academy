import { useEffect, useState } from 'react';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { GripVertical, Plus, Trash2, Edit, Loader2, CheckCircle2, AlertTriangle, Info, RefreshCw, ListChecks } from 'lucide-react';
import { toast } from 'sonner';
import type { Database } from '@/integrations/supabase/types';
import { LessonDurationAudit, type AuditLessonInput } from './LessonDurationAudit';

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
  description: string | null;
  lesson_type: LessonType;
  order_index: number;
  duration_minutes: number | null;
  duration_seconds: number | null;
  video_url: string | null;
  scorm_package_id: string | null;
}

interface CourseModulesTabProps {
  courseId: string;
}

const LESSON_TYPE_VALUES = ['video', 'text', 'pdf', 'quiz', 'practical', 'scenario', 'scorm'] as const;
type LessonType = typeof LESSON_TYPE_VALUES[number];
type LessonInsert = Database['public']['Tables']['lessons']['Insert'];
type LessonUpdate = Database['public']['Tables']['lessons']['Update'];

interface LessonForm {
  title: string;
  description: string;
  lesson_type: LessonType;
  duration_minutes: number;
  duration_seconds: number | null;
  scorm_package_id: string;
}

const LESSON_TYPES: Array<{ value: LessonType; label: string }> = [
  { value: 'video', label: 'Video' },
  { value: 'text', label: 'Text/Article' },
  { value: 'pdf', label: 'PDF' },
  { value: 'quiz', label: 'Quiz' },
  { value: 'practical', label: 'Practical Session' },
  { value: 'scenario', label: 'Scenario' },
  { value: 'scorm', label: 'SCORM Package' },
];

function normalizeLessonType(value: string | null): LessonType {
  return LESSON_TYPE_VALUES.includes(value as LessonType) ? (value as LessonType) : 'video';
}

/** Only video/SCORM lessons carry a media duration. */
function isTimedMedia(type: LessonType): boolean {
  return type === 'video' || type === 'scorm';
}

/** Whole-minute display from exact seconds: <60s -> 1 min, else round up. */
function secondsToMinutes(seconds: number | null | undefined): number {
  if (!seconds || seconds <= 0) return 0;
  if (seconds < 60) return 1;
  return Math.ceil(seconds / 60);
}

export function CourseModulesTab({ courseId }: CourseModulesTabProps) {
  const [modules, setModules] = useState<Module[]>([]);
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncingDuration, setSyncingDuration] = useState(false);
  const [auditOpen, setAuditOpen] = useState(false);
  const [moduleDialog, setModuleDialog] = useState<{ open: boolean; module: Module | null }>({ open: false, module: null });
  const [lessonDialog, setLessonDialog] = useState<{ open: boolean; lesson: Lesson | null; moduleId: string | null }>({ open: false, lesson: null, moduleId: null });
  const [saving, setSaving] = useState(false);

  // Form states
  const [moduleForm, setModuleForm] = useState({ title: '', description: '' });
  const [lessonForm, setLessonForm] = useState<LessonForm>({ title: '', description: '', lesson_type: 'video', duration_minutes: 0, duration_seconds: null, scorm_package_id: '' });
  const [scormPackages, setScormPackages] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    fetchData();
    fetchScormPackages();
  }, [courseId]);

  const fetchScormPackages = async () => {
    const { data } = await supabase.from('scorm_packages').select('id, title').order('created_at', { ascending: false });
    setScormPackages(data || []);
  };

  const fetchData = async () => {
    try {
      const [modulesRes, lessonsRes] = await Promise.all([
        supabase.from('modules').select('*').eq('course_id', courseId).order('order_index'),
        supabase.from('lessons').select('*').eq('course_id', courseId).order('order_index'),
      ]);

      if (modulesRes.error) throw modulesRes.error;
      if (lessonsRes.error) throw lessonsRes.error;

      setModules(modulesRes.data || []);
      setLessons((lessonsRes.data || []).map((lesson) => ({
        ...lesson,
        lesson_type: normalizeLessonType(lesson.lesson_type),
      })));
    } catch (error) {
      console.error('Error fetching modules:', error);
      toast.error('Failed to load modules');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateModule = async () => {
    if (!moduleForm.title.trim()) {
      toast.error('Module title is required');
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase.from('modules').insert({
        course_id: courseId,
        title: moduleForm.title,
        description: moduleForm.description || null,
        order_index: modules.length,
      });

      if (error) throw error;
      toast.success('Module created');
      setModuleDialog({ open: false, module: null });
      setModuleForm({ title: '', description: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating module:', error);
      toast.error('Failed to create module');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateModule = async () => {
    if (!moduleDialog.module || !moduleForm.title.trim()) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('modules')
        .update({ title: moduleForm.title, description: moduleForm.description || null })
        .eq('id', moduleDialog.module.id);

      if (error) throw error;
      toast.success('Module updated');
      setModuleDialog({ open: false, module: null });
      fetchData();
    } catch (error) {
      console.error('Error updating module:', error);
      toast.error('Failed to update module');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteModule = async (moduleId: string) => {
    if (!(await confirmDialog({ title: 'Delete module?', description: 'This will permanently delete this module and all its lessons.' }))) return;

    try {
      const { error } = await supabase.from('modules').delete().eq('id', moduleId);
      if (error) throw error;
      toast.success('Module deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting module:', error);
      toast.error('Failed to delete module');
    }
  };

  const handleCreateLesson = async () => {
    if (!lessonForm.title.trim()) {
      toast.error('Lesson title is required');
      return;
    }
    if (lessonForm.lesson_type === 'scorm' && !lessonForm.scorm_package_id) {
      toast.error('Select a SCORM package before creating this lesson');
      return;
    }

    setSaving(true);
    try {
      const moduleLessons = lessons.filter(l => l.module_id === lessonDialog.moduleId);
      const insertData: LessonInsert = {
        course_id: courseId,
        module_id: lessonDialog.moduleId,
        title: lessonForm.title,
        description: lessonForm.description || null,
        lesson_type: lessonForm.lesson_type,
        duration_minutes: lessonForm.duration_minutes || 0,
        duration_seconds: isTimedMedia(lessonForm.lesson_type) ? (lessonForm.duration_seconds ?? null) : null,
        order_index: moduleLessons.length,
      };
      if (lessonForm.lesson_type === 'scorm' && lessonForm.scorm_package_id) {
        insertData.scorm_package_id = lessonForm.scorm_package_id;
      }
      const { error } = await supabase.from('lessons').insert(insertData);

      if (error) throw error;
      toast.success('Lesson created');
      setLessonDialog({ open: false, lesson: null, moduleId: null });
      setLessonForm({ title: '', description: '', lesson_type: 'video', duration_minutes: 0, duration_seconds: null, scorm_package_id: '' });
      fetchData();
    } catch (error) {
      console.error('Error creating lesson:', error);
      toast.error('Failed to create lesson');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateLesson = async () => {
    if (!lessonDialog.lesson || !lessonForm.title.trim()) return;
    if (lessonForm.lesson_type === 'scorm' && !lessonForm.scorm_package_id) {
      toast.error('Select a SCORM package before saving this lesson');
      return;
    }

    setSaving(true);
    try {
      const updateData: LessonUpdate = {
        title: lessonForm.title,
        description: lessonForm.description || null,
        lesson_type: lessonForm.lesson_type,
        duration_minutes: lessonForm.duration_minutes || 0,
        duration_seconds: isTimedMedia(lessonForm.lesson_type) ? (lessonForm.duration_seconds ?? null) : null,
      };
      updateData.scorm_package_id = lessonForm.lesson_type === 'scorm'
        ? lessonForm.scorm_package_id
        : null;
      const { error } = await supabase
        .from('lessons')
        .update(updateData)
        .eq('id', lessonDialog.lesson.id);

      if (error) throw error;
      toast.success('Lesson updated');
      setLessonDialog({ open: false, lesson: null, moduleId: null });
      fetchData();
    } catch (error) {
      console.error('Error updating lesson:', error);
      toast.error('Failed to update lesson');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLesson = async (lessonId: string) => {
    if (!(await confirmDialog({ title: 'Delete lesson?', description: 'This will permanently delete this lesson.' }))) return;

    try {
      const { error } = await supabase.from('lessons').delete().eq('id', lessonId);
      if (error) throw error;
      toast.success('Lesson deleted');
      fetchData();
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast.error('Failed to delete lesson');
    }
  };

  // Reads the exact media duration (seconds) from the uploaded video and stores it.
  const handleSyncDuration = async () => {
    if (lessonForm.lesson_type === 'scorm') {
      toast.message('SCORM duration cannot be read automatically — set the exact seconds manually.');
      return;
    }
    // Resolve a playable source: lesson.video_url or the default lesson_video_sources entry.
    let src = lessonDialog.lesson?.video_url || '';
    if (!src && lessonDialog.lesson?.id) {
      const { data } = await supabase
        .from('lesson_video_sources')
        .select('source_url, is_default')
        .eq('lesson_id', lessonDialog.lesson.id)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();
      src = data?.source_url || '';
    }
    if (!src) {
      toast.error('No uploaded video found for this lesson — set the duration manually.');
      return;
    }
    setSyncingDuration(true);
    try {
      const seconds = await new Promise<number>((resolve, reject) => {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => resolve(v.duration);
        v.onerror = () => reject(new Error('Could not load video metadata'));
        v.src = src;
      });
      if (!isFinite(seconds) || seconds <= 0) throw new Error('Invalid duration');
      const rounded = Math.round(seconds);
      setLessonForm((f) => ({ ...f, duration_seconds: rounded }));
      toast.success(`Duration synced: ${rounded}s (${secondsToMinutes(rounded)} min)`);
    } catch (e) {
      console.error('Sync duration failed:', e);
      toast.error('Could not read video duration — set it manually.');
    } finally {
      setSyncingDuration(false);
    }
  };

  const openEditModule = (module: Module) => {
    setModuleForm({ title: module.title, description: module.description || '' });
    setModuleDialog({ open: true, module });
  };

  const openEditLesson = (lesson: Lesson) => {
    setLessonForm({
      title: lesson.title,
      description: lesson.description || '',
      lesson_type: lesson.lesson_type || 'video',
      duration_minutes: lesson.duration_minutes || 0,
      duration_seconds: lesson.duration_seconds ?? null,
      scorm_package_id: lesson.scorm_package_id || '',
    });
    setLessonDialog({ open: true, lesson, moduleId: lesson.module_id });
  };

  const openAddLesson = (moduleId: string) => {
    setLessonForm({ title: '', description: '', lesson_type: 'video', duration_minutes: 0, duration_seconds: null, scorm_package_id: '' });
    setLessonDialog({ open: true, lesson: null, moduleId });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Modules & Lessons</CardTitle>
              <CardDescription>Organize your course content</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={() => setAuditOpen(true)}
                disabled={lessons.length === 0}
              >
                <ListChecks className="h-4 w-4 mr-2" />
                Audit lesson durations
              </Button>
              <Button onClick={() => {
                setModuleForm({ title: '', description: '' });
                setModuleDialog({ open: true, module: null });
              }}>
                <Plus className="h-4 w-4 mr-2" />
                Add Module
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {modules.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <p>No modules yet. Create your first module to get started.</p>
            </div>
          ) : (
            <Accordion type="multiple" className="space-y-4">
              {modules.map((module, index) => {
                const moduleLessons = lessons.filter(l => l.module_id === module.id);
                return (
                  <AccordionItem key={module.id} value={module.id} className="border rounded-lg px-4">
                    <AccordionTrigger className="hover:no-underline">
                      <div className="flex items-center gap-3">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <span className="font-medium">Module {index + 1}: {module.title}</span>
                        <span className="text-sm text-muted-foreground">({moduleLessons.length} lessons)</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="pt-4">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <p className="text-sm text-muted-foreground">{module.description || 'No description'}</p>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => openEditModule(module)}>
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button variant="destructive" size="sm" onClick={() => handleDeleteModule(module.id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="space-y-2">
                          {moduleLessons.map((lesson, lessonIndex) => (
                            <div
                              key={lesson.id}
                              className="flex items-center justify-between p-3 bg-muted rounded-lg"
                            >
                              <div className="flex items-center gap-3">
                                <GripVertical className="h-4 w-4 text-muted-foreground" />
                                <span className="text-sm font-medium">
                                  {lessonIndex + 1}. {lesson.title}
                                </span>
                                <span className="text-xs px-2 py-1 bg-background rounded">
                                  {LESSON_TYPES.find(t => t.value === lesson.lesson_type)?.label || lesson.lesson_type}
                                </span>
                                {lesson.lesson_type === 'scorm' && (
                                  (lesson as any).scorm_package_id ? (
                                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-success/10 text-success">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Package attached
                                    </span>
                                  ) : (
                                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-warning/10 text-warning">
                                      <AlertTriangle className="h-3 w-3" />
                                      No package attached
                                    </span>
                                  )
                                )}
                              </div>
                              <div className="flex gap-2">
                                <Button variant="ghost" size="sm" onClick={() => openEditLesson(lesson)}>
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button variant="ghost" size="sm" onClick={() => handleDeleteLesson(lesson.id)}>
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>

                        <Button variant="outline" size="sm" onClick={() => openAddLesson(module.id)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Lesson
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>
          )}
        </CardContent>
      </Card>

      {/* Module Dialog */}
      <Dialog open={moduleDialog.open} onOpenChange={(open) => setModuleDialog({ ...moduleDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{moduleDialog.module ? 'Edit Module' : 'Add Module'}</DialogTitle>
            <DialogDescription>
              {moduleDialog.module ? 'Update the module details' : 'Create a new module for this course'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="module-title">Title</Label>
              <Input
                id="module-title"
                value={moduleForm.title}
                onChange={(e) => setModuleForm({ ...moduleForm, title: e.target.value })}
                placeholder="Module title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="module-description">Description</Label>
              <Textarea
                id="module-description"
                value={moduleForm.description}
                onChange={(e) => setModuleForm({ ...moduleForm, description: e.target.value })}
                placeholder="Brief description of this module"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setModuleDialog({ open: false, module: null })}>
              Cancel
            </Button>
            <Button onClick={moduleDialog.module ? handleUpdateModule : handleCreateModule} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {moduleDialog.module ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lesson Dialog */}
      <Dialog open={lessonDialog.open} onOpenChange={(open) => setLessonDialog({ ...lessonDialog, open })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{lessonDialog.lesson ? 'Edit Lesson' : 'Add Lesson'}</DialogTitle>
            <DialogDescription>
              {lessonDialog.lesson ? 'Update the lesson details' : 'Create a new lesson'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="lesson-title">Title</Label>
              <Input
                id="lesson-title"
                value={lessonForm.title}
                onChange={(e) => setLessonForm({ ...lessonForm, title: e.target.value })}
                placeholder="Lesson title"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lesson-type">Type</Label>
              <Select
                value={lessonForm.lesson_type}
                onValueChange={(value) => {
                  const lessonType = normalizeLessonType(value);
                  setLessonForm({
                    ...lessonForm,
                    lesson_type: lessonType,
                    scorm_package_id: lessonType === 'scorm' ? lessonForm.scorm_package_id : '',
                  });
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LESSON_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {isTimedMedia(lessonForm.lesson_type) && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="lesson-duration-seconds">Exact duration (seconds)</Label>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={handleSyncDuration}
                    disabled={syncingDuration}
                  >
                    {syncingDuration ? (
                      <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                    )}
                    Sync duration from video
                  </Button>
                </div>
                <Input
                  id="lesson-duration-seconds"
                  type="number"
                  min={0}
                  placeholder="e.g. 37"
                  value={lessonForm.duration_seconds ?? ''}
                  onChange={(e) => {
                    const v = e.target.value.trim();
                    setLessonForm({ ...lessonForm, duration_seconds: v === '' ? null : parseInt(v) || 0 });
                  }}
                />
                {lessonForm.duration_seconds && lessonForm.duration_seconds > 0 ? (
                  <p className="flex items-center gap-1.5 text-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Sidebar will show {secondsToMinutes(lessonForm.duration_seconds)} min ({lessonForm.duration_seconds}s stored).
                  </p>
                ) : (
                  <p className="flex items-start gap-1.5 text-xs rounded-md bg-warning/10 text-warning p-2">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    Duration missing — please set manually. No placeholder duration will be shown to learners.
                  </p>
                )}
              </div>
            )}
            {lessonForm.lesson_type === 'scorm' && (
              <div className="space-y-2">
                <Label htmlFor="lesson-scorm">SCORM Package</Label>
                <p className="text-xs text-muted-foreground flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  Attach a HeyGen SCORM package you already uploaded in the SCORM tab.
                </p>
                <Select
                  value={lessonForm.scorm_package_id}
                  onValueChange={(v) => setLessonForm({ ...lessonForm, scorm_package_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a SCORM package" />
                  </SelectTrigger>
                  <SelectContent>
                    {scormPackages.map((pkg) => (
                      <SelectItem key={pkg.id} value={pkg.id}>{pkg.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {scormPackages.length === 0 ? (
                  <p className="flex items-start gap-1.5 text-xs rounded-md bg-warning/10 text-warning p-2">
                    <AlertTriangle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                    No SCORM packages uploaded yet. Go to the SCORM tab to upload a HeyGen SCORM 1.2 ZIP first.
                  </p>
                ) : lessonForm.scorm_package_id ? (
                  <p className="flex items-center gap-1.5 text-xs text-success">
                    <CheckCircle2 className="h-3.5 w-3.5 shrink-0" />
                    Package attached.
                  </p>
                ) : (
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                    No package attached yet — learners won't see any content until you select one.
                  </p>
                )}
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="lesson-description">Description</Label>
              <Textarea
                id="lesson-description"
                value={lessonForm.description}
                onChange={(e) => setLessonForm({ ...lessonForm, description: e.target.value })}
                placeholder="Brief description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLessonDialog({ open: false, lesson: null, moduleId: null })}>
              Cancel
            </Button>
            <Button onClick={lessonDialog.lesson ? handleUpdateLesson : handleCreateLesson} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {lessonDialog.lesson ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <LessonDurationAudit
        open={auditOpen}
        onOpenChange={setAuditOpen}
        lessons={lessons as unknown as AuditLessonInput[]}
        modules={modules}
        onApplied={fetchData}
      />
    </div>
  );
}
