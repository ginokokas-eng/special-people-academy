import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import { Loader2, RefreshCw, Check, X, BookOpen, EyeOff, Pencil } from 'lucide-react';
import { toast } from 'sonner';
import {
  formatDuration,
  videoDurationMinutes,
  resourcePageCount,
  lessonTypeLabel,
} from '@/components/course-learn/lessonMeta';

export interface AuditLessonInput {
  id: string;
  module_id: string | null;
  title: string;
  lesson_type: string;
  duration_minutes: number | null;
  duration_seconds: number | null;
  scorm_package_id: string | null;
  video_url?: string | null;
  content?: string | null;
  resource_page_count?: number | null;
}

interface AuditModule {
  id: string;
  title: string;
  order_index: number;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  lessons: AuditLessonInput[];
  modules: AuditModule[];
  onApplied: () => void;
}

type PendingChange = {
  duration_seconds?: number | null;
  resource_page_count?: number | null;
  lesson_type?: string;
  _delete?: boolean;
};

type Status =
  | 'OK'
  | 'Duration missing'
  | 'Placeholder duration detected'
  | 'Resource missing page count'
  | 'Assessment missing question count'
  | 'Manual review needed'
  | 'Will delete';

const TIMED = (t: string) => t === 'video' || t === 'scorm';

function roundSeconds(s: number): number {
  return Math.max(1, Math.round(s));
}

/** Load a media URL into a hidden <video> and read its duration in seconds. */
function probeDuration(url: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    const cleanup = () => {
      v.onloadedmetadata = null;
      v.onerror = null;
      v.src = '';
    };
    v.onloadedmetadata = () => {
      const d = v.duration;
      cleanup();
      if (!isFinite(d) || d <= 0) reject(new Error('Invalid duration'));
      else resolve(d);
    };
    v.onerror = () => {
      cleanup();
      reject(new Error('Could not load media metadata'));
    };
    v.src = url;
  });
}

