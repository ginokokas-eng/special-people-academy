import { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { CheckCircle2, Loader2 } from '@/components/icons';
import { VideoPlayer } from '@/components/course-learn/VideoPlayer';
import { useLearnerPrefs } from '@/components/course-learn/useLearnerPrefs';
import type { MediaController, TranscriptSegment } from '@/components/course-learn/types';
import { segmentsToVttUrl } from '@/lib/vtt';
import { videoEmbedUrl, type VideoPayload } from './types';

interface Props {
  payload: VideoPayload;
  /** Called when the learner has finished watching (player `onEnded`, or confirm for embeds). */
  onWatched: (watched: boolean) => void;
  /** Admin preview — still plays, just never reports completion. */
  preview?: boolean;
}

/**
 * Video block. Storage-backed sources are played from a SHORT-LIVED signed URL
 * minted by the `lesson-media-url` edge function (enrolment checked server-side).
 * The URL is re-minted whenever playback errors — never cached for the session.
 */
export function BlockVideo({ payload, onWatched, preview }: Props) {
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
  const lessonId = payload.path?.split('/')[1] ?? null;

  useEffect(() => {
    if (!lessonId) return;
    let active = true;
    let objectUrl: string | null = null;
    (async () => {
      const { data } = await supabase
        .from('lesson_transcripts')
        .select('segments')
        .eq('lesson_id', lessonId)
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
  }, [lessonId]);

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

  return (
    <div className="space-y-2">
      {payload.title?.trim() && (
        <h3 className="text-base font-semibold text-foreground">{payload.title}</h3>
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
          hasCaptions={false}
          prefs={prefs}
          setPrefs={setPrefs}
          theatre={false}
          onToggleTheatre={() => {}}
          onToggleTranscript={() => {}}
          onEnded={() => onWatched(true)}
          onMediaError={isStorage ? sign : undefined}
          onContentInfo={() => {}}
          onReport={() => {}}
          controllerRef={controllerRef}
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
