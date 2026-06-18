import { useMemo, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileText, Search, Play } from 'lucide-react';
import { formatTime } from './useLearnerPrefs';
import type { LessonTranscript, MediaController } from './types';

interface Props {
  transcript: LessonTranscript | null;
  loading: boolean;
  canSeek: boolean;
  controllerRef: React.MutableRefObject<MediaController | null>;
  currentTime: number;
}

export function TranscriptTab({ transcript, loading, canSeek, controllerRef, currentTime }: Props) {
  const [query, setQuery] = useState('');

  const segments = transcript?.segments ?? null;

  const filtered = useMemo(() => {
    if (!segments) return null;
    const q = query.trim().toLowerCase();
    if (!q) return segments;
    return segments.filter((s) => s.text.toLowerCase().includes(q));
  }, [segments, query]);

  if (loading) {
    return <p className="py-6 text-sm text-muted-foreground">Loading transcript…</p>;
  }

  if (!transcript || (!transcript.transcript_text && (!segments || segments.length === 0))) {
    return (
      <div className="py-10 text-center text-muted-foreground">
        <FileText className="mx-auto mb-2 h-8 w-8 opacity-50" />
        <p className="text-sm">Transcript not available for this lesson yet.</p>
      </div>
    );
  }

  // Timestamped segments view
  if (segments && segments.length > 0) {
    return (
      <div className="space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search the transcript…"
            className="pl-9"
          />
        </div>
        <div className="max-h-[460px] space-y-0.5 overflow-y-auto rounded-lg border bg-card p-2">
          {filtered && filtered.length > 0 ? (
            filtered.map((seg, i) => {
              const active =
                canSeek &&
                currentTime >= seg.start &&
                (seg.end == null || currentTime < seg.end);
              return (
                <div
                  key={`${seg.start}-${i}`}
                  className={`flex gap-3 rounded-md p-2 text-sm transition-colors ${
                    active ? 'bg-primary/10' : 'hover:bg-muted/60'
                  }`}
                >
                  <button
                    onClick={() => canSeek && controllerRef.current?.seekTo(seg.start)}
                    disabled={!canSeek}
                    className={`flex h-fit shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs ${
                      canSeek
                        ? 'text-primary hover:bg-primary/15'
                        : 'cursor-default text-muted-foreground'
                    }`}
                  >
                    {canSeek && <Play className="h-3 w-3" />}
                    {formatTime(seg.start)}
                  </button>
                  <p className="leading-relaxed text-foreground/90">{seg.text}</p>
                </div>
              );
            })
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">No matches found.</p>
          )}
        </div>
      </div>
    );
  }

  // Plain text transcript
  return (
    <div className="space-y-3">
      <div className="rounded-lg border bg-card p-4">
        <p className="whitespace-pre-line text-sm leading-relaxed text-foreground/90">
          {transcript.transcript_text}
        </p>
      </div>
    </div>
  );
}
