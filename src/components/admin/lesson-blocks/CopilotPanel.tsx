import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Check, Loader2, Sparkles, Trash2 } from '@/components/icons';
import { BlockList } from './BlockList';
import { LessonBlocks } from '@/components/course-learn/blocks/LessonBlocks';
import { draftBlockIssues, mapDraftBlocks, type DraftBlock } from '@/lib/aiAuthoring';
import type { BlockItemStat } from '@/components/admin/course-builder/blockStats';
import {
  buildRewriteStats,
  diffMcq,
  rewriteNote,
  rewriteSummary,
  validateRewrite,
  type RewriteFocus,
} from '@/lib/rewriteQuestion';
import {
  BLOCK_LABELS,
  defaultContributesToCompletion,
  validateVisibility,
  type BlockDraft,
  type BlockPayload,
  type BlockType,
  type LessonBlock,
  type McqPayload,
} from '@/components/course-learn/blocks/types';

export const AI_DISCLAIMER = 'AI drafts are suggestions. Review every word before publishing.';

/** The block Insights sent us to rewrite, with its aggregate statistics. */
export interface RewriteTarget {
  clientId: string;
  stat: BlockItemStat;
}

export interface CopilotPanelProps {
  lessonId?: string;
  courseId?: string;
  lessonTitle?: string;
  /** The editor's current in-memory blocks — read only. */
  blocks: BlockDraft[];
  /** Appends accepted blocks to the editor's unsaved list. */
  onAccept: (accepted: { block_type: BlockType; payload: BlockPayload }[]) => void;
  /** Set when the author arrived from Insights asking to rewrite one question. */
  rewrite?: RewriteTarget | null;
  /** True once, to open this panel straight on the rewrite tab. */
  openRewrite?: boolean;
  onOpenRewriteHandled?: () => void;
  /** Replaces one existing block in place, keeping its id and its statistics. */
  onReplace?: (clientId: string, payload: BlockPayload, note: string) => void;
}

type Mode = 'draft_lesson' | 'knowledge_check' | 'improve_block' | 'rewrite_question';

/** A draft awaiting Accept / Edit / Reject. Nothing here is saved. */
interface DraftItem extends BlockDraft {
  issues: string[];
  editing: boolean;
}


/** Honest message from the function, or a plain fallback. */
export function copilotErrorMessage(error: unknown, fallback = 'The draft could not be made.'): string {
  const anyError = error as { message?: string; context?: { body?: unknown } } | null;
  const message = anyError?.message;
  if (typeof message === 'string' && message.trim() && !/non-2xx/i.test(message)) return message;
  return fallback;
}

