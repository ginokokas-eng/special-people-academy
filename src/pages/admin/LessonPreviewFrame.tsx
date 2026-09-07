import { useEffect, useMemo, useState } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { LessonBlocks } from '@/components/course-learn/blocks/LessonBlocks';
import { PreviewLanguageProvider } from '@/components/course-learn/PreviewLanguageContext';
import { translatablePaths, type LessonBlock } from '@/components/course-learn/blocks/types';
import { languageByCode, mergeTranslation } from '@/lib/translation';
import { setDocumentMotion } from '@/hooks/useReducedMotion';

/**
 * Staff-only lesson body, rendered inside a real viewport.
 *
 * The editor embeds this page in a same-origin iframe sized to a device and
 * feeds it the UNSAVED blocks by postMessage, so Tailwind's viewport-based
 * breakpoints behave exactly as they do on a learner's phone.
 *
 * NOTHING IS EVER WRITTEN. `preview` on LessonBlocks disables every response
 * read and write, no media bridge is mounted and no completion callback is
 * passed, so none of these write paths can be reached from here:
 *   lesson_progress, lesson_block_responses, block_marks,
 *   quiz attempt RPCs (start_quiz_attempt / submit_quiz_attempt),
 *   enrollments, learner_notes, profiles.preferred_lang.
 */

interface PreviewMessage {
  type: 'academy-preview';
  blocks: LessonBlock[];
  trickleEnabled?: boolean;
  lang?: string | null;
  drafts?: boolean;
}

type Overrides = Record<string, Record<string, string>>;

export default function LessonPreviewFrame() {
  const { lessonId } = useParams();
  const [params] = useSearchParams();
  const [blocks, setBlocks] = useState<LessonBlock[] | null>(null);
  const [trickleEnabled, setTrickleEnabled] = useState(false);
  const [overrides, setOverrides] = useState<Overrides>({});
  const [draftLangUsed, setDraftLangUsed] = useState(false);

  const motionParam = params.get('motion') === 'reduce';
  const langParam = params.get('lang');
  const includeDrafts = params.get('drafts') === '1';
  const lang = languageByCode(langParam) ? langParam : null;
  const language = languageByCode(lang);

  // The frame document carries the attribute; nothing outside it is affected.
  useEffect(() => {
    setDocumentMotion(motionParam);
    return () => setDocumentMotion(false);
  }, [motionParam]);

  // Blocks arrive from the editor — same origin only.
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      const data = event.data as PreviewMessage | undefined;
      if (!data || data.type !== 'academy-preview' || !Array.isArray(data.blocks)) return;
      setBlocks(data.blocks);
      setTrickleEnabled(!!data.trickleEnabled);
    };
    window.addEventListener('message', onMessage);
    // Tell the editor we are ready for the first payload.
    window.parent?.postMessage({ type: 'academy-preview-ready' }, window.location.origin);
    return () => window.removeEventListener('message', onMessage);
  }, []);

  // Staff can read every translation row; the preview may include drafts.
  useEffect(() => {
    let cancelled = false;
    if (!lessonId || !lang) {
      setOverrides({});
      setDraftLangUsed(false);
      return;
    }
    (async () => {
      const statuses = includeDrafts ? ['draft', 'reviewed'] : ['reviewed'];
      const { data, error } = await supabase
        .from('lesson_translations')
        .select('block_id, overrides, status')
        .eq('lesson_id', lessonId)
        .eq('lang', lang)
        .in('status', statuses);
      if (cancelled) return;
      if (error) {
        console.error('Error loading lesson translations:', error);
        setOverrides({});
        setDraftLangUsed(false);
        return;
      }
      const next: Overrides = {};
      let anyDraft = false;
      for (const row of data ?? []) {
        next[row.block_id] = (row.overrides ?? {}) as Record<string, string>;
        if (row.status === 'draft') anyDraft = true;
      }
      setOverrides(next);
      setDraftLangUsed(anyDraft);
    })();
    return () => {
      cancelled = true;
    };
  }, [lessonId, lang, includeDrafts]);

  const merged = useMemo(() => {
    if (!blocks) return null;
    if (!lang || !Object.keys(overrides).length) return blocks;
    return blocks.map((block) => {
      const o = overrides[block.id];
      if (!o) return block;
      return {
        ...block,
        payload: mergeTranslation(block.payload, o, translatablePaths[block.block_type] ?? []),
      };
    });
  }, [blocks, lang, overrides]);

  return (
    <PreviewLanguageProvider value={{ lang, voice: language?.voice ?? 'en-GB' }}>
      <div className="min-h-screen bg-background py-4">
        {language && (
          <p
            data-testid="preview-lang-chip"
            className="mx-auto mb-3 w-fit rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground"
          >
            Previewing {language.label}
            {draftLangUsed ? ' (draft)' : ' (reviewed)'}
          </p>
        )}
        {merged ? (
          <div className="learner-card lesson-content mx-auto w-full max-w-[47rem] p-4 sm:p-6">
            <LessonBlocks blocks={merged} preview trickleEnabled={trickleEnabled} />
          </div>
        ) : (
          <p className="p-6 text-center text-sm text-muted-foreground">Waiting for the editor…</p>
        )}
      </div>
    </PreviewLanguageProvider>
  );
}
