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
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { LessonBlocks } from '@/components/course-learn/blocks/LessonBlocks';
import { CopilotPanel } from '@/components/admin/lesson-blocks/CopilotPanel';
import { BankPicker } from '@/components/admin/question-bank/BankPicker';
import { TranslationsPanel } from '@/components/admin/lesson-blocks/TranslationsPanel';
import {
  BlockTransferDialog,
  type BlockTransferRequest,
} from '@/components/admin/lesson-blocks/BlockTransferDialog';
import { openCount, orphanCommentIds, type BlockComment } from '@/lib/blockComments';
import { blockPayloadFromBank, type BankQuestion } from '@/lib/questionBank';
import { materialChangeDefault } from '@/lib/contentHistory';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';



import {
  defaultContributesToCompletion,
  defaultPayload,
  hasInvalidCheckpoints,
  validateScenario,
  validateVisibility,
  type ScenarioPayload,
  type BlockDraft,
  type BlockPayload,
  type BlockType,
  type LessonBlock,
  type VideoPayload,
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
  const [lesson, setLesson] = useState<{ title: string; lesson_type: string; trickle_enabled: boolean } | null>(null);
  const [blocks, setBlocks] = useState<BlockDraft[]>([]);
  const [removedIds, setRemovedIds] = useState<string[]>([]);
  const [templateDismissed, setTemplateDismissed] = useState(false);
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [coursePublished, setCoursePublished] = useState(false);
  const [transfer, setTransfer] = useState<BlockTransferRequest | null>(null);
  /** Reviewer notes for this lesson, grouped by the block's stable client id. */
  const [comments, setComments] = useState<BlockComment[]>([]);

  // Save-time change context (Part H): what the author declares about this save.
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [material, setMaterial] = useState(false);
  const [note, setNote] = useState('');

  // Guards against re-initialising block state (auth/token-refresh renders must
  // never wipe unsaved work).
  const initialisedLessonIdRef = useRef<string | null>(null);
  const dirtyRef = useRef(false);
  dirtyRef.current = dirty;
  /** Last saved (or loaded) blocks — the "before" side of the material check. */
  const savedBlocksRef = useRef<BlockDraft[]>([]);

  const load = useCallback(async (force = false) => {
    if (!lessonId) return;
    if (!force && dirtyRef.current) return;
    setLoading(true);
    try {
      const [lessonRes, blocksRes, commentsRes] = await Promise.all([
        supabase.from('lessons').select('title, lesson_type, trickle_enabled').eq('id', lessonId).maybeSingle(),
        supabase
          .from('lesson_blocks')
          .select('*')
          .eq('lesson_id', lessonId)
          .order('order_index'),
        supabase
          .from('block_comments')
          .select('*')
          .eq('lesson_id', lessonId)
          .order('created_at'),
      ]);
      if (lessonRes.error) throw lessonRes.error;
      if (blocksRes.error) throw blocksRes.error;
      if (commentsRes.error) console.error('Error loading reviewer notes:', commentsRes.error);
      setComments((commentsRes.data ?? []) as BlockComment[]);
      setLesson(lessonRes.data ?? null);
      const loaded: BlockDraft[] = (blocksRes.data || []).map((row) => ({
        id: row.id,
        client_id: row.id,
        block_type: row.block_type as BlockType,
        payload: (row.payload ?? {}) as unknown as BlockPayload,
        contributes_to_completion: row.contributes_to_completion,
      }));
      setBlocks(loaded);
      savedBlocksRef.current = JSON.parse(JSON.stringify(loaded)) as BlockDraft[];

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

  // Editing a live course is a different act — authors get told, every time.
  useEffect(() => {
    if (!courseId) return;
    let cancelled = false;
    void supabase
      .from('courses')
      .select('is_published')
      .eq('id', courseId)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled) setCoursePublished(!!data?.is_published);
      });
    return () => {
      cancelled = true;
    };
  }, [courseId]);

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
        client_id: crypto.randomUUID(),
        block_type: type,
        payload: defaultPayload(type),
        contributes_to_completion: defaultContributesToCompletion(type),
      },
    ]);

  /** Adds an MCQ block that is a COPY of a bank question, keeping provenance. */
  const addFromBank = (bank: BankQuestion) => {
    mutate((prev) => [
      ...prev,
      {
        id: null,
        client_id: crypto.randomUUID(),
        block_type: 'mcq' as BlockType,
        payload: {
          ...(defaultPayload('mcq') as BlockPayload),
          ...blockPayloadFromBank(bank),
        } as BlockPayload,
        contributes_to_completion: defaultContributesToCompletion('mcq'),
      },
    ]);
    setBankPickerOpen(false);
    toast.success('Question copied in — save the lesson to keep it');
  };

  /** Appends AI drafts the author explicitly accepted. Unsaved until Save. */
  const addBlocks = (accepted: { block_type: BlockType; payload: BlockPayload }[]) =>
    mutate((prev) => [
      ...prev,
      ...accepted.map((a) => ({
        id: null,
        client_id: crypto.randomUUID(),
        block_type: a.block_type,
        payload: a.payload,
        contributes_to_completion: defaultContributesToCompletion(a.block_type),
      })),
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
        client_id: crypto.randomUUID(),
        block_type: source.block_type,
        payload: JSON.parse(JSON.stringify(source.payload)) as BlockPayload,
        contributes_to_completion: source.contributes_to_completion,
      };
      return [...prev.slice(0, index + 1), copy, ...prev.slice(index + 1)];
    });

  /** Applies a drag reorder. Saving rewrites order_index from array position. */
  const reorderBlocks = (clientIds: string[]) =>
    mutate((prev) => {
      const byId = new Map(prev.map((b) => [b.client_id, b]));
      const next = clientIds.map((id) => byId.get(id)).filter(Boolean) as BlockDraft[];
      return next.length === prev.length ? next : prev;
    });

  /** Reviewer notes are saved immediately — they are not lesson content. */
  const addComment = async (clientId: string, body: string) => {
    if (!lessonId) return;
    const { data: session } = await supabase.auth.getSession();
    const author = session.session?.user.id;
    if (!author) return;
    const { data, error } = await supabase
      .from('block_comments')
      .insert({ lesson_id: lessonId, block_client_id: clientId, author, body })
      .select('*')
      .single();
    if (error) {
      console.error('Error adding reviewer note:', error);
      toast.error('Could not add that note');
      return;
    }
    setComments((prev) => [...prev, data as BlockComment]);
  };

  const resolveComment = async (id: string, resolved: boolean) => {
    const { data: session } = await supabase.auth.getSession();
    const { data, error } = await supabase
      .from('block_comments')
      .update({
        resolved_at: resolved ? new Date().toISOString() : null,
        resolved_by: resolved ? (session.session?.user.id ?? null) : null,
      })
      .eq('id', id)
      .select('*')
      .single();
    if (error) {
      console.error('Error updating reviewer note:', error);
      toast.error('Could not update that note');
      return;
    }
    setComments((prev) => prev.map((c) => (c.id === id ? (data as BlockComment) : c)));
  };

  const commentsByBlock = comments.reduce<Record<string, BlockComment[]>>((acc, comment) => {
    (acc[comment.block_client_id] ??= []).push(comment);
    return acc;
  }, {});
  const openComments = openCount(comments);
  /**
   * Keeps question_bank_usages in step with the saved blocks, so the bank can
   * show where each question is reused and which copies are outdated.
   */
  const syncBankUsages = async () => {
    const sourced = blocks
      .map((b) => ({
        blockId: (b.id ?? b.client_id) as string,
        payload: b.payload as { bank_id?: string; bank_version?: number },
      }))
      .filter((b) => !!b.payload.bank_id);
    if (!sourced.length) return;

    const { data: existing, error } = await supabase
      .from('question_bank_usages')
      .select('id, lesson_block_id, bank_id, bank_version')
      .in('lesson_block_id', sourced.map((s) => s.blockId));
    if (error) {
      console.error('Error reading bank usages:', error);
      return;
    }

    const byBlock = new Map(
      ((existing || []) as { id: string; lesson_block_id: string | null; bank_version: number }[]).map(
        (row) => [row.lesson_block_id as string, row],
      ),
    );

    const inserts = sourced
      .filter((s) => !byBlock.has(s.blockId))
      .map((s) => ({
        bank_id: s.payload.bank_id as string,
        bank_version: s.payload.bank_version ?? 1,
        lesson_block_id: s.blockId,
      }));
    if (inserts.length) {
      const { error: insertError } = await supabase.from('question_bank_usages').insert(inserts);
      if (insertError) console.error('Error recording bank usage:', insertError);
    }

    for (const s of sourced) {
      const row = byBlock.get(s.blockId);
      if (!row) continue;
      const version = s.payload.bank_version ?? 1;
      if (row.bank_version === version) continue;
      await supabase.from('question_bank_usages').update({ bank_version: version }).eq('id', row.id);
    }
  };


  const removeBlock = (index: number) => {
    const target = blocks[index];
    if (target?.id) setRemovedIds((prev) => [...prev, target.id as string]);
    mutate((prev) => prev.filter((_, i) => i !== index));
  };

  /**
   * Opens the save dialog with the material checkbox pre-set from what actually
   * changed: on when an assessed/interactive block moved, off for wording,
   * callout or image-only edits.
   */
  const openSaveDialog = () => {
    setMaterial(materialChangeDefault(savedBlocksRef.current, blocks));
    setNote('');
    setSaveDialogOpen(true);
  };


  const handleSave = async () => {
    if (!lessonId) return;
    setSaving(true);
    try {
      // Transaction-local context the history triggers read.
      const { error: contextError } = await supabase.rpc('set_content_change_context', {
        _material: material,
        _note: note.trim() || null,
      });
      if (contextError) throw contextError;

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
            // The client-minted id is used as the row id, so any conditional
            // block pointing at this draft keeps pointing at it after saving.
            id: b.client_id,
            lesson_id: lessonId,
            block_type: b.block_type,
            payload: b.payload as never,
            order_index: index,
            contributes_to_completion: b.contributes_to_completion,
          }))
        );
        if (error) throw error;
      }

      // Records where bank questions are reused, now the block ids exist.
      await syncBankUsages();

      // Notes on blocks that no longer exist would hang around forever.
      const orphans = orphanCommentIds(comments, blocks.map((b) => b.client_id));
      if (orphans.length) {
        const { error: orphanError } = await supabase
          .from('block_comments')
          .delete()
          .in('id', orphans);
        if (orphanError) console.error('Error clearing notes for deleted blocks:', orphanError);
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

  // P9: an unusable checkpoint (no/zero time, missing question, bad options)
  // blocks saving so at_s = 0 can never reach the database.
  const checkpointsInvalid = blocks.some(
    (b) => b.block_type === 'video' && hasInvalidCheckpoints(b.payload as VideoPayload)
  );

  // Scenarios must hang together before they can be saved: broken links or an
  // unreachable ending would strand a learner mid-story.
  const scenariosInvalid = blocks.some(
    (b) => b.block_type === 'scenario' && validateScenario(b.payload as ScenarioPayload).length > 0
  );

  // Conditional visibility issues (dangling/forward/ineligible sources).
  const visibilityIssues = validateVisibility(
    blocks.map((b) => ({ id: b.client_id, block_type: b.block_type, payload: b.payload }))
  );
  const visibilityInvalid = visibilityIssues.length > 0;

  const previewBlocks: LessonBlock[] = blocks.map((b, index) => ({
    id: b.client_id,
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
          {openComments > 0 && (
            <Badge variant="outline" className="border-primary/40 text-primary">
              {openComments} open {openComments === 1 ? 'note' : 'notes'}
            </Badge>
          )}
          <CopilotPanel
            lessonId={lessonId}
            courseId={courseId}
            lessonTitle={lesson?.title}
            blocks={blocks}
            onAccept={addBlocks}
          />
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
          {checkpointsInvalid && (
            <span className="text-xs font-medium text-destructive">
              Fix the checkpoint problems below to save
            </span>
          )}
          {!checkpointsInvalid && !scenariosInvalid && visibilityInvalid && (
            <span className="text-xs font-medium text-destructive">
              Fix the “show this block” problems below to save
            </span>
          )}
          {!checkpointsInvalid && scenariosInvalid && (
            <span className="text-xs font-medium text-destructive">
              Fix the scenario problems below to save
            </span>
          )}
          <Button
            onClick={openSaveDialog}
            disabled={
              saving || !dirty || checkpointsInvalid || scenariosInvalid || visibilityInvalid
            }
          >
            {saving ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Save className="mr-2 h-4 w-4" />
            )}
            Save content
          </Button>
        </div>
      </div>

      {coursePublished && (
        <Alert>
          <AlertTitle>You are editing a live course</AlertTitle>
          <AlertDescription>
            Learners see these changes as soon as you save.
          </AlertDescription>
        </Alert>
      )}

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save this lesson</DialogTitle>
            <DialogDescription>
              Tell us what kind of change this is, so learners who already finished the lesson can be
              told when it matters.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <Checkbox
                id="material-change"
                checked={material}
                onCheckedChange={(checked) => setMaterial(checked === true)}
              />
              <Label htmlFor="material-change" className="text-sm font-normal leading-snug">
                This changes what learners must know
                <span className="mt-1 block text-xs text-muted-foreground">
                  Ticked automatically when you add, remove or edit a question, activity or assessed
                  step. Leave it off for wording or picture tidy-ups.
                </span>
              </Label>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="change-note" className="text-sm">
                Note (optional)
              </Label>
              <Input
                id="change-note"
                value={note}
                maxLength={200}
                placeholder="e.g. Updated the escalation question"
                onChange={(event) => setNote(event.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                setSaveDialogOpen(false);
                await handleSave();
              }}
              disabled={saving}
              data-testid="save-content"
            >
              Save content
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>



      {lesson && lesson.lesson_type !== 'blocks' && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            This lesson's type is “{lesson.lesson_type}”. Set it to “Interactive lesson (blocks)” in
            the lesson settings for learners to see these blocks.
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Reveal content gradually</CardTitle>
              <CardDescription>
                With this on, learners see the next section only once they’ve finished the activity
                above it. It changes what learners see, not what counts as complete.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex items-center gap-3">
              <Switch
                id="lesson-trickle"
                checked={lesson?.trickle_enabled ?? false}
                onCheckedChange={async (checked) => {
                  if (!lessonId) return;
                  setLesson((prev) => (prev ? { ...prev, trickle_enabled: checked } : prev));
                  const { error } = await supabase
                    .from('lessons')
                    .update({ trickle_enabled: checked })
                    .eq('id', lessonId);
                  if (error) {
                    console.error('Could not update trickle setting:', error);
                    toast.error('Could not save that setting');
                    setLesson((prev) => (prev ? { ...prev, trickle_enabled: !checked } : prev));
                    return;
                  }
                  toast.success(checked ? 'Gradual reveal is on' : 'Gradual reveal is off');
                }}
              />
              <Label htmlFor="lesson-trickle" className="text-sm text-muted-foreground">
                Reveal each section as learners finish the one before it
              </Label>
            </CardContent>
          </Card>

          {!blocks.length && !templateDismissed && <TemplatePicker onPick={applyTemplate} />}

          <BlockList

            blocks={blocks}
            onChange={changeBlock}
            onMove={moveBlock}
            onDuplicate={duplicateBlock}
            onRemove={removeBlock}
            visibilityIssues={visibilityIssues}
            courseId={courseId}
            lessonId={lessonId}
            onReorder={reorderBlocks}
            onTransfer={(index, mode) => setTransfer({ index, block: blocks[index], mode })}
            comments={commentsByBlock}
            onAddComment={addComment}
            onResolveComment={resolveComment}
          />
          <BlockTransferDialog
            request={transfer}
            onOpenChange={(open) => !open && setTransfer(null)}
            currentLessonId={lessonId}
            onMoved={removeBlock}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add a block</CardTitle>
              <CardDescription>Blocks appear in the order listed above.</CardDescription>
            </CardHeader>
            <CardContent>
              <BlockPalette onAdd={addBlock} onPickFromBank={() => setBankPickerOpen(true)} />
              <BankPicker
                open={bankPickerOpen}
                onOpenChange={setBankPickerOpen}
                onPick={addFromBank}
              />

            </CardContent>
          </Card>

          <TranslationsPanel lessonId={lessonId} />
        </div>

        <div className="space-y-3 lg:sticky lg:top-6 lg:self-start">
          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
            <Eye className="h-4 w-4" />
            Learner preview
          </div>
          <LessonBlocks
            blocks={previewBlocks}
            preview
            trickleEnabled={lesson?.trickle_enabled ?? false}
          />
        </div>
      </div>
    </div>
  );
}