export function CopilotPanel({
  lessonId,
  courseId,
  lessonTitle,
  blocks,
  onAccept,
  rewrite = null,
  openRewrite = false,
  onOpenRewriteHandled,
  onReplace,
}: CopilotPanelProps) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>('draft_lesson');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<DraftItem[]>([]);

  const [sourceText, setSourceText] = useState('');
  const [importing, setImporting] = useState(false);
  const [questionCount, setQuestionCount] = useState('3');
  const [improveIndex, setImproveIndex] = useState('0');
  const [instruction, setInstruction] = useState('simplify');
  const [freeInstruction, setFreeInstruction] = useState('');

  const [rewriteFocus, setRewriteFocus] = useState<RewriteFocus>('both');
  const [rewriteDraft, setRewriteDraft] = useState<McqPayload | null>(null);
  const [rewriteErrors, setRewriteErrors] = useState<string[]>([]);

  // The MCQ block Insights pointed at, matched by its stable client id.
  const rewriteBlock = useMemo(
    () =>
      rewrite ? blocks.find((b) => b.client_id === rewrite.clientId && b.block_type === 'mcq') : undefined,
    [rewrite, blocks]
  );
  const rewritePayload = rewriteBlock ? (rewriteBlock.payload as McqPayload) : null;
  const rewriteStats = useMemo(
    () => (rewrite && rewritePayload ? buildRewriteStats(rewrite.stat, rewritePayload) : null),
    [rewrite, rewritePayload]
  );

  // Arriving from Insights opens the panel straight on the rewrite tab, once.
  useEffect(() => {
    if (!openRewrite || !rewriteBlock) return;
    setMode('rewrite_question');
    setOpen(true);
    onOpenRewriteHandled?.();
  }, [openRewrite, rewriteBlock, onOpenRewriteHandled]);

  const improvable = useMemo(
    () =>
      blocks
        .map((b, index) => ({ b, index }))
        .filter(({ b }) =>
          ['text', 'callout', 'flip_cards', 'accordion', 'mcq', 'scenario'].includes(b.block_type)
        ),
    [blocks]
  );


  const toDraftItems = (list: DraftBlock[]): DraftItem[] =>
    mapDraftBlocks(list).map((mapped) => ({
      id: null,
      client_id: crypto.randomUUID(),
      block_type: mapped.block_type,
      payload: mapped.payload,
      contributes_to_completion: defaultContributesToCompletion(mapped.block_type),
      issues: mapped.issues,
      editing: false,
    }));

  const run = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('author-lesson-blocks', {
        body,
      });
      if (fnError) {
        // The function's own JSON body carries the honest reason.
        let detail = '';
        const res = (fnError as unknown as { context?: Response }).context;
        if (res && typeof res.json === 'function') {
          const parsed = await res.json().catch(() => null);
          if (parsed?.error) detail = String(parsed.error);
        }
        setError(detail || copilotErrorMessage(fnError));
        return null;
      }
      if (data?.error) {
        setError(String(data.error));
        return null;
      }
      return data as { blocks?: DraftBlock[] };
    } catch (err) {
      setError(copilotErrorMessage(err));
      return null;
    } finally {
      setBusy(false);
    }
  };

  /**
   * Reads the words out of a .docx in the browser. Mammoth is only downloaded
   * when someone actually imports a document, so the editor stays light.
   */
  const importDocx = async (file: File) => {
    setImporting(true);
    setError(null);
    try {
      const mammoth = await import('mammoth/mammoth.browser');
      const buffer = await file.arrayBuffer();
      const result = await (mammoth as { extractRawText: (o: { arrayBuffer: ArrayBuffer }) => Promise<{ value: string }> })
        .extractRawText({ arrayBuffer: buffer });
      const text = (result.value || '')
        .split('\n')
        .map((line) => line.trim())
        .filter((line, index, all) => line || all[index - 1])
        .join('\n')
        .trim();
      if (!text) {
        setError('That document had no text we could read.');
        return;
      }
      if (text.length > 40000) {
        setSourceText(text.slice(0, 40000));
        setError(
          'That document is longer than 40,000 characters, so only the first part was brought in. Check the end of the text before drafting.'
        );
        return;
      }
      setSourceText(text);
    } catch (err) {
      console.error('Error reading Word document:', err);
      setError('We could not read that document. Save it as .docx and try again.');
    } finally {
      setImporting(false);
    }
  };

  const draftFromText = async () => {
    const data = await run({
      mode: 'draft_lesson',
      lesson_id: lessonId,
      input: { text: sourceText, title: lessonTitle, audience: 'care worker' },
    });
    if (data?.blocks) setDrafts(toDraftItems(data.blocks));
  };

  const knowledgeCheck = async () => {
    const data = await run({
      mode: 'knowledge_check',
      lesson_id: lessonId,
      input: {
        count: Number(questionCount) || 3,
        blocks: blocks.map((b) => ({ block_type: b.block_type, payload: b.payload })),
      },
    });
    if (data?.blocks) setDrafts(toDraftItems(data.blocks));
  };

  const improveBlock = async () => {
    const target = blocks[Number(improveIndex)];
    if (!target) return;
    const chosen = instruction === 'free' ? freeInstruction.trim() : instruction;
    const data = await run({
      mode: 'improve_block',
      lesson_id: lessonId,
      input: { block_type: target.block_type, payload: target.payload, instruction: chosen },
    });
    if (data?.blocks) setDrafts(toDraftItems(data.blocks));
  };

  /**
   * Insights → rewrite. Only aggregate counts are sent, and the reply is mapped
   * back onto the EXISTING option ids so accepting it keeps every statistic and
   * every answer already recorded against this block.
   */
  const runRewrite = async () => {
    if (!rewriteBlock || !rewritePayload || !rewriteStats) return;
    setRewriteDraft(null);
    setRewriteErrors([]);
    const data = (await run({
      mode: 'rewrite_question',
      lesson_id: lessonId,
      input: {
        block_type: 'mcq',
        payload: rewritePayload,
        stats: rewriteStats,
        focus: rewriteFocus,
      },
    })) as unknown as {
      question?: string;
      options?: { label?: string; feedback?: string }[];
      correct_index?: number;
      explanation?: string;
    } | null;
    if (!data?.options) return;
    const replyOptions = data.options;
    const next: McqPayload = {
      ...rewritePayload,
      question: (data.question ?? rewritePayload.question).trim(),
      explanation: (data.explanation ?? rewritePayload.explanation ?? '').trim() || undefined,
      options: rewritePayload.options.map((option, index) => {
        const reply = replyOptions[index];
        const feedback = (reply?.feedback ?? option.feedback ?? '').trim();
        return {
          ...option,
          label: (reply?.label ?? option.label).trim() || option.label,
          feedback: feedback || undefined,
        };
      }),
      correct_id:
        rewritePayload.options[Number(data.correct_index)]?.id ?? rewritePayload.correct_id,
    };
    const errors = validateRewrite(rewritePayload, next);
    if (errors.length) {
      setRewriteErrors(errors);
      return;
    }
    setRewriteDraft(next);
  };

  const acceptRewrite = () => {
    if (!rewriteBlock || !rewriteDraft || !rewriteStats || !onReplace) return;
    onReplace(rewriteBlock.client_id, rewriteDraft, rewriteNote(rewriteStats));
    setRewriteDraft(null);
    setOpen(false);
  };



  const patchDraft = (clientId: string, patch: Partial<DraftItem>) =>
    setDrafts((prev) =>
      prev.map((d) => {
        if (d.client_id !== clientId) return d;
        const next = { ...d, ...patch };
        // Re-validate on every edit so a fixed draft becomes acceptable.
        const visibility = validateVisibility([
          ...blocks.map((b) => ({ id: b.client_id, block_type: b.block_type, payload: b.payload })),
          { id: next.client_id, block_type: next.block_type, payload: next.payload },
        ]).filter((i) => i.block_id === next.client_id);
        const issues = [
          ...draftBlockIssues({ block_type: next.block_type, payload: next.payload }),
          ...visibility.map((i) => i.message),
        ];
        return { ...next, issues };
      })
    );

  const accept = (clientId: string) => {
    const draft = drafts.find((d) => d.client_id === clientId);
    if (!draft || draft.issues.length) return;
    onAccept([{ block_type: draft.block_type, payload: draft.payload }]);
    setDrafts((prev) => prev.filter((d) => d.client_id !== clientId));
  };

  const acceptAll = () => {
    const usable = drafts.filter((d) => !d.issues.length);
    if (!usable.length) return;
    onAccept(usable.map((d) => ({ block_type: d.block_type, payload: d.payload })));
    setDrafts((prev) => prev.filter((d) => d.issues.length));
  };

  const previewBlock = (draft: DraftItem): LessonBlock[] => [
    {
      id: draft.client_id,
      lesson_id: lessonId ?? '',
      order_index: 0,
      block_type: draft.block_type,
      payload: draft.payload,
      is_graded: false,
      contributes_to_completion: draft.contributes_to_completion,
    },
  ];

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="outline">
          <Sparkles className="mr-2 h-4 w-4" />
          Draft with AI
        </Button>
      </SheetTrigger>
      <SheetContent side="right" className="w-full overflow-y-auto sm:max-w-xl">
        <SheetHeader>
          <SheetTitle>Draft with AI</SheetTitle>
          <SheetDescription>
            Nothing is added to the lesson until you accept it, and nothing is saved until you press
            “Save content”.
          </SheetDescription>
        </SheetHeader>

        <p className="mt-2 text-xs text-muted-foreground">{AI_DISCLAIMER}</p>

        <Tabs value={mode} onValueChange={(v) => setMode(v as Mode)} className="mt-4">
          <TabsList className="grid w-full grid-cols-1 sm:grid-cols-4">
            <TabsTrigger value="draft_lesson">Draft from text</TabsTrigger>
            <TabsTrigger value="knowledge_check">Knowledge check</TabsTrigger>
            <TabsTrigger value="improve_block">Improve</TabsTrigger>
            {rewriteBlock && (
              <TabsTrigger value="rewrite_question" data-testid="rewrite-tab-trigger">
                Rewrite from Insights
              </TabsTrigger>
            )}
          </TabsList>


          <TabsContent value="draft_lesson" className="space-y-3 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="copilot-source">Paste your source text</Label>
              <Textarea
                id="copilot-source"
                rows={10}
                value={sourceText}
                maxLength={40000}
                placeholder="Paste the policy, handout or notes this lesson is based on."
                onChange={(e) => setSourceText(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                {sourceText.length.toLocaleString()} of 40,000 characters. Paste the text in, or bring
                it in from a Word document.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button variant="outline" size="sm" asChild disabled={importing}>
                <label className="cursor-pointer">
                  {importing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Import from Word
                  <input
                    type="file"
                    accept=".docx"
                    className="sr-only"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (file) void importDocx(file);
                    }}
                  />
                </label>
              </Button>
              <span className="text-xs text-muted-foreground">
                .docx only. Pictures and layout are not brought across — just the words.
              </span>
            </div>
            <Button onClick={draftFromText} disabled={busy || sourceText.trim().length < 200}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Draft this lesson
            </Button>
          </TabsContent>

          <TabsContent value="knowledge_check" className="space-y-3 pt-4">
            <p className="text-sm text-muted-foreground">
              Writes questions from the wording already in this lesson.
            </p>
            <div className="space-y-1.5">
              <Label htmlFor="copilot-count">How many questions</Label>
              <Select value={questionCount} onValueChange={setQuestionCount}>
                <SelectTrigger id="copilot-count" className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {['1', '2', '3', '4', '5', '6'].map((n) => (
                    <SelectItem key={n} value={n}>
                      {n}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={knowledgeCheck} disabled={busy || !blocks.length}>
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Write questions
            </Button>
            {!blocks.length && (
              <p className="text-xs text-muted-foreground">Add some lesson content first.</p>
            )}
          </TabsContent>

          <TabsContent value="improve_block" className="space-y-3 pt-4">
            <div className="space-y-1.5">
              <Label htmlFor="copilot-block">Which block</Label>
              <Select value={improveIndex} onValueChange={setImproveIndex}>
                <SelectTrigger id="copilot-block">
                  <SelectValue placeholder="Choose a block" />
                </SelectTrigger>
                <SelectContent>
                  {improvable.map(({ b, index }) => (
                    <SelectItem key={b.client_id} value={String(index)}>
                      {index + 1}. {BLOCK_LABELS[b.block_type]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="copilot-instruction">What should change</Label>
              <Select value={instruction} onValueChange={setInstruction}>
                <SelectTrigger id="copilot-instruction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="simplify">Make it simpler to read</SelectItem>
                  <SelectItem value="shorten">Make it shorter</SelectItem>
                  <SelectItem value="add_safety_callout">Add a safety note</SelectItem>
                  <SelectItem value="free">Something else…</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {instruction === 'free' && (
              <div className="space-y-1.5">
                <Label htmlFor="copilot-free">Say what you want changed</Label>
                <Input
                  id="copilot-free"
                  maxLength={300}
                  value={freeInstruction}
                  onChange={(e) => setFreeInstruction(e.target.value)}
                />
              </div>
            )}
            <Button
              onClick={improveBlock}
              disabled={
                busy ||
                !improvable.length ||
                (instruction === 'free' && freeInstruction.trim().length < 5)
              }
            >
              {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Redraft this block
            </Button>
            {!improvable.length && (
              <p className="text-xs text-muted-foreground">
                None of the blocks in this lesson can be redrafted by AI yet.
              </p>
            )}
          </TabsContent>

          {rewriteBlock && rewritePayload && rewriteStats && (
            <TabsContent value="rewrite_question" className="space-y-3 pt-4" data-testid="rewrite-tab">
              <div className="rounded-lg border bg-muted/40 p-3">
                <p className="text-sm font-medium text-foreground">{rewritePayload.question}</p>
                <p className="mt-1 text-xs text-muted-foreground" data-testid="rewrite-stats">
                  {rewriteSummary(rewriteStats)}
                </p>
              </div>
              <p className="text-sm text-muted-foreground">
                The right answer stays exactly as it is. Only the wrong answers, their feedback and
                the explanation can change.
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="rewrite-focus">What should change</Label>
                <Select
                  value={rewriteFocus}
                  onValueChange={(value) => setRewriteFocus(value as RewriteFocus)}
                >
                  <SelectTrigger id="rewrite-focus">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="both">The wrong answers and the explanation</SelectItem>
                    <SelectItem value="distractors">Just the wrong answers</SelectItem>
                    <SelectItem value="explanation">Just the feedback and explanation</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={runRewrite} disabled={busy} data-testid="rewrite-run">
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Rewrite this question
              </Button>

              {rewriteErrors.length > 0 && (
                <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
                  <p className="text-sm text-destructive">
                    That rewrite was refused, because it changed something it must not:
                  </p>
                  <ul className="mt-1 list-disc pl-5 text-xs text-destructive">
                    {rewriteErrors.map((message) => (
                      <li key={message}>{message}</li>
                    ))}
                  </ul>
                </div>
              )}

              {rewriteDraft && (
                <div className="space-y-3 rounded-lg border bg-card p-3" data-testid="rewrite-diff">
                  <h3 className="text-sm font-semibold text-foreground">What would change</h3>
                  <RewriteDiff before={rewritePayload} after={rewriteDraft} />
                  <div className="flex items-center gap-2">
                    <Button size="sm" onClick={acceptRewrite} data-testid="rewrite-accept">
                      <Check className="mr-1 h-4 w-4" />
                      Use this rewrite
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setRewriteDraft(null)}
                      data-testid="rewrite-reject"
                    >
                      Keep the question as it is
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Accepting replaces this question in the editor. Nothing is saved until you press
                    “Save content”.
                  </p>
                </div>
              )}
            </TabsContent>
          )}
        </Tabs>


        {error && (
          <div className="mt-4 flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" aria-hidden="true" />
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}

        {drafts.length > 0 && (
          <div className="mt-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold text-foreground">
                {drafts.length} draft{drafts.length === 1 ? '' : 's'} to review
              </h3>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setDrafts([])}>
                  Reject all
                </Button>
                <Button
                  size="sm"
                  onClick={acceptAll}
                  disabled={!drafts.some((d) => !d.issues.length)}
                >
                  Accept all
                </Button>
              </div>
            </div>

            {drafts.map((draft, index) => (
              <div key={draft.client_id} className="space-y-3 rounded-lg border bg-card p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <Badge variant="secondary">{BLOCK_LABELS[draft.block_type]}</Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => patchDraft(draft.client_id, { editing: !draft.editing })}
                    >
                      {draft.editing ? 'Done editing' : 'Edit'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() =>
                        setDrafts((prev) => prev.filter((d) => d.client_id !== draft.client_id))
                      }
                      aria-label={`Reject draft ${index + 1}`}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                    <Button
                      size="sm"
                      onClick={() => accept(draft.client_id)}
                      disabled={draft.issues.length > 0}
                    >
                      <Check className="mr-1 h-4 w-4" />
                      Accept
                    </Button>
                  </div>
                </div>

                {draft.issues.length > 0 && (
                  <ul className="space-y-1">
                    {draft.issues.map((issue) => (
                      <li key={issue} className="text-xs font-medium text-destructive">
                        {issue}
                      </li>
                    ))}
                  </ul>
                )}

                {draft.editing ? (
                  <BlockList
                    blocks={[draft]}
                    onChange={(_, patch) => patchDraft(draft.client_id, patch)}
                    onMove={() => {}}
                    onDuplicate={() => {}}
                    onRemove={() =>
                      setDrafts((prev) => prev.filter((d) => d.client_id !== draft.client_id))
                    }
                    courseId={courseId}
                    lessonId={lessonId}
                  />
                ) : (
                  <LessonBlocks blocks={previewBlock(draft)} preview />
                )}
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}

/** Plain before/after list of what the rewrite changes. */
function RewriteDiff({ before, after }: { before: McqPayload; after: McqPayload }) {
  const diff = diffMcq(before, after);
  return (
    <div className="space-y-2 text-sm">
      {diff.questionChanged && (
        <p>
          <span className="text-muted-foreground">Question: </span>
          <s className="text-muted-foreground">{before.question}</s>{' '}
          <span className="font-medium text-foreground">{after.question}</span>
        </p>
      )}
      <ul className="space-y-1">
        {diff.options.map((option) => (
          <li key={option.index}>
            {option.isCorrect ? (
              <span className="text-muted-foreground">
                Right answer (unchanged): {option.after}
              </span>
            ) : option.labelChanged ? (
              <span>
                <s className="text-muted-foreground">{option.before}</s>{' '}
                <span className="font-medium text-foreground">{option.after}</span>
              </span>
            ) : (
              <span className="text-muted-foreground">{option.after}</span>
            )}
            {option.feedbackChanged && (
              <span className="block text-xs text-muted-foreground">
                Feedback: {after.options[option.index]?.feedback || '(removed)'}
              </span>
            )}
          </li>
        ))}
      </ul>
      {diff.explanationChanged && (
        <p className="text-xs">
          <span className="text-muted-foreground">Explanation: </span>
          {after.explanation || '(removed)'}
        </p>
      )}
    </div>
  );
}
