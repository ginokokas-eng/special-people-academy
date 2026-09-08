import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { CheckCircle2, Loader2, Sparkles } from '@/components/icons';
import {
  BLOCK_LABELS,
  translatablePaths,
  type BlockPayload,
  type BlockType,
} from '@/components/course-learn/blocks/types';
import {
  TRANSLATION_LANGUAGES,
  deriveAvailableLangs,
  extractTranslatableTexts,
  sourceHash,
} from '@/lib/translation';

interface SavedBlock {
  id: string;
  block_type: BlockType;
  payload: BlockPayload;
  order_index: number;
}

interface Row {
  id: string;
  block_id: string;
  lang: string;
  status: string;
  source_hash: string;
  overrides: Record<string, string>;
}

/**
 * Blocks are sent in batches sized by how much source text they carry, so one
 * rich block (video checkpoints, a labelled image, a carousel) cannot push a
 * batch past what the model can return in a single JSON reply.
 */
export const TRANSLATE_CHAR_BUDGET = 1500;
/** Hard ceiling on entries per batch, whatever the budget allows. */
const BATCH_MAX = 5;

/**
 * Staff translation workbench for one lesson.
 *
 * Only SAVED blocks can be translated (a translation row points at a real block
 * id), and only REVIEWED rows are ever shown to learners. Nothing here touches
 * block payloads, ids, grading or analytics — a translation is an overlay.
 */
