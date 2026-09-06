import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Loader2 } from '@/components/icons';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { remintBlockPayload } from '@/lib/blockCopy';
import type { BlockDraft } from '@/components/course-learn/blocks/types';

interface CourseRow {
  id: string;
  title: string;
}
interface LessonRow {
  id: string;
  title: string;
  course_id: string;
  module_title: string | null;
}

export interface BlockTransferRequest {
  index: number;
  block: BlockDraft;
  mode: 'copy' | 'move';
}

interface Props {
  request: BlockTransferRequest | null;
  onOpenChange: (open: boolean) => void;
  /** Lesson currently being edited — excluded from the target list. */
  currentLessonId?: string;
  /** Called after a successful move, so the editor drops the source block. */
  onMoved: (index: number) => void;
}

/**
 * Sends a block to another lesson.
 *
 * The block is written straight to the target lesson (appended at the end), with
 * every id inside its payload freshly minted so the two copies never share
 * option, card or scenario node ids. Conditional visibility is dropped, because
 * it points at a block in the source lesson.
 *
 * Lesson-level standards links are NOT copied: they describe the lesson, not the
 * block. Bank provenance IS copied for questions that came from the bank.
 */
export function BlockTransferDialog({ request, onOpenChange, currentLessonId, onMoved }: Props) {
  const [courses, setCourses] = useState<CourseRow[]>([]);
  const [lessons, setLessons] = useState<LessonRow[]>([]);
  const [courseId, setCourseId] = useState('');
  const [lessonId, setLessonId] = useState('');
  const [loading, setLoading] = useState(false);
  const [working, setWorking] = useState(false);

  const open = !!request;

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    void (async () => {
      const { data, error } = await supabase
        .from('courses')
        .select('id, title')
        .order('title');
      if (error) {
        console.error('Error loading courses:', error);
        toast.error('Could not load courses');
      }
      setCourses((data ?? []) as CourseRow[]);
      setLoading(false);
    })();
  }, [open]);

  useEffect(() => {
    if (!courseId) {
      setLessons([]);
      setLessonId('');
      return;
    }
    void (async () => {
      const { data, error } = await supabase
        .from('lessons')
        .select('id, title, course_id, lesson_type, order_index, modules(title)')
        .eq('course_id', courseId)
        .eq('lesson_type', 'blocks')
        .order('order_index');
      if (error) {
        console.error('Error loading lessons:', error);
        toast.error('Could not load lessons');
        return;
      }
      const rows = (data ?? [])
        .map((row) => ({
          id: row.id as string,
          title: row.title as string,
          course_id: row.course_id as string,
          module_title: (row as { modules?: { title?: string } | null }).modules?.title ?? null,
        }))
        .filter((row) => row.id !== currentLessonId);
      setLessons(rows);
      setLessonId('');
    })();
  }, [courseId, currentLessonId]);

  const handleSend = async () => {
    if (!request || !lessonId) return;
    setWorking(true);
    try {
      const { data: last, error: lastError } = await supabase
        .from('lesson_blocks')
        .select('order_index')
        .eq('lesson_id', lessonId)
        .order('order_index', { ascending: false })
        .limit(1);
      if (lastError) throw lastError;
      const nextIndex = ((last?.[0]?.order_index as number | undefined) ?? -1) + 1;

      const newId = crypto.randomUUID();
      const payload = remintBlockPayload(request.block.block_type, request.block.payload);

      const { error } = await supabase.from('lesson_blocks').insert({
        id: newId,
        lesson_id: lessonId,
        block_type: request.block.block_type,
        payload: payload as never,
        order_index: nextIndex,
        contributes_to_completion: request.block.contributes_to_completion,
      });
      if (error) throw error;

      // Bank provenance follows the question, so the bank still shows every place
      // it is used.
      const bank = payload as { bank_id?: string; bank_version?: number };
      if (request.block.block_type === 'mcq' && bank.bank_id) {
        const { error: usageError } = await supabase.from('question_bank_usages').insert({
          bank_id: bank.bank_id,
          bank_version: bank.bank_version ?? 1,
          lesson_block_id: newId,
        });
        if (usageError) console.error('Error recording bank usage:', usageError);
      }

      const target = lessons.find((l) => l.id === lessonId);
      if (request.mode === 'move') onMoved(request.index);
      toast.success(
        request.mode === 'move'
          ? `Moved to “${target?.title ?? 'the lesson'}” — save this lesson to finish`
          : `Copied to “${target?.title ?? 'the lesson'}”`,
        {
          action: {
            label: 'Open lesson',
            onClick: () =>
              window.open(`/admin-portal/courses/${courseId}/lessons/${lessonId}/content`, '_blank'),
          },
        }
      );
      onOpenChange(false);
    } catch (error) {
      console.error('Error sending block to lesson:', error);
      toast.error('Could not send this block to that lesson');
    } finally {
      setWorking(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {request?.mode === 'move' ? 'Move this block' : 'Copy this block'}
          </DialogTitle>
          <DialogDescription>
            Pick where it should go. It is added at the end of that lesson.
            {request?.mode === 'move'
              ? ' It is taken out of this lesson when you save.'
              : ' This lesson keeps its copy.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="transfer-course">Course</Label>
            <Select value={courseId} onValueChange={setCourseId} disabled={loading}>
              <SelectTrigger id="transfer-course">
                <SelectValue placeholder={loading ? 'Loading…' : 'Choose a course'} />
              </SelectTrigger>
              <SelectContent>
                {courses.map((course) => (
                  <SelectItem key={course.id} value={course.id}>
                    {course.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="transfer-lesson">Lesson</Label>
            <Select value={lessonId} onValueChange={setLessonId} disabled={!lessons.length}>
              <SelectTrigger id="transfer-lesson">
                <SelectValue
                  placeholder={
                    !courseId
                      ? 'Choose a course first'
                      : lessons.length
                        ? 'Choose a lesson'
                        : 'No interactive lessons in this course'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                {lessons.map((lesson) => (
                  <SelectItem key={lesson.id} value={lesson.id}>
                    {lesson.module_title ? `${lesson.module_title} — ` : ''}
                    {lesson.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={working}>
            Cancel
          </Button>
          <Button onClick={handleSend} disabled={!lessonId || working}>
            {working && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {request?.mode === 'move' ? 'Move block' : 'Copy block'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
