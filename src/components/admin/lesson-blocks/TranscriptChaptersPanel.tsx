import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { Loader2, Sparkles, Plus, Trash2, ListOrdered } from '@/components/icons';
import { formatTime } from '@/components/course-learn/useLearnerPrefs';
import {
  CHAPTER_TITLE_MAX,
  normaliseChapters,
  parseTimestamp,
  snapToSegmentStarts,
} from '@/lib/transcriptChapters';
import type { TranscriptChapter, TranscriptSegment } from '@/components/course-learn/types';

interface Props {
  lessonId?: string;
  /** Bumped by the parent whenever a transcript is saved, to re-read the row. */
  refreshKey?: number;
}

interface DraftChapter {
  /** Free text while editing, e.g. '1:32'. */
  time: string;
  title: string;
}

const toDraft = (chapters: TranscriptChapter[]): DraftChapter[] =>
  chapters.map((c) => ({ time: formatTime(c.start), title: c.title }));

/**
 * Sections ("chapters") for a lesson video's English transcript.
 *
 * Suggestions come from the `chapterise` mode of `author-lesson-blocks`, which
 * may only return start times copied from the transcript's own segments. NOTHING
 * is saved until staff confirm — titles are learner-facing clinical wording.
 */
export function TranscriptChaptersPanel({ lessonId, refreshKey }: Props) {
  const [segments, setSegments] = useState<TranscriptSegment[] | null>(null);
  const [draft, setDraft] = useState<DraftChapter[]>([]);
  const [saved, setSaved] = useState<TranscriptChapter[]>([]);
  const [loading, setLoading] = useState(false);
  const [suggesting, setSuggesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!lessonId) return;
    let active = true;
    setLoading(true);
    (async () => {
      const { data } = await supabase
        .from('lesson_transcripts')
        .select('segments, chapters')
        .eq('lesson_id', lessonId)
        .eq('language_code', 'en')
        .maybeSingle();
      if (!active) return;
      const segs = (data?.segments as unknown as TranscriptSegment[] | null) ?? null;
      const chapters = normaliseChapters(data?.chapters);
      setSegments(Array.isArray(segs) ? segs : null);
      setSaved(chapters);
      setDraft(toDraft(chapters));
      setLoading(false);
    })();
    return () => {
      active = false;
    };
  }, [lessonId, refreshKey]);

  const hasTimings = (segments?.length ?? 0) > 0;

  const parsed = useMemo(() => {
    const rows = draft.map((d) => ({ start: parseTimestamp(d.time), title: d.title.trim() }));
    const invalid = rows.some((r) => r.start === null || !r.title);
    const chapters = snapToSegmentStarts(
      normaliseChapters(rows.filter((r) => r.start !== null)),
      segments
    );
    return { invalid, chapters };
  }, [draft, segments]);

  const suggest = async () => {
    if (!hasTimings) return;
    setError(null);
    setSuggesting(true);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('author-lesson-blocks', {
        body: { mode: 'chapterise', lesson_id: lessonId, input: { segments } },
      });
      if (fnError) throw fnError;
      const chapters = snapToSegmentStarts(normaliseChapters(data?.chapters), segments);
      if (!chapters.length) throw new Error('No sections came back — please try again.');
      setDraft(toDraft(chapters));
      toast.success('Suggested sections — check the wording before saving');
    } catch (err) {
      console.error('Chapter suggestion failed:', err);
      setError(
        err instanceof Error && err.message
          ? err.message
          : 'The sections could not be suggested. Please try again.'
      );
    } finally {
      setSuggesting(false);
    }
  };

  const save = async () => {
    if (!lessonId) return;
    setSaving(true);
    setError(null);
    try {
      const { error: saveError } = await supabase
        .from('lesson_transcripts')
        .update({ chapters: parsed.chapters as unknown as never })
        .eq('lesson_id', lessonId)
        .eq('language_code', 'en');
      if (saveError) throw saveError;
      setSaved(parsed.chapters);
      setDraft(toDraft(parsed.chapters));
      toast.success(
        parsed.chapters.length ? 'Sections saved' : 'Sections removed'
      );
    } catch (err) {
      console.error('Saving chapters failed:', err);
      setError('The sections could not be saved. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (!lessonId) return null;

  const dirty = JSON.stringify(parsed.chapters) !== JSON.stringify(saved);

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <ListOrdered className="h-4 w-4" />
          Video sections
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={suggest}
          disabled={!hasTimings || suggesting || loading}
        >
          {suggesting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="mr-2 h-4 w-4" />
          )}
          Suggest sections
        </Button>
      </div>

      <p className="text-xs text-muted-foreground">
        Sections let learners jump straight to the part of the video they need. They are taken from
        the English transcript timings, so a translated transcript shows no sections.
      </p>

      {loading && <p className="text-xs text-muted-foreground">Loading…</p>}

      {!loading && !hasTimings && (
        <p className="text-xs text-muted-foreground">
          This lesson has no timed transcript yet — generate a transcript with timings first.
        </p>
      )}

      {!loading && hasTimings && (
        <div className="space-y-2">
          {draft.length === 0 && (
            <p className="text-xs text-muted-foreground">No sections yet.</p>
          )}
          {draft.map((row, i) => {
            const invalidTime = parseTimestamp(row.time) === null;
            return (
              <div key={i} className="flex items-start gap-2" data-testid={`transcript-chapter-row-${i}`}>
                <div className="w-24 shrink-0">
                  <Label className="sr-only" htmlFor={`chapter-time-${i}`}>
                    Section {i + 1} start time
                  </Label>
                  <Input
                    id={`chapter-time-${i}`}
                    value={row.time}
                    placeholder="0:00"
                    aria-invalid={invalidTime}
                    className={`font-mono text-xs ${invalidTime ? 'border-destructive' : ''}`}
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev.map((d, j) => (j === i ? { ...d, time: e.target.value } : d))
                      )
                    }
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Label className="sr-only" htmlFor={`chapter-title-${i}`}>
                    Section {i + 1} title
                  </Label>
                  <Input
                    id={`chapter-title-${i}`}
                    value={row.title}
                    maxLength={CHAPTER_TITLE_MAX}
                    placeholder="What this part covers"
                    onChange={(e) =>
                      setDraft((prev) =>
                        prev.map((d, j) => (j === i ? { ...d, title: e.target.value } : d))
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label={`Remove section ${i + 1}`}
                  onClick={() => setDraft((prev) => prev.filter((_, j) => j !== i))}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}

          <div className="flex flex-wrap gap-2 pt-1">
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => setDraft((prev) => [...prev, { time: '0:00', title: '' }])}
            >
              <Plus className="mr-1.5 h-4 w-4" /> Add a section
            </Button>
            <Button type="button" size="sm" onClick={save} disabled={saving || !dirty}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save sections
            </Button>
          </div>
          {parsed.invalid && (
            <p className="text-xs text-muted-foreground">
              Rows without a valid time (like 1:32) and a title are left out when you save.
            </p>
          )}
        </div>
      )}

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