export function LessonDurationAudit({ open, onOpenChange, lessons, modules, onApplied }: Props) {
  const [questionCounts, setQuestionCounts] = useState<Map<string, number>>(new Map());
  const [pending, setPending] = useState<Record<string, PendingChange>>({});
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncingAll, setSyncingAll] = useState(false);
  const [applying, setApplying] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  useEffect(() => {
    if (!open) return;
    setPending({});
    setEditId(null);
    fetchQuestionCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const fetchQuestionCounts = async () => {
    const quizIds = lessons.filter((l) => l.lesson_type === 'quiz').map((l) => l.id);
    if (quizIds.length === 0) {
      setQuestionCounts(new Map());
      return;
    }
    const { data: quizzes } = await supabase.from('quizzes').select('id, lesson_id').in('lesson_id', quizIds);
    const quizToLesson = new Map<string, string>((quizzes || []).map((q: any) => [q.id, q.lesson_id]));
    const counts = new Map<string, number>();
    if ((quizzes || []).length > 0) {
      const { data: qq } = await supabase
        .from('quiz_questions')
        .select('quiz_id')
        .in('quiz_id', (quizzes || []).map((q: any) => q.id));
      (qq || []).forEach((row: any) => {
        const lessonId = quizToLesson.get(row.quiz_id);
        if (lessonId) counts.set(lessonId, (counts.get(lessonId) || 0) + 1);
      });
    }
    setQuestionCounts(counts);
  };

  const moduleById = useMemo(() => new Map(modules.map((m) => [m.id, m])), [modules]);

  const orderedLessons = useMemo(() => {
    return [...lessons].sort((a, b) => {
      const ma = a.module_id ? moduleById.get(a.module_id)?.order_index ?? 999 : 999;
      const mb = b.module_id ? moduleById.get(b.module_id)?.order_index ?? 999 : 999;
      return ma - mb;
    });
  }, [lessons, moduleById]);

  const effType = (l: AuditLessonInput) => pending[l.id]?.lesson_type ?? l.lesson_type;
  const effSeconds = (l: AuditLessonInput) =>
    pending[l.id]?.duration_seconds !== undefined ? pending[l.id]!.duration_seconds : l.duration_seconds;

  // Effective resource page count: pending edit > admin-set column > content estimate.
  const effPages = (l: AuditLessonInput): number => {
    const p = pending[l.id]?.resource_page_count;
    if (p !== undefined && p !== null) return p;
    return resourcePageCount({ ...l, resource_page_count: l.resource_page_count } as any);
  };

  const currentLabel = (l: AuditLessonInput): string => {
    switch (l.lesson_type) {
      case 'scorm':
      case 'video':
        return formatDuration(videoDurationMinutes(l.duration_seconds)) || '—';
      case 'quiz': {
        const c = questionCounts.get(l.id) ?? 0;
        return c > 0 ? `${c} question${c === 1 ? '' : 's'}` : 'Info';
      }
      case 'resource': {
        const p = resourcePageCount(l as any);
        return p > 0 ? `Resource · ${p} page${p === 1 ? '' : 's'}` : 'Resource';
      }
      case 'practical':
        return 'Practical';
      case 'certificate':
        return 'Certificate';
      default:
        return 'Info';
    }
  };

  const detected = (l: AuditLessonInput): string => {
    const type = effType(l);
    if (TIMED(type)) {
      const s = effSeconds(l);
      return s && s > 0 ? `${s}s → ${formatDuration(videoDurationMinutes(s))}` : '— not detected';
    }
    if (type === 'quiz') {
      const c = questionCounts.get(l.id) ?? 0;
      return `${c} question${c === 1 ? '' : 's'}`;
    }
    if (type === 'resource') {
      const p = effPages(l);
      return `${p} page${p === 1 ? '' : 's'}`;
    }
    if (type === 'practical') return 'Practical';
    if (type === 'certificate') return 'Certificate';
    return '—';
  };

  const statusOf = (l: AuditLessonInput): Status => {
    if (pending[l.id]?._delete) return 'Will delete';
    const type = effType(l);
    if (TIMED(type)) {
      const s = effSeconds(l);
      if (s && s > 0) return 'OK';
      if ((l.duration_minutes ?? 0) > 0) return 'Placeholder duration detected';
      return 'Duration missing';
    }
    if (type === 'quiz') return (questionCounts.get(l.id) ?? 0) > 0 ? 'OK' : 'Assessment missing question count';
    if (type === 'resource') return effPages(l) > 0 ? 'OK' : 'Resource missing page count';
    if (type === 'practical' || type === 'certificate') return 'OK';
    return 'Manual review needed';
  };

  const statusBadge = (s: Status) => {
    switch (s) {
      case 'OK':
        return <Badge className="bg-success/15 text-success hover:bg-success/15">OK</Badge>;
      case 'Placeholder duration detected':
        return <Badge className="bg-warning/15 text-warning hover:bg-warning/15">Placeholder</Badge>;
      case 'Duration missing':
        return <Badge variant="destructive">Duration missing</Badge>;
      case 'Resource missing page count':
        return <Badge className="bg-warning/15 text-warning hover:bg-warning/15">Missing page count</Badge>;
      case 'Assessment missing question count':
        return <Badge className="bg-warning/15 text-warning hover:bg-warning/15">Missing questions</Badge>;
      case 'Will delete':
        return <Badge variant="destructive">Will hide</Badge>;
      default:
        return <Badge variant="secondary">Manual review</Badge>;
    }
  };

  const setChange = (id: string, change: PendingChange) =>
    setPending((p) => ({ ...p, [id]: { ...p[id], ...change } }));

  const clearChange = (id: string) =>
    setPending((p) => {
      const next = { ...p };
      delete next[id];
      return next;
    });

  /** Resolve a playable URL for a lesson and read its real duration. */
  const resolveDuration = async (l: AuditLessonInput): Promise<number> => {
    const type = effType(l);
    if (type === 'scorm') {
      if (!l.scorm_package_id) throw new Error('No SCORM package attached');
      const { data, error } = await supabase.functions.invoke('scorm-media-probe', {
        body: { package_id: l.scorm_package_id },
      });
      if (error || !data?.url) throw new Error(data?.error || 'Could not locate SCORM video');
      return probeDuration(data.url);
    }
    // Plain video lesson
    let src = l.video_url || '';
    if (!src) {
      const { data } = await supabase
        .from('lesson_video_sources')
        .select('source_url, is_default')
        .eq('lesson_id', l.id)
        .order('is_default', { ascending: false })
        .limit(1)
        .maybeSingle();
      src = data?.source_url || '';
    }
    if (!src) throw new Error('No uploaded video found');
    return probeDuration(src);
  };

  const syncOne = async (l: AuditLessonInput) => {
    setSyncingId(l.id);
    try {
      const seconds = roundSeconds(await resolveDuration(l));
      setChange(l.id, { duration_seconds: seconds });
      toast.success(`${l.title}: ${seconds}s (${formatDuration(videoDurationMinutes(seconds))})`);
    } catch (e: any) {
      console.error('sync failed', e);
      toast.error(`${l.title}: ${e?.message || 'could not read duration'}`);
    } finally {
      setSyncingId(null);
    }
  };

  // Sync every timed lesson that has no approved duration yet (does not overwrite existing).
  const syncAllMissing = async () => {
    setSyncingAll(true);
    let ok = 0;
    let fail = 0;
    try {
      for (const l of orderedLessons) {
        if (!TIMED(effType(l))) continue;
        if ((effSeconds(l) ?? 0) > 0) continue; // already approved / detected
        try {
          const seconds = roundSeconds(await resolveDuration(l));
          setChange(l.id, { duration_seconds: seconds });
          ok++;
        } catch {
          fail++;
        }
      }
      toast.success(`Audited videos — detected ${ok}${fail ? `, ${fail} need manual check` : ''}`);
    } finally {
      setSyncingAll(false);
    }
  };

  const startEdit = (l: AuditLessonInput) => {
    setEditId(l.id);
    setEditValue(String(effSeconds(l) ?? ''));
  };

  const commitEdit = (l: AuditLessonInput) => {
    const v = editValue.trim();
    const seconds = v === '' ? null : Math.max(0, parseInt(v) || 0);
    setChange(l.id, { duration_seconds: seconds });
    setEditId(null);
  };

  const markAsResource = (l: AuditLessonInput) => setChange(l.id, { lesson_type: 'resource' });

  const hideEmpty = (l: AuditLessonInput) => setChange(l.id, { _delete: true });

  const pendingCount = Object.keys(pending).length;

  const applyChanges = async () => {
    if (pendingCount === 0) return;
    const deletes = Object.entries(pending).filter(([, c]) => c._delete);
    if (deletes.length > 0) {
      const ok = await confirmDialog({
        title: `Hide ${deletes.length} empty item${deletes.length === 1 ? '' : 's'}?`,
        description: 'Hidden items are permanently removed from the course. This cannot be undone.',
      });
      if (!ok) return;
    }
    setApplying(true);
    try {
      const ops: PromiseLike<{ error: unknown } | any>[] = [];
      for (const [id, change] of Object.entries(pending)) {
        if (change._delete) {
          ops.push(supabase.from('lessons').delete().eq('id', id));
          continue;
        }
        const update: Record<string, unknown> = {};
        if (change.duration_seconds !== undefined) update.duration_seconds = change.duration_seconds;
        if (change.lesson_type !== undefined) update.lesson_type = change.lesson_type;
        if (Object.keys(update).length > 0) ops.push(supabase.from('lessons').update(update).eq('id', id));
      }
      const results = await Promise.all(ops);
      const errored = results.filter((r: any) => r?.error);
      if (errored.length > 0) {
        console.error('apply errors', errored);
        toast.error(`Saved with ${errored.length} error(s)`);
      } else {
        toast.success('Changes applied');
      }
      setPending({});
      onApplied();
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error('Failed to apply changes');
    } finally {
      setApplying(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl">
        <DialogHeader>
          <DialogTitle>Audit lesson durations</DialogTitle>
          <DialogDescription>
            Detect real video lengths, question counts and resource pages. Approved durations are
            never overwritten by “Audit all” — use Sync on a single row to re-detect. Nothing is saved
            until you click “Apply changes”.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={syncAllMissing} disabled={syncingAll || applying}>
            {syncingAll ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Audit all videos
          </Button>
          {pendingCount > 0 && (
            <span className="text-xs text-muted-foreground">{pendingCount} pending change(s)</span>
          )}
        </div>

        <ScrollArea className="max-h-[55vh] rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Module</TableHead>
                <TableHead>Lesson</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Current</TableHead>
                <TableHead>Actual / count</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orderedLessons.map((l) => {
                const type = effType(l);
                const isDeleted = pending[l.id]?._delete;
                const isInfoOnly = ['text', 'pdf', 'scenario'].includes(type);
                const emptyResource = type === 'resource' && resourcePageCount(l as any) === 0;
                return (
                  <TableRow key={l.id} className={isDeleted ? 'opacity-50 line-through' : undefined}>
                    <TableCell className="text-xs text-muted-foreground max-w-[140px] truncate">
                      {l.module_id ? moduleById.get(l.module_id)?.title || '—' : '—'}
                    </TableCell>
                    <TableCell className="text-sm font-medium max-w-[180px] truncate">{l.title}</TableCell>
                    <TableCell className="text-xs">{lessonTypeLabel(type)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{currentLabel(l)}</TableCell>
                    <TableCell className="text-xs">
                      {editId === l.id ? (
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min={0}
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            className="h-7 w-20"
                            autoFocus
                          />
                          <span className="text-muted-foreground">s</span>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => commitEdit(l)}>
                            <Check className="h-3.5 w-3.5" />
                          </Button>
                          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setEditId(null)}>
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ) : (
                        detected(l)
                      )}
                    </TableCell>
                    <TableCell>{statusBadge(statusOf(l))}</TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1">
                        {isDeleted ? (
                          <Button size="sm" variant="ghost" onClick={() => clearChange(l.id)}>
                            Undo
                          </Button>
                        ) : (
                          <>
                            {TIMED(type) && (
                              <>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => syncOne(l)}
                                  disabled={syncingId === l.id || syncingAll}
                                >
                                  {syncingId === l.id ? (
                                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  ) : (
                                    <RefreshCw className="h-3.5 w-3.5" />
                                  )}
                                  <span className="ml-1 hidden sm:inline">Sync</span>
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => startEdit(l)}>
                                  <Pencil className="h-3.5 w-3.5" />
                                </Button>
                              </>
                            )}
                            {isInfoOnly && (
                              <Button size="sm" variant="ghost" onClick={() => markAsResource(l)}>
                                <BookOpen className="h-3.5 w-3.5 mr-1" />
                                Resource
                              </Button>
                            )}
                            {(isInfoOnly || emptyResource) && (
                              <Button size="sm" variant="ghost" onClick={() => hideEmpty(l)}>
                                <EyeOff className="h-3.5 w-3.5 mr-1" />
                                Hide
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </ScrollArea>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={applying}>
            Cancel
          </Button>
          <Button onClick={applyChanges} disabled={applying || pendingCount === 0}>
            {applying && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Apply changes{pendingCount > 0 ? ` (${pendingCount})` : ''}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
