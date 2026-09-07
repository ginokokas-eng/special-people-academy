import { useEffect, useMemo, useRef, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { FileText, Search, Play, X } from '@/components/icons';
import { formatTime } from './useLearnerPrefs';
import {
  activeChapterIndex,
  normaliseChapters,
  searchSummary,
  searchTranscript,
  segmentsInChapter,
  snapToSegmentStarts,
} from '@/lib/transcriptChapters';
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
  /** Chapter the learner has narrowed the transcript to. null = whole video. */
  const [chapterFilter, setChapterFilter] = useState<number | null>(null);
  const [blockedNote, setBlockedNote] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const segments = transcript?.segments ?? null;

  // Chapters are stored English-only, so they simply disappear on a translated
  // transcript rather than showing untranslated titles.
  const chapters = useMemo(
    () =>
      transcript?.language_code === 'en'
        ? snapToSegmentStarts(normaliseChapters(transcript?.chapters), segments)
        : [],
    [transcript?.chapters, transcript?.language_code, segments]
  );

  const matches = useMemo(
    () => searchTranscript(segments, chapters, query),
    [segments, chapters, query]
  );

  const activeChapter = activeChapterIndex(chapters, currentTime);

  /** Rows on screen: search results win, then any chapter narrowing. */
  const visible = useMemo(() => {
    if (query.trim()) return matches.map((m) => ({ seg: m.segment, chapter: m.chapterIndex }));
    const list =
      chapterFilter === null ? segments ?? [] : segmentsInChapter(segments, chapters, chapterFilter);
    return list.map((seg) => ({ seg, chapter: activeChapterIndex(chapters, seg.start) }));
  }, [query, matches, chapterFilter, segments, chapters]);

  // Reset the narrowing when the lesson's transcript changes underneath us.
  useEffect(() => {
    setChapterFilter(null);
    setQuery('');
    setBlockedNote(null);
  }, [transcript?.id]);

  useEffect(() => {
    if (!blockedNote) return;
    const id = setTimeout(() => setBlockedNote(null), 4000);
    return () => clearTimeout(id);
  }, [blockedNote]);

  /**
   * Jump the video. A locked in-video question can hold the learner back — say
   * so plainly instead of silently landing them somewhere else.
   */
  const jumpTo = (seconds: number) => {
    if (!canSeek) return;
    const ctrl = controllerRef.current;
    if (!ctrl) return;
    const ceiling = ctrl.getSeekCeiling?.() ?? null;
    if (ceiling != null && seconds > ceiling) {
      setBlockedNote('Answer the question in the video first — you can then skip ahead.');
      ctrl.seekTo(ceiling);
      return;
    }
    setBlockedNote(`Jumped to ${formatTime(seconds)}`);
    ctrl.seekTo(seconds);
  };

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
            aria-label="Search the transcript"
            className="pl-9 pr-9"
          />
          {!!query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear the search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-muted-foreground hover:bg-muted"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {!!query.trim() && (
          <p
            className="text-xs text-muted-foreground"
            aria-live="polite"
            data-testid="transcript-search-summary"
          >
            {searchSummary(matches, chapters.length > 0)}
          </p>
        )}

        {chapters.length > 0 && !query.trim() && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-muted-foreground">Sections</p>
              {chapterFilter !== null && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 px-2 text-xs"
                  data-testid="transcript-chapters-show-all"
                  onClick={() => setChapterFilter(null)}
                >
                  Show the whole video
                </Button>
              )}
            </div>
            <ul className="space-y-1" data-testid="transcript-chapters">
              {chapters.map((chapter, i) => {
                const isPlaying = activeChapter === i;
                const isFiltered = chapterFilter === i;
                return (
                  <li key={`${chapter.start}-${i}`}>
                    <div
                      className={`flex items-center gap-2 rounded-md border px-2 py-1.5 text-sm transition-colors ${
                        isPlaying ? 'border-primary/40 bg-primary/10' : 'border-transparent bg-muted/40'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => jumpTo(chapter.start)}
                        disabled={!canSeek}
                        data-testid={`transcript-chapter-${i}`}
                        aria-current={isPlaying ? 'true' : undefined}
                        aria-label={`Play from ${formatTime(chapter.start)}: ${chapter.title}`}
                        className={`flex flex-1 items-center gap-2 text-left ${
                          canSeek ? 'hover:text-primary' : 'cursor-default'
                        }`}
                      >
                        <span className="font-mono text-xs text-muted-foreground">
                          {formatTime(chapter.start)}
                        </span>
                        <span className="font-medium text-foreground">{chapter.title}</span>
                        {isPlaying && (
                          <span className="text-xs text-primary">Playing</span>
                        )}
                      </button>
                      <Button
                        variant={isFiltered ? 'default' : 'ghost'}
                        size="sm"
                        className="h-7 shrink-0 px-2 text-xs"
                        data-testid={`transcript-chapter-read-${i}`}
                        onClick={() => setChapterFilter(isFiltered ? null : i)}
                      >
                        {isFiltered ? 'Showing' : 'Read'}
                      </Button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {blockedNote && (
          <p
            className="rounded-md border border-warning/40 bg-warning/10 p-2 text-xs"
            aria-live="polite"
            data-testid="transcript-seek-status"
          >
            {blockedNote}
          </p>
        )}

        <div
          ref={listRef}
          className="max-h-[460px] space-y-0.5 overflow-y-auto rounded-lg border bg-card p-2"
        >
          {visible.length > 0 ? (
            visible.map(({ seg, chapter }, i) => {
              const active =
                canSeek && currentTime >= seg.start && (seg.end == null || currentTime < seg.end);
              const chapterTitle =
                query.trim() && chapter >= 0 ? chapters[chapter]?.title : undefined;
              return (
                <div
                  key={`${seg.start}-${i}`}
                  className={`flex gap-3 rounded-md p-2 text-sm transition-colors ${
                    active ? 'bg-primary/10' : 'hover:bg-muted/60'
                  }`}
                >
                  <button
                    onClick={() => jumpTo(seg.start)}
                    disabled={!canSeek}
                    aria-label={`Play from ${formatTime(seg.start)}`}
                    className={`flex h-fit shrink-0 items-center gap-1 rounded px-1.5 py-0.5 font-mono text-xs ${
                      canSeek
                        ? 'text-primary hover:bg-primary/15'
                        : 'cursor-default text-muted-foreground'
                    }`}
                  >
                    {canSeek && <Play className="h-3 w-3" />}
                    {formatTime(seg.start)}
                  </button>
                  <div className="min-w-0">
                    {chapterTitle && (
                      <p className="text-xs text-muted-foreground">{chapterTitle}</p>
                    )}
                    <p className="leading-relaxed text-foreground/90">{seg.text}</p>
                  </div>
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
