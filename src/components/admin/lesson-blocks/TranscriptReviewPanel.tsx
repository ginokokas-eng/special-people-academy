import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { AlertTriangle, CheckCircle2, FileText, Loader2 } from '@/components/icons';
import { extractAudioForTranscription } from '@/lib/audio-extract';
import type { TranscriptSegment } from '@/components/course-learn/types';

interface Props {
  lessonId?: string;
  /** File just uploaded in the video block — transcription starts automatically. */
  autoFile: File | null;
  /** Cleared once the panel has consumed the auto file. */
  onAutoFileConsumed: () => void;
  /** Video block title, used as the heading when appending to an existing transcript. */
  videoTitle?: string;
}

type Status = 'idle' | 'extracting' | 'transcribing' | 'review' | 'saving';

interface ApiSegment {
  start_s: number;
  end_s: number | null;
  text: string;
}

/**
 * Automatic transcript + captions for an uploaded lesson video.
 *
 * Audio is extracted in the browser (the video is far too large for the STT
 * body ceiling), transcribed by the `transcribe-lesson-video` function, then
 * REVIEWED BY THE AUTHOR. Nothing is written to the database until confirm —
 * clinical wording must be checked by a human first.
 */
export function TranscriptReviewPanel({
  lessonId,
  autoFile,
  onAutoFileConsumed,
  videoTitle,
}: Props) {
  const [status, setStatus] = useState<Status>('idle');
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState('');
  const [segments, setSegments] = useState<ApiSegment[] | null>(null);
  const [truncated, setTruncated] = useState<string | null>(null);
  const [existing, setExisting] = useState<{ hasText: boolean; hasSegments: boolean } | null>(null);
  const [existingText, setExistingText] = useState('');
  const [mode, setMode] = useState<'replace' | 'append'>('replace');
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!lessonId) return;
    let active = true;
    (async () => {
      const { data } = await supabase
        .from('lesson_transcripts')
        .select('transcript_text, segments, updated_at')
        .eq('lesson_id', lessonId)
        .eq('language_code', 'en')
        .maybeSingle();
      if (!active) return;
      if (data) {
        setExisting({
          hasText: !!data.transcript_text,
          hasSegments: Array.isArray(data.segments) && data.segments.length > 0,
        });
        setExistingText(data.transcript_text ?? '');
        setSavedAt(data.updated_at ?? null);
      } else {
        setExisting(null);
      }
    })();
    return () => {
      active = false;
    };
  }, [lessonId]);

  const run = useCallback(
    async (file: File) => {
      if (!lessonId) {
        setError('Save the lesson first, then generate a transcript.');
        return;
      }
      setError(null);
      setTruncated(null);
      setStatus('extracting');
      try {
        const { wav } = await extractAudioForTranscription(file);
        setStatus('transcribing');
        const form = new FormData();
        form.append('file', wav, 'lesson-audio.wav');
        const { data, error: fnError } = await supabase.functions.invoke(
          'transcribe-lesson-video',
          { body: form }
        );
        if (fnError) throw fnError;
        const transcript = (data?.transcript_text ?? '').trim();
        if (!transcript) throw new Error('No speech was detected in this video.');
        setText(transcript);
        setSegments((data?.segments as ApiSegment[] | null) ?? null);
        if (data?.possibly_truncated) {
          setTruncated(
            (data?.truncation_reason as string | null) ??
              'The transcript may be cut short — please check the ending against the video.'
          );
        }
        setStatus('review');
      } catch (err) {
        console.error('Transcription failed:', err);
        setError(
          err instanceof Error && err.message
            ? err.message
            : 'The transcript could not be generated. Please try again.'
        );
        setStatus('idle');
      }
    },
    [lessonId]
  );

  // Auto-run straight after a successful upload.
  useEffect(() => {
    if (!autoFile) return;
    onAutoFileConsumed();
    void run(autoFile);
  }, [autoFile, onAutoFileConsumed, run]);

  const handleConfirm = async () => {
    if (!lessonId) return;
    const clean = text.trim();
    if (!clean) {
      setError('The transcript is empty.');
      return;
    }
    setStatus('saving');
    try {
      const appending = mode === 'append' && !!existing;
      const heading = videoTitle?.trim() || 'Additional video';
      const finalText = appending ? `${existingText.trim()}\n\n${heading}\n\n${clean}` : clean;
      // Mixed timings across two videos would corrupt caption timing, so an
      // append always drops segments.
      const finalSegments: TranscriptSegment[] | null =
        appending || !segments?.length
          ? null
          : segments.map((s) => ({ start: s.start_s, end: s.end_s ?? undefined, text: s.text }));

      const { error: saveError } = await supabase.from('lesson_transcripts').upsert(
        {
          lesson_id: lessonId,
          language_code: 'en',
          language_label: 'English',
          transcript_text: finalText,
          segments: (finalSegments as unknown as never) ?? null,
        },
        { onConflict: 'lesson_id,language_code' }
      );
      if (saveError) throw saveError;

      toast.success(
        finalSegments
          ? 'Transcript saved — captions will show on this video'
          : 'Transcript saved'
      );
      setExisting({ hasText: true, hasSegments: !!finalSegments });
      setExistingText(finalText);
      setSavedAt(new Date().toISOString());
      setText('');
      setSegments(null);
      setTruncated(null);
      setMode('replace');
      setStatus('idle');
    } catch (err) {
      console.error('Saving transcript failed:', err);
      setError('The transcript could not be saved. Please try again.');
      setStatus('review');
    }
  };

  const busy = status === 'extracting' || status === 'transcribing' || status === 'saving';

  return (
    <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-foreground">
          <FileText className="h-4 w-4" />
          Transcript &amp; captions
        </div>
        {existing?.hasText && (
          <Badge variant="outline" className="gap-1">
            <CheckCircle2 className="h-3 w-3 text-success" />
            Saved{existing.hasSegments ? ' with captions' : ' (text only)'}
          </Badge>
        )}
      </div>

      {status === 'idle' && (
        <>
          <p className="text-xs text-muted-foreground">
            Choose the same video file to generate (or re-generate) the transcript. The audio is
            extracted in your browser — the video is never re-uploaded.
            {savedAt && ` Last saved ${new Date(savedAt).toLocaleDateString('en-GB')}.`}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="video/*,audio/*"
            className="hidden"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (fileRef.current) fileRef.current.value = '';
              if (file) void run(file);
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={!lessonId}
            onClick={() => fileRef.current?.click()}
          >
            Generate transcript
          </Button>
        </>
      )}

      {busy && status !== 'saving' && (
        <p className="flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          {status === 'extracting'
            ? 'Extracting the audio in your browser…'
            : 'Transcribing — this can take a minute…'}
        </p>
      )}

      {(status === 'review' || status === 'saving') && (
        <div className="space-y-2">
          {truncated && (
            <div className="flex gap-2 rounded-md border border-warning/40 bg-warning/10 p-2.5 text-xs text-foreground">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
              <span>{truncated}</span>
            </div>
          )}
          <Label htmlFor={`transcript-${lessonId}`} className="text-xs">
            Review before saving
          </Label>
          <Textarea
            id={`transcript-${lessonId}`}
            rows={10}
            value={text}
            onChange={(e) => setText(e.target.value)}
            className="font-mono text-xs"
          />
          <p className="text-xs text-muted-foreground">
            Check names, doses and clinical terms before saving.{' '}
            {segments?.length
              ? 'Timed captions were detected and will be shown on the video.'
              : 'No reliable timings came back, so this saves as transcript text only (no captions).'}
          </p>

          {existing?.hasText && (
            <div className="space-y-1.5 rounded-md border bg-card p-2.5">
              <p className="text-xs text-muted-foreground">
                This lesson already has a transcript. Replace it, or append this one as a new
                section (appending removes captions, because timings from two videos would clash).
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'replace' ? 'default' : 'outline'}
                  onClick={() => setMode('replace')}
                >
                  Replace
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant={mode === 'append' ? 'default' : 'outline'}
                  onClick={() => setMode('append')}
                >
                  Append
                </Button>
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={handleConfirm} disabled={status === 'saving'}>
              {status === 'saving' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Confirm and save transcript
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={status === 'saving'}
              onClick={() => {
                setText('');
                setSegments(null);
                setTruncated(null);
                setStatus('idle');
              }}
            >
              Discard
            </Button>
          </div>
        </div>
      )}

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}
    </div>
  );
}
