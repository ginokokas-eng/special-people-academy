import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle2, Loader2 } from '@/components/icons';
import { VideoPlayer } from '@/components/course-learn/VideoPlayer';
import { useLearnerPrefs } from '@/components/course-learn/useLearnerPrefs';
import type { MediaController, TranscriptSegment } from '@/components/course-learn/types';
import { segmentsToVttUrl } from '@/lib/vtt';
import { VideoCheckpointOverlay } from './VideoCheckpointOverlay';
import { useBlockResponse } from './useBlockResponse';
import {
  supportsCheckpoints,
  videoCheckpoints,
  videoEmbedUrl,
  type VideoCheckpoint,
  type VideoPayload,
} from './types';

interface Props {
  payload: VideoPayload;
  /** Called when the learner has finished watching (player `onEnded`, or confirm for embeds). */
  onWatched: (watched: boolean) => void;
  /** Admin preview — still plays, just never reports completion. */
  preview?: boolean;
  blockId?: string;
  lessonId?: string;
  /** Learner already completed this lesson — never re-lock their seeking. */
  lessonCompleted?: boolean;
}

interface CheckpointAnswer {
  selected_id: string;
  is_correct: boolean;
  attempts: number;
}

/**
 * Video block. Storage-backed sources are played from a SHORT-LIVED signed URL
 * minted by the `lesson-media-url` edge function (enrolment checked server-side).
 * The URL is re-minted whenever playback errors — never cached for the session.
 *
 * Optional in-video checkpoints pause playback at their cue, overlay a formative
 * question inside the player container, and (when `lock_seek`) stop learners
 * scrubbing past the earliest unanswered cue on the first pass.
 */
