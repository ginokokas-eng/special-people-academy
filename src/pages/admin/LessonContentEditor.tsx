import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { ArrowLeft, Eye, Loader2, Save } from '@/components/icons';
import { BlockPalette } from '@/components/admin/lesson-blocks/BlockPalette';
import { BlockList } from '@/components/admin/lesson-blocks/BlockList';
import { TemplatePicker } from '@/components/admin/lesson-blocks/TemplatePicker';
import type { LessonTemplate } from '@/components/admin/lesson-blocks/templates';
import { LessonBlocks } from '@/components/course-learn/blocks/LessonBlocks';

import {
  defaultContributesToCompletion,
  defaultPayload,
  type BlockDraft,
  type BlockPayload,
  type BlockType,
  type LessonBlock,
} from '@/components/course-learn/blocks/types';

/**
 * Block editor for a single lesson.
 *
 * Left: ordered block forms + palette. Right: live preview rendered by the very
 * same <LessonBlocks/> component learners use, so authors cannot see something
 * different from what ships.
 */
export default function LessonContentEditor() {
  const { id: courseId, lessonId } = useParams<{ id: string; lessonId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [lesson, setLesson] = useState<{ title: string; lesson_type: string } | null>(null);
  const [blocks, setBlocks] = useState<BlockDraft[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [templateDismissed, setTemplateDismissed] = useState(false);


  // Guards against re-initialising block state (auth/token-refresh renders must
  // never wipe unsaved work).
  const initialisedLessonIdRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;

  const load = useCallback(async (force = false) => {
    if (!lessonId) return;
    if (!force && dirtyRef.current) return;
    setLoading(true);
    try {
      const [lessonRes, blocksRes] = await Promise.all([
        supabase.from('lessons').select('title, lesson_type').eq('id', lessonId).maybeSingle(),
        supabase
          .from('lesson_blocks')
          .select('*')
          .eq('lesson_id', lessonId)
          .order('order_index'),
      ]);
      if (lessonRes.error) throw lessonRes.error;
      if (blocksRes.error) throw blocksRes.error;
      setLesson(lessonRes.data ?? null);
      setBlocks(
        (blocksRes.data || []).map((row) => ({
          id: row.id,
          block_type: row.block_type as BlockType,
          payload: (row.payload ?? {}) as unknown as BlockPayload,
          contributes_to_completion: row.contributes_to_completion,
        }))
      );
      setRemovedIds([]);
      setDirty(false);
    } catch (error) {
      console.error('Error loading lesson content:', error);
      toast.error('Failed to load lesson content');
    } finally {
      setLoading(false);
    }
  }, [lessonId]);

  useEffect(() => {
    if (!lessonId) return;
    if (initialisedLessonIdRef.current === lessonId) return;
    initialisedLessonIdRef.current = lessonId;
    load(true);
  }, [lessonId, load]);

  useUnsavedChangesGuard(dirty);

  const mutate = (updater: (prev: BlockDraft[]) => BlockDraft[]) => {
    setBlocks(updater);
    setDirty(true);
  };

  const addBlock = (type: BlockType) =>
    mutate((prev) => [
      ...prev,
      {
        id: null,
        block_type: type,
        payload: defaultPayload(type),
        contributes_to_completion: defaultContributesToCompletion(type),
      },
    ]);

  /**
   * Seeds the lesson from a template. The seeded blocks are ordinary drafts —
   * the template choice is not recorded anywhere.
   */
  const applyTemplate = (template: LessonTemplate) => {
    setTemplateDismissed(true);
    const seeded = template.build();
    if (!seeded.length) return;
    mutate(() => seeded);
    toast.success(`${template.name} template added — replace the guidance text with your own words`);
  };



  const changeBlock = (index: number, patch: Partial<BlockDraft>) =>
    mutate((prev) => prev.map((b, i) => (i === index ? { ...b, ...patch } : b)));

  const moveBlock = (index: number, direction: -1 | 1) =>
    mutate((prev) => {
      const target = index + direction;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  const duplicateBlock = (index: number) =>
    mutate((prev) => {
      const source = prev[index];
      const copy: BlockDraft = {
        id: null,
        block_type: source.block_type,
        payload: JSON.parse(JSON.stringify(source.payload)) as BlockPayload,
        contributes_to_completion: source.contributes_to_completion,
      };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });

  const removeBlock = (index: number) => {
    const target = blocks[index];
    if (target?.id) setRemovedIds((prev) => [...prev, target.id as string]);
    mutate((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!lessonId) return;
    setSaving(true);
    try {
      if (removedIds.length) {
        const { error } = await supabase.from('lesson_blocks').delete().in('id', removedIds);
        if (error) throw error;
      }

      // Order is the array position, rewritten on every save.
      const updates = blocks
        .map((b, index) => ({ b, index }))
        .filter(({ b }) => b.id);
      const inserts = blocks
        .map((b, index) => ({ b, index }))
        .filter(({ b }) => !b.id);

      for (const { b, index } of updates) {
        const { error } = await supabase
          .from('lesson_blocks')
          .update({
            block_type: b.block_type,
            payload: b.payload as never,
            order_index: index,
            contributes_to_completion: b.contributes_to_completion,
          })
          .eq('id', b.id as string);
        if (error) throw error;
      }

      if (inserts.length) {
        const { error } = await supabase.from('lesson_blocks').insert(
          inserts.map(({ b, index }) => ({
            lesson_id: lessonId,
            block_type: b.block_type,
            payload: b.payload as never,
            order_index: index,
            contributes_to_completion: b.contributes_to_completion,
          }))
        );
        if (error) throw error;
      }

      toast.success('Lesson content saved');
      setDirty(false);
      dirtyRef.current = false;
      await load(true);
    } catch (error) {
      console.error('Error saving lesson content:', error);
      toast.error('Failed to save lesson content');
    } finally {
      setSaving(false);
    }
  };

  const previewBlocks: LessonBlock[] = blocks.map((b, index) => ({
    id: b.id ?? `preview-${index}`,
    lesson_id: lessonId ?? '',
    order_index: index,
    block_type: b.block_type,
    payload: b.payload,
    is_graded: false,
    contributes_to_completion: b.contributes_to_completion,
  }));

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1400px] space-y-6 p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" asChild>
            <Link to={`/admin-portal/courses/${courseId}/edit`}>
              <ArrowLeft className="mr-1 h-4 w-4" />
              Back to course
            </Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold text-foreground">
              {lesson?.title || 'Lesson content'}
            </h1>
            <p className="text-sm text-muted-foreground">
              Build this lesson from blocks. Learners see the preview on the right.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {dirty && <Badge variant="outline">Unsaved changes</Badge>}
          <Button
            variant="outline"
            onClick={() => {
              if (
                dirty &&
                !window.confirm('You have unsaved changes. Leave this page and discard them?')
              )
                return;
              setDirty(false);
              navigate(`/admin-portal/courses/${courseId}/edit`);
            }}
          >
            Close
          </Button>
          <Button onClick={handleSave} disabled={saving || !dirty}>
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save content
          </Button>
        </div>
      </div>

      {lesson && lesson.lesson_type !== 'blocks' && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            This lesson's type is “{lesson.lesson_type}”. Set it to “Interactive lesson (blocks)” in
            the lesson settings for learners to see these blocks.
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <BlockList
            blocks={blocks}
            onChange={changeBlock}
            onMove={moveBlock}
            onDuplicate={duplicateBlock}
            onRemove={removeBlock}
            courseId={courseId}
            lessonId={lessonId}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add a block</CardTitle>
              <CardDescription>Blocks appear in the order listed above.</CardDescription>
            </CardHeader>
            <CardContent>
              <BlockPalette onAdd={addBlock} />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Eye className="h-4 w-4" />
            Learner preview
          </div>
          <LessonBlocks blocks={previewBlocks} preview />
        </div>
      </div>
    </div>
  );
}
