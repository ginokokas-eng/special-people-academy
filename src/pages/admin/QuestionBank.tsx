import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { PortalLayout } from '@/components/layouts/PortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { confirmDialog } from '@/components/ui/confirm-dialog';
import {
  AlertTriangle,
  Edit,
  Loader2,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from '@/components/icons';
import { toast } from 'sonner';
import {
  bankDraftFromBlock,
  correctIdToIndex,
  isOutdated,
  needsVersionBump,
  optionLabels,
  parseTagInput,
  type BankDraft,
  type BankOption,
  type BankQuestion,
} from '@/lib/questionBank';

interface UsageRow {
  usage_id: string;
  kind: string;
  title: string;
  course_title: string;
  lesson_block_id: string | null;
  quiz_question_id: string | null;
  bank_version: number;
  outdated: boolean;
}

const emptyDraft = (): BankDraft => {
  const first = crypto.randomUUID();
  return {
    stem: '',
    options: [
      { id: first, label: '' },
      { id: crypto.randomUUID(), label: '' },
    ],
    correct_id: first,
    explanation: '',
    tags: [],
    standard_code: '',
    difficulty: null,
  };
};

const normalise = (rows: unknown[]): BankQuestion[] =>
  rows.map((r) => {
    const row = r as Record<string, unknown>;
    return {
      ...(row as unknown as BankQuestion),
      options: (Array.isArray(row.options) ? row.options : []) as BankOption[],
      tags: (Array.isArray(row.tags) ? row.tags : []) as string[],
    };
  });

/** Staff-only shared question bank. Learners never see this page or its data. */
export default function QuestionBank() {
  const [rows, setRows] = useState<BankQuestion[]>([]);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [tagFilter, setTagFilter] = useState('all');
  const [standardFilter, setStandardFilter] = useState('all');
  const [difficultyFilter, setDifficultyFilter] = useState('all');

  const [dialog, setDialog] = useState<{ open: boolean; editing: BankQuestion | null }>({
    open: false,
    editing: null,
  });
  const [draft, setDraft] = useState<BankDraft>(emptyDraft());
  const [tagInput, setTagInput] = useState('');
  const [saving, setSaving] = useState(false);

  const [usagePanel, setUsagePanel] = useState<{ bank: BankQuestion | null; usages: UsageRow[]; loading: boolean }>({
    bank: null,
    usages: [],
    loading: false,
  });

  const load = useCallback(async () => {
    setLoading(true);
    const [bankRes, usageRes] = await Promise.all([
      supabase.from('question_bank').select('*').order('updated_at', { ascending: false }),
      supabase.from('question_bank_usages').select('bank_id'),
    ]);
    if (bankRes.error) toast.error('Could not load the question bank');
    setRows(normalise(bankRes.data || []));
    const counts: Record<string, number> = {};
    for (const u of (usageRes.data || []) as { bank_id: string }[]) {
      counts[u.bank_id] = (counts[u.bank_id] || 0) + 1;
    }
    setUsageCounts(counts);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const allTags = useMemo(
    () => Array.from(new Set(rows.flatMap((r) => r.tags))).sort(),
    [rows],
  );
  const allStandards = useMemo(
    () => Array.from(new Set(rows.map((r) => r.standard_code).filter((s): s is string => !!s))).sort(),
    [rows],
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (q && !r.stem.toLowerCase().includes(q) && !r.tags.some((t) => t.includes(q))) return false;
      if (tagFilter !== 'all' && !r.tags.includes(tagFilter)) return false;
      if (standardFilter !== 'all' && r.standard_code !== standardFilter) return false;
      if (difficultyFilter !== 'all' && r.difficulty !== difficultyFilter) return false;
      return true;
    });
  }, [rows, search, tagFilter, standardFilter, difficultyFilter]);

  const openNew = () => {
    setDraft(emptyDraft());
    setTagInput('');
    setDialog({ open: true, editing: null });
  };

  const openEdit = (row: BankQuestion) => {
    setDraft({
      ...bankDraftFromBlock({
        question: row.stem,
        options: row.options,
        correct_id: row.correct_id,
        explanation: row.explanation ?? '',
      }),
      tags: row.tags,
      standard_code: row.standard_code ?? '',
      difficulty: row.difficulty,
    });
    setTagInput('');
    setDialog({ open: true, editing: row });
  };

  const save = async () => {
    if (!draft.stem.trim()) return toast.error('Add the question wording');
    const options = draft.options.filter((o) => o.label.trim());
    if (options.length < 2) return toast.error('Add at least two answers');
    if (correctIdToIndex(options, draft.correct_id) === null) {
      return toast.error('Choose which answer is correct');
    }

    setSaving(true);
    try {
      const body = {
        stem: draft.stem.trim(),
        options: options as never,
        correct_id: draft.correct_id,
        explanation: draft.explanation.trim() || null,
        tags: draft.tags,
        standard_code: draft.standard_code.trim() || null,
        difficulty: draft.difficulty,
      };

      if (dialog.editing) {
        const bump = needsVersionBump(dialog.editing, { ...draft, options });
        const { error } = await supabase
          .from('question_bank')
          .update(bump ? { ...body, version: dialog.editing.version + 1 } : body)
          .eq('id', dialog.editing.id);
        if (error) throw error;
        toast.success(bump ? 'Question saved as a new version' : 'Question saved');
        if (bump) {
          const updated = { ...dialog.editing, ...body, version: dialog.editing.version + 1 } as BankQuestion;
          await load();
          void openUsages(updated);
          setDialog({ open: false, editing: null });
          setSaving(false);
          return;
        }
      } else {
        const { data: claims } = await supabase.auth.getClaims();
        const userId = claims?.claims?.sub as string | undefined;
        const { error } = await supabase
          .from('question_bank')
          .insert({ ...body, created_by: userId ?? null });
        if (error) throw error;
        toast.success('Question added to the bank');
      }

      setDialog({ open: false, editing: null });
      await load();
    } catch (error) {
      console.error('Error saving bank question:', error);
      toast.error('Could not save the question');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (row: BankQuestion) => {
    const used = usageCounts[row.id] || 0;
    const ok = await confirmDialog({
      title: 'Delete this question?',
      description: used
        ? `It is used in ${used} place${used === 1 ? '' : 's'}. Existing copies stay where they are, but the link back to the bank is removed.`
        : 'This removes the question from the bank.',
    });
    if (!ok) return;
    const { error } = await supabase.from('question_bank').delete().eq('id', row.id);
    if (error) return toast.error('Could not delete the question');
    toast.success('Question deleted');
    load();
  };

  const openUsages = async (row: BankQuestion) => {
    setUsagePanel({ bank: row, usages: [], loading: true });
    const { data, error } = await supabase.rpc('get_bank_usage_summary', { _bank_id: row.id });
    if (error) toast.error('Could not load where this question is used');
    setUsagePanel({ bank: row, usages: (data || []) as UsageRow[], loading: false });
  };

  /** Re-copies the current bank wording into one place that uses it. */
  const updateCopy = async (usage: UsageRow) => {
    const bank = usagePanel.bank;
    if (!bank) return;
    try {
      if (usage.quiz_question_id) {
        const index = correctIdToIndex(bank.options, bank.correct_id);
        if (index === null) throw new Error('no correct option');
        const { error } = await supabase
          .from('quiz_questions')
          .update({
            question: bank.stem,
            options: optionLabels(bank.options) as never,
            correct_answer: index,
            explanation: bank.explanation,
          })
          .eq('id', usage.quiz_question_id);
        if (error) throw error;
      } else if (usage.lesson_block_id) {
        const { data: block, error: readError } = await supabase
          .from('lesson_blocks')
          .select('payload')
          .eq('id', usage.lesson_block_id)
          .maybeSingle();
        if (readError) throw readError;
        const payload = (block?.payload ?? {}) as Record<string, unknown>;
        const { error } = await supabase
          .from('lesson_blocks')
          .update({
            payload: {
              ...payload,
              question: bank.stem,
              options: bank.options as never,
              correct_id: bank.correct_id,
              explanation: bank.explanation ?? '',
              bank_id: bank.id,
              bank_version: bank.version,
            },
          })
          .eq('id', usage.lesson_block_id);
        if (error) throw error;
      }

      const { error: usageError } = await supabase
        .from('question_bank_usages')
        .update({ bank_version: bank.version })
        .eq('id', usage.usage_id);
      if (usageError) throw usageError;

      toast.success('Copy updated');
      openUsages(bank);
    } catch (error) {
      console.error('Error updating copy:', error);
      toast.error('Could not update that copy');
    }
  };

  const outdatedCount = usagePanel.usages.filter((u) =>
    isOutdated(u.bank_version, usagePanel.bank?.version),
  ).length;

  return (
    <PortalLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Question bank</h1>
            <p className="text-sm text-muted-foreground">
              Shared questions your team can drop into lessons and quizzes. Learners never see this list.
            </p>
          </div>
          <Button onClick={openNew}>
            <Plus className="mr-2 h-4 w-4" /> New question
          </Button>
        </div>

        <Card>
          <CardHeader className="gap-3">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
              <div className="relative md:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search questions"
                  aria-label="Search questions"
                />
              </div>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger aria-label="Filter by tag">
                  <SelectValue placeholder="All tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All tags</SelectItem>
                  {allTags.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="grid grid-cols-2 gap-3">
                <Select value={standardFilter} onValueChange={setStandardFilter}>
                  <SelectTrigger aria-label="Filter by standard code">
                    <SelectValue placeholder="All standards" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All standards</SelectItem>
                    {allStandards.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger aria-label="Filter by difficulty">
                    <SelectValue placeholder="Any level" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Any level</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="py-12 text-center text-sm text-muted-foreground">
                No questions yet. Add your first question, or save one from a lesson.
              </p>
            ) : (
              <div className="space-y-2">
                {filtered.map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-wrap items-start justify-between gap-3 rounded-lg border p-3"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <p className="break-words text-sm font-medium">{row.stem}</p>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <Badge variant="secondary">v{row.version}</Badge>
                        {row.difficulty && <Badge variant="outline">{row.difficulty}</Badge>}
                        {row.standard_code && <Badge variant="outline">{row.standard_code}</Badge>}
                        {row.tags.map((t) => (
                          <Badge key={t} variant="outline">
                            {t}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm" onClick={() => openUsages(row)}>
                        Used in {usageCounts[row.id] || 0} place
                        {(usageCounts[row.id] || 0) === 1 ? '' : 's'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => openEdit(row)}>
                        <Edit className="mr-1 h-4 w-4" /> Edit
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => remove(row)} aria-label="Delete question">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* New / edit dialog */}
      <Dialog open={dialog.open} onOpenChange={(open) => setDialog({ ...dialog, open })}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{dialog.editing ? 'Edit question' : 'New question'}</DialogTitle>
            <DialogDescription>
              Changing the wording, the answers or which answer is correct creates a new version.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="bank-stem">Question</Label>
              <Textarea
                id="bank-stem"
                rows={2}
                value={draft.stem}
                onChange={(e) => setDraft({ ...draft, stem: e.target.value })}
              />
            </div>

            <div className="space-y-3">
              <Label>Answers</Label>
              {draft.options.map((opt, i) => (
                <div key={opt.id} className="space-y-2 rounded-lg border p-3">
                  <div className="flex items-end gap-2">
                    <div className="flex-1 space-y-1.5">
                      <Label htmlFor={`bank-opt-${opt.id}`}>Answer {i + 1}</Label>
                      <Input
                        id={`bank-opt-${opt.id}`}
                        value={opt.label}
                        onChange={(e) =>
                          setDraft({
                            ...draft,
                            options: draft.options.map((o) =>
                              o.id === opt.id ? { ...o, label: e.target.value } : o,
                            ),
                          })
                        }
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      disabled={draft.options.length <= 2}
                      aria-label={`Remove answer ${i + 1}`}
                      onClick={() => {
                        const remaining = draft.options.filter((o) => o.id !== opt.id);
                        setDraft({
                          ...draft,
                          options: remaining,
                          correct_id:
                            draft.correct_id === opt.id ? (remaining[0]?.id ?? '') : draft.correct_id,
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor={`bank-fb-${opt.id}`}>Feedback for this answer (optional)</Label>
                    <Input
                      id={`bank-fb-${opt.id}`}
                      value={opt.feedback ?? ''}
                      placeholder="What the learner is told if they pick this"
                      onChange={(e) =>
                        setDraft({
                          ...draft,
                          options: draft.options.map((o) =>
                            o.id === opt.id ? { ...o, feedback: e.target.value } : o,
                          ),
                        })
                      }
                    />
                  </div>
                </div>
              ))}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setDraft({
                    ...draft,
                    options: [...draft.options, { id: crypto.randomUUID(), label: '' }],
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Add answer
              </Button>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Correct answer</Label>
                <Select
                  value={draft.correct_id}
                  onValueChange={(value) => setDraft({ ...draft, correct_id: value })}
                >
                  <SelectTrigger aria-label="Correct answer">
                    <SelectValue placeholder="Choose the correct answer" />
                  </SelectTrigger>
                  <SelectContent>
                    {draft.options.map((o, i) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.label.trim() || `Answer ${i + 1}`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Difficulty</Label>
                <Select
                  value={draft.difficulty ?? 'none'}
                  onValueChange={(value) =>
                    setDraft({
                      ...draft,
                      difficulty: value === 'none' ? null : (value as 'easy' | 'medium' | 'hard'),
                    })
                  }
                >
                  <SelectTrigger aria-label="Difficulty">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    <SelectItem value="easy">Easy</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="hard">Hard</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bank-explanation">Explanation shown after answering</Label>
              <Textarea
                id="bank-explanation"
                rows={2}
                value={draft.explanation}
                onChange={(e) => setDraft({ ...draft, explanation: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="bank-tags">Tags</Label>
                <div className="flex flex-wrap gap-1.5">
                  {draft.tags.map((t) => (
                    <Badge key={t} variant="secondary" className="gap-1">
                      {t}
                      <button
                        type="button"
                        aria-label={`Remove tag ${t}`}
                        onClick={() => setDraft({ ...draft, tags: draft.tags.filter((x) => x !== t) })}
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
                <Input
                  id="bank-tags"
                  value={tagInput}
                  placeholder="Type a tag and press Enter"
                  onChange={(e) => setTagInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key !== 'Enter' && e.key !== ',') return;
                    e.preventDefault();
                    const added = parseTagInput(tagInput);
                    if (!added.length) return;
                    setDraft({ ...draft, tags: parseTagInput([...draft.tags, ...added].join(',')) });
                    setTagInput('');
                  }}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="bank-standard">Standard code</Label>
                <Input
                  id="bank-standard"
                  value={draft.standard_code}
                  placeholder="e.g. CS-1.2"
                  onChange={(e) => setDraft({ ...draft, standard_code: e.target.value })}
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialog({ open: false, editing: null })}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {dialog.editing ? 'Save question' : 'Add question'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Where it is used */}
      <Dialog
        open={!!usagePanel.bank}
        onOpenChange={(open) => !open && setUsagePanel({ bank: null, usages: [], loading: false })}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Where this question is used</DialogTitle>
            <DialogDescription className="break-words">{usagePanel.bank?.stem}</DialogDescription>
          </DialogHeader>

          {outdatedCount > 0 && (
            <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm">
              <AlertTriangle className="mt-0.5 h-4 w-4 text-warning" aria-hidden="true" />
              <p>
                {outdatedCount} cop{outdatedCount === 1 ? 'y is' : 'ies are'} outdated. Update each one to
                use the latest wording.
              </p>
            </div>
          )}

          <div className="max-h-[50vh] space-y-2 overflow-y-auto">
            {usagePanel.loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : usagePanel.usages.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Not used anywhere yet.
              </p>
            ) : (
              usagePanel.usages.map((u) => {
                const stale = isOutdated(u.bank_version, usagePanel.bank?.version);
                return (
                  <div key={u.usage_id} className="flex items-center justify-between gap-3 rounded-lg border p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{u.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.kind === 'quiz' ? 'Quiz question' : 'Lesson block'}
                        {u.course_title ? ` · ${u.course_title}` : ''} · copied at v{u.bank_version}
                      </p>
                    </div>
                    {stale ? (
                      <Button size="sm" variant="outline" onClick={() => updateCopy(u)}>
                        <RefreshCw className="mr-1 h-4 w-4" /> Update copy
                      </Button>
                    ) : (
                      <Badge variant="secondary">Up to date</Badge>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </PortalLayout>
  );
}