export function BlockVideo({
  payload,
  onWatched,
  preview,
  blockId,
  lessonId: lessonIdProp,
  lessonCompleted,
}: Props) {
  const { prefs, setPrefs } = useLearnerPrefs();
  const controllerRef = useRef<MediaController | null>(null);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const isStorage = payload.source !== 'url' && !!payload.path;
  const externalUrl = (payload.url || '').trim();
  const embedUrl = payload.source === 'url' ? videoEmbedUrl(externalUrl) : null;

  // Captions are built client-side from the stored transcript segments — a
  // signed bucket URL cannot be used as a plain <track src>.
  const [vttUrl, setVttUrl] = useState<string | null>(null);
  const lessonId = lessonIdProp ?? payload.path?.split('/')[1] ?? null;
  const transcriptLessonId = payload.path?.split('/')[1] ?? lessonIdProp ?? null;

  /* ---------------------------- checkpoint engine --------------------------- */

  const checkpoints = useMemo(
    () => (supportsCheckpoints(payload) ? videoCheckpoints(payload) : []),
    [payload]
  );
  const hasCheckpoints = checkpoints.length > 0;
  const persistEnabled = !preview && hasCheckpoints && !!blockId && !!lessonId;
  const { existing, loaded: responseLoaded, record } = useBlockResponse(
    blockId ?? '',
    lessonId ?? '',
    persistEnabled
  );

  const [answers, setAnswers] = useState<Record<string, CheckpointAnswer>>({});
  const [activeId, setActiveId] = useState<string | null>(null);
  const [ended, setEnded] = useState(false);
  const [boundaryHit, setBoundaryHit] = useState(false);
  const boundaryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Brief highlight of the checkpoint hint when a scrub hits the ceiling. */
  const flashBoundary = useCallback(() => {
    setBoundaryHit(true);
    if (boundaryTimer.current) clearTimeout(boundaryTimer.current);
    boundaryTimer.current = setTimeout(() => setBoundaryHit(false), 900);
  }, []);
  useEffect(() => () => {
    if (boundaryTimer.current) clearTimeout(boundaryTimer.current);
  }, []);
  /**
   * The checkpoint that has just been dismissed: it keeps rendering while the
   * mirrored exit animation plays, then unmounts. A fresh checkpoint clears it
   * immediately so the arrival interrupts rather than queues.
   */
  const [exitingCheckpoint, setExitingCheckpoint] = useState<VideoCheckpoint | null>(null);
  const dismissedRef = useRef<Set<string>>(new Set());

  // Restore saved answers so a returning learner is not asked again.
  useEffect(() => {
    if (!responseLoaded || !existing) return;
    const saved = (existing.response as { checkpoints?: Record<string, CheckpointAnswer> } | null)
      ?.checkpoints;
    if (saved && typeof saved === 'object') setAnswers(saved);
  }, [responseLoaded, existing]);

  const isDone = useCallback(
    (id: string) => !!answers[id]?.is_correct,
    [answers]
  );
  const allAnswered = hasCheckpoints && checkpoints.every((c) => isDone(c.id));
  const nextUnanswered = checkpoints.find((c) => !isDone(c.id)) ?? null;

  /**
   * Seek ceiling: earliest unanswered cue. Applied only once the saved response
   * has loaded, never in preview, never for an already-completed lesson, and
   * never when the author turned the lock off.
   */
  const seekCeiling =
    hasCheckpoints &&
    payload.lock_seek !== false &&
    !preview &&
    !lessonCompleted &&
    (persistEnabled ? responseLoaded : true) &&
    nextUnanswered
      ? nextUnanswered.at_s
      : null;

  // Poll the player clock and raise the overlay when a cue is reached.
  useEffect(() => {
    if (!hasCheckpoints || activeId) return;
    if (persistEnabled && !responseLoaded) return;
    const timer = setInterval(() => {
      const ctrl = controllerRef.current;
      if (!ctrl) return;
      const t = ctrl.getCurrentTime();
      const due = checkpoints.find(
        (c) => !isDone(c.id) && !dismissedRef.current.has(c.id) && t >= c.at_s
      );
      if (due) {
        ctrl.pause?.();
        setActiveId(due.id);
      }
    }, 250);
    return () => clearInterval(timer);
  }, [hasCheckpoints, activeId, checkpoints, isDone, persistEnabled, responseLoaded]);

  const persist = useCallback(
    (next: Record<string, CheckpointAnswer>) => {
      if (!persistEnabled) return;
      const complete = checkpoints.every((c) => next[c.id]?.is_correct);
      void record({
        state: complete ? 'complete' : 'in_progress',
        is_correct: complete ? true : null,
        response: { kind: 'video_checkpoints', checkpoints: next },
      });
    },
    [persistEnabled, checkpoints, record]
  );

  const answerCheckpoint = useCallback(
    (checkpointId: string, optionId: string) => {
      const cp = checkpoints.find((c) => c.id === checkpointId);
      if (!cp) return;
      setAnswers((prev) => {
        const before = prev[checkpointId];
        const next: Record<string, CheckpointAnswer> = {
          ...prev,
          [checkpointId]: {
            selected_id: optionId,
            is_correct: optionId === cp.correct_id,
            attempts: (before?.attempts ?? 0) + 1,
          },
        };
        persist(next);
        return next;
      });
    },
    [checkpoints, persist]
  );

  const continueWatching = useCallback(() => {
    if (activeId) dismissedRef.current.add(activeId);
    setActiveId(null);
    controllerRef.current?.play?.();
  }, [activeId]);

  // Done-signal: played to the end AND every checkpoint answered.
  useEffect(() => {
    if (embedUrl) return;
    onWatched(ended && (!hasCheckpoints || allAnswered));
  }, [ended, hasCheckpoints, allAnswered, embedUrl, onWatched]);

  /* -------------------------------- captions ------------------------------- */

  useEffect(() => {
    if (!transcriptLessonId) return;
    let active = true;
    let objectUrl: string | null = null;
    (async () => {
      const { data } = await supabase
        .from('lesson_transcripts')
        .select('segments')
        .eq('lesson_id', transcriptLessonId)
        .eq('language_code', 'en')
        .maybeSingle();
      if (!active) return;
      objectUrl = segmentsToVttUrl(
        (data?.segments as unknown as TranscriptSegment[] | null) ?? null
      );
      if (objectUrl) setVttUrl(objectUrl);
    })();
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      setVttUrl(null);
    };
  }, [transcriptLessonId]);

  const sign = useCallback(async () => {
    if (!payload.path) return;
    setLoading(true);
    setError(null);
    try {
      const { data, error: fnError } = await supabase.functions.invoke('lesson-media-url', {
        body: { path: payload.path },
      });
      if (fnError) throw fnError;
      if (!data?.url) throw new Error('No URL returned');
      setSignedUrl(data.url as string);
    } catch (err) {
      console.error('Could not get a video link:', err);
      setError('This video could not be loaded. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [payload.path]);

  useEffect(() => {
    setSignedUrl(null);
    if (isStorage) sign();
  }, [isStorage, sign]);

  if (!isStorage && !externalUrl) {
    return (
      <div className="rounded-lg border bg-muted p-6 text-center text-sm text-muted-foreground">
        No video added yet.
      </div>
    );
  }

  const activeCheckpoint = activeId ? checkpoints.find((c) => c.id === activeId) : null;
  const answeredCount = checkpoints.filter((c) => isDone(c.id)).length;
  // Enter and exit share one path, so the overlay stays mounted through its exit.
  const shownCheckpoint = activeCheckpoint ?? exitingCheckpoint;

  return (
    <div className="space-y-2">
      {payload.title?.trim() && (
        <h3 className="text-base font-semibold text-foreground">{payload.title}</h3>
      )}

      {hasCheckpoints && !embedUrl && (
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'transition-all duration-200',
              boundaryHit && 'scale-105 border-primary bg-primary/10 text-primary'
            )}
          >
            {answeredCount}/{checkpoints.length} checkpoints answered
          </Badge>
          <p className="text-xs text-muted-foreground">
            This video pauses to ask you a question along the way.
          </p>
        </div>
      )}

      {embedUrl ? (
        <div className="overflow-hidden rounded-lg border bg-card">
          <div className="aspect-video">
            <iframe
              src={embedUrl}
              title={payload.title?.trim() || 'Lesson video'}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
        </div>
      ) : loading && !signedUrl ? (
        <div className="flex aspect-video items-center justify-center rounded-lg border bg-card">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      ) : error && !signedUrl ? (
        <div className="space-y-3 rounded-lg border bg-card p-6 text-center">
          <p className="text-sm text-muted-foreground">{error}</p>
          <Button variant="outline" size="sm" onClick={sign}>
            Try again
          </Button>
        </div>
      ) : (
        <VideoPlayer
          key={signedUrl ?? externalUrl}
          title={payload.title?.trim() || 'Lesson video'}
          sources={[]}
          fallbackUrl={isStorage ? signedUrl : externalUrl}
          vttUrl={vttUrl}
          hasCaptions={!!vttUrl}
          prefs={prefs}
          setPrefs={setPrefs}
          theatre={false}
          onToggleTheatre={() => {}}
          onToggleTranscript={() => {}}
          onEnded={() => setEnded(true)}
          onMediaError={isStorage ? sign : undefined}
          onContentInfo={() => {}}
          onReport={() => {}}
          controllerRef={controllerRef}
          seekCeiling={seekCeiling}
          onSeekBoundary={flashBoundary}
          overlay={
            activeCheckpoint ? (
              <VideoCheckpointOverlay
                checkpoint={activeCheckpoint}
                index={checkpoints.findIndex((c) => c.id === activeCheckpoint.id) + 1}
                total={checkpoints.length}
                selectedId={answers[activeCheckpoint.id]?.selected_id ?? null}
                answeredCorrectly={!!answers[activeCheckpoint.id]?.is_correct}
                onSelect={(optionId) => answerCheckpoint(activeCheckpoint.id, optionId)}
                onContinue={continueWatching}
              />
            ) : null
          }
        />
      )}

      {payload.caption?.trim() && (
        <p className="text-xs text-muted-foreground">{payload.caption}</p>
      )}

      {/* Embeds cannot report playback end, so learners confirm instead. */}
      {embedUrl && !preview && (
        <div>
          {confirmed ? (
            <span className="flex items-center gap-1.5 text-sm font-medium text-success">
              <CheckCircle2 className="h-4 w-4" /> Marked as watched
            </span>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setConfirmed(true);
                onWatched(true);
              }}
            >
              I’ve watched this video
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