export function TranslationsPanel({ lessonId }: { lessonId?: string }) {
  const [lang, setLang] = useState(TRANSLATION_LANGUAGES[0].code);
  const [blocks, setBlocks] = useState<SavedBlock[]>([]);
  const [rows, setRows] = useState<Row[]>([]);
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [edits, setEdits] = useState<Record<string, Record<string, string>>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!lessonId) return;
    setLoading(true);
    const [blockRes, rowRes] = await Promise.all([
      supabase
        .from('lesson_blocks')
        .select('id, block_type, payload, order_index')
        .eq('lesson_id', lessonId)
        .order('order_index'),
      supabase
        .from('lesson_translations')
        .select('id, block_id, lang, status, source_hash, overrides')
        .eq('lesson_id', lessonId),
    ]);
    if (blockRes.error) toast.error('Could not load this lesson’s blocks');
    if (rowRes.error) toast.error('Could not load the translations');
    const loaded = (blockRes.data ?? []).map((b) => ({
      id: b.id,
      block_type: b.block_type as BlockType,
      payload: (b.payload ?? {}) as unknown as BlockPayload,
      order_index: b.order_index,
    }));
    setBlocks(loaded);
    setRows(
      ((rowRes.data ?? []) as unknown as Row[]).map((r) => ({
        ...r,
        overrides: (r.overrides ?? {}) as Record<string, string>,
      }))
    );
    setEdits({});
    const next: Record<string, string> = {};
    for (const block of loaded) {
      next[block.id] = await sourceHash(
        extractTranslatableTexts(block.payload, translatablePaths[block.block_type] ?? [])
      );
    }
    setHashes(next);
    setLoading(false);
  }, [lessonId]);

  useEffect(() => {
    void load();
  }, [load]);

  const language = TRANSLATION_LANGUAGES.find((l) => l.code === lang) ?? TRANSLATION_LANGUAGES[0];
  const langRows = useMemo(() => rows.filter((r) => r.lang === lang), [rows, lang]);
  const rowByBlock = useMemo(
    () => new Map(langRows.map((r) => [r.block_id, r])),
    [langRows]
  );

  /** Blocks that actually hold readable text — the rest need no translation. */
  const translatable = useMemo(
    () =>
      blocks
        .map((block) => ({
          block,
          texts: extractTranslatableTexts(block.payload, translatablePaths[block.block_type] ?? []),
        }))
        .filter((entry) => Object.keys(entry.texts).length > 0),
    [blocks]
  );

  const reviewedCount = translatable.filter(
    (entry) => rowByBlock.get(entry.block.id)?.status === 'reviewed'
  ).length;
  const published = deriveAvailableLangs(
    blocks.map((b) => b.id),
    langRows
  ).includes(lang);

  const draftBlocks = async (targets: typeof translatable) => {
    if (!lessonId || !targets.length) return;
    setBusy('draft');
    try {
      for (let i = 0; i < targets.length; i += BATCH_SIZE) {
        const batch = targets.slice(i, i + BATCH_SIZE);
        const { data, error } = await supabase.functions.invoke('author-lesson-blocks', {
          body: {
            mode: 'translate_blocks',
            lesson_id: lessonId,
            input: {
              lang,
              blocks: batch.map((entry) => ({
                block_id: entry.block.id,
                block_type: entry.block.block_type,
                texts: entry.texts,
              })),
            },
          },
        });
        if (error) {
          const message =
            (data as { error?: string } | null)?.error ??
            'The translation service could not be reached.';
          toast.error(message);
          return;
        }
        const replies = ((data as { blocks?: { block_id: string; texts: Record<string, string> }[] })
          ?.blocks ?? []);
        const { data: session } = await supabase.auth.getSession();
        const author = session.session?.user.id ?? null;
        const payloads = [];
        for (const reply of replies) {
          const entry = batch.find((b) => b.block.id === reply.block_id);
          if (!entry) continue;
          payloads.push({
            lesson_id: lessonId,
            lang,
            block_id: entry.block.id,
            source_hash: await sourceHash(entry.texts),
            overrides: reply.texts,
            status: 'draft',
            model: 'lovable-ai',
            created_by: author,
            reviewed_by: null,
            reviewed_at: null,
          });
        }
        if (payloads.length) {
          const { error: saveError } = await supabase
            .from('lesson_translations')
            .upsert(payloads, { onConflict: 'lesson_id,lang,block_id' });
          if (saveError) {
            console.error('Could not save translation drafts:', saveError);
            toast.error('Could not save the drafts');
            return;
          }
        }
      }
      toast.success(`Draft ${language.english} translation ready to review`);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const saveBlock = async (blockId: string, texts: Record<string, string>) => {
    if (!lessonId) return;
    const row = rowByBlock.get(blockId);
    const merged = { ...(row?.overrides ?? {}), ...(edits[blockId] ?? {}) };
    setBusy(blockId);
    try {
      const { error } = await supabase.from('lesson_translations').upsert(
        {
          lesson_id: lessonId,
          lang,
          block_id: blockId,
          source_hash: row?.source_hash ?? (await sourceHash(texts)),
          overrides: merged,
          status: row?.status ?? 'draft',
        },
        { onConflict: 'lesson_id,lang,block_id' }
      );
      if (error) throw error;
      toast.success('Translation saved');
      await load();
    } catch (error) {
      console.error('Could not save translation:', error);
      toast.error('Could not save that translation');
    } finally {
      setBusy(null);
    }
  };

  const setStatus = async (blockId: string, status: 'draft' | 'reviewed') => {
    const row = rowByBlock.get(blockId);
    if (!row) return;
    setBusy(blockId);
    try {
      const { data: session } = await supabase.auth.getSession();
      const { error } = await supabase
        .from('lesson_translations')
        .update({
          status,
          source_hash: status === 'reviewed' ? (hashes[blockId] ?? row.source_hash) : row.source_hash,
          reviewed_by: status === 'reviewed' ? (session.session?.user.id ?? null) : null,
          reviewed_at: status === 'reviewed' ? new Date().toISOString() : null,
        })
        .eq('id', row.id);
      if (error) throw error;
      await load();
    } catch (error) {
      console.error('Could not change translation status:', error);
      toast.error('Could not update that translation');
    } finally {
      setBusy(null);
    }
  };

  const unpublishLanguage = async () => {
    if (!lessonId) return;
    setBusy('unpublish');
    try {
      const { error } = await supabase
        .from('lesson_translations')
        .update({ status: 'draft', reviewed_by: null, reviewed_at: null })
        .eq('lesson_id', lessonId)
        .eq('lang', lang);
      if (error) throw error;
      toast.success(`${language.english} is no longer shown to learners`);
      await load();
    } catch (error) {
      console.error('Could not unpublish language:', error);
      toast.error('Could not unpublish that language');
    } finally {
      setBusy(null);
    }
  };

  if (!lessonId) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Translations</CardTitle>
        <CardDescription>
          Reviewed translations are shown to learners; drafts are never shown. Learners only get the
          language toggle once every block in the lesson has been reviewed.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="space-y-1.5">
            <Label htmlFor="translation-lang" className="text-xs">
              Language
            </Label>
            <Select value={lang} onValueChange={setLang}>
              <SelectTrigger id="translation-lang" className="w-[190px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TRANSLATION_LANGUAGES.map((l) => (
                  <SelectItem key={l.code} value={l.code}>
                    {l.label} ({l.english})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Badge variant="secondary" className="tabular-nums">
            {reviewedCount}/{translatable.length} reviewed
          </Badge>
          {published && (
            <Badge className="bg-success/15 text-success hover:bg-success/15">
              <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
              Live for learners
            </Badge>
          )}
          <div className="ml-auto flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              onClick={() => void draftBlocks(translatable)}
              disabled={!!busy || !translatable.length}
            >
              {busy === 'draft' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="mr-2 h-4 w-4" />
              )}
              Draft translation with AI
            </Button>
            {langRows.some((r) => r.status === 'reviewed') && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => void unpublishLanguage()}
                disabled={!!busy}
              >
                Unpublish language
              </Button>
            )}
          </div>
        </div>

        {loading && <p className="text-sm text-muted-foreground">Loading…</p>}

        {!loading && !translatable.length && (
          <p className="text-sm text-muted-foreground">
            Save the lesson first — only saved blocks with readable text can be translated.
          </p>
        )}

        {!loading &&
          translatable.map((entry, index) => {
            const row = rowByBlock.get(entry.block.id);
            const stale = !!row && !!hashes[entry.block.id] && row.source_hash !== hashes[entry.block.id];
            const paths = Object.keys(entry.texts);
            return (
              <div key={entry.block.id} className="rounded-lg border p-3">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">
                    {index + 1}. {BLOCK_LABELS[entry.block.block_type]}
                  </span>
                  {row?.status === 'reviewed' ? (
                    <Badge variant="secondary">Reviewed</Badge>
                  ) : row ? (
                    <Badge variant="outline">Draft</Badge>
                  ) : (
                    <Badge variant="outline">Not translated</Badge>
                  )}
                  {stale && (
                    <Badge variant="destructive">
                      Stale — the English has changed
                    </Badge>
                  )}
                  <div className="ml-auto flex gap-2">
                    {stale && (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => void draftBlocks([entry])}
                        disabled={!!busy}
                      >
                        Re-draft this block
                      </Button>
                    )}
                    {row && (
                      <>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => void saveBlock(entry.block.id, entry.texts)}
                          disabled={!!busy || !edits[entry.block.id]}
                        >
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant={row.status === 'reviewed' ? 'ghost' : 'default'}
                          onClick={() =>
                            void setStatus(
                              entry.block.id,
                              row.status === 'reviewed' ? 'draft' : 'reviewed'
                            )
                          }
                          disabled={!!busy || !!edits[entry.block.id]}
                        >
                          {row.status === 'reviewed' ? 'Undo reviewed' : 'Mark reviewed'}
                        </Button>
                      </>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  {paths.map((path) => (
                    <div key={path} className="grid gap-2 sm:grid-cols-2">
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">English · {path}</p>
                        <p className="whitespace-pre-line rounded-md bg-muted/50 p-2 text-sm">
                          {entry.texts[path]}
                        </p>
                      </div>
                      <div>
                        <p className="mb-1 text-xs text-muted-foreground">{language.label}</p>
                        <Textarea
                          rows={3}
                          value={
                            edits[entry.block.id]?.[path] ??
                            row?.overrides?.[path] ??
                            ''
                          }
                          placeholder={row ? '' : 'Draft a translation first'}
                          onChange={(event) =>
                            setEdits((prev) => ({
                              ...prev,
                              [entry.block.id]: {
                                ...(prev[entry.block.id] ?? {}),
                                [path]: event.target.value,
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
      </CardContent>
    </Card>
  );
}
