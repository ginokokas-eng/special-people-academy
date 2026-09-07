/**
 * Pure helpers for transcript chapters ("sections" in learner-facing wording).
 *
 * Chapters are stored on `lesson_transcripts.chapters` as an array of
 * `{ start: seconds, title: text }` sorted by start. Chapters are English-only
 * for now: only the ('en') transcript row carries them, and translated
 * transcripts fall back to no chapters rather than untranslated titles.
 *
 * Everything here is pure so it can be unit-tested without a player, a browser
 * or the database. Time formatting is reused from `useLearnerPrefs`.
 */
import { formatTime } from '@/components/course-learn/useLearnerPrefs';
import type { TranscriptChapter, TranscriptSegment } from '@/components/course-learn/types';

export const CHAPTER_TITLE_MAX = 80;

/** Snapping tolerance / equality tolerance for start times, in seconds. */
const EPS = 0.01;

/**
 * Coerce anything (a jsonb column, an AI reply, an editor draft) into a valid,
 * sorted chapter list. Invalid rows are dropped rather than repaired.
 */
export function normaliseChapters(input: unknown): TranscriptChapter[] {
  if (!Array.isArray(input)) return [];
  const out: TranscriptChapter[] = [];
  for (const raw of input) {
    if (!raw || typeof raw !== 'object') continue;
    const rec = raw as Record<string, unknown>;
    const start = Number(rec.start);
    if (!Number.isFinite(start) || start < 0) continue;
    const title = String(rec.title ?? '').trim().slice(0, CHAPTER_TITLE_MAX).trim();
    if (!title) continue;
    out.push({ start, title });
  }
  out.sort((a, b) => a.start - b.start);
  // Duplicate starts: the first one wins.
  const deduped: TranscriptChapter[] = [];
  for (const c of out) {
    if (deduped.some((d) => Math.abs(d.start - c.start) < EPS)) continue;
    deduped.push(c);
  }
  return deduped;
}

/**
 * Move each chapter start onto the nearest segment start, so a click always
 * lands on the beginning of a spoken line rather than mid-sentence.
 */
export function snapToSegmentStarts(
  chapters: TranscriptChapter[],
  segments: TranscriptSegment[] | null | undefined
): TranscriptChapter[] {
  const starts = (segments ?? [])
    .map((s) => Number(s.start))
    .filter((n) => Number.isFinite(n) && n >= 0)
    .sort((a, b) => a - b);
  if (!starts.length) return normaliseChapters(chapters);
  const snapped = chapters.map((c) => {
    let best = starts[0];
    for (const s of starts) {
      if (Math.abs(s - c.start) < Math.abs(best - c.start)) best = s;
    }
    return { ...c, start: best };
  });
  return normaliseChapters(snapped);
}

/** Index of the chapter playing at `currentTime`; -1 before the first chapter. */
export function activeChapterIndex(chapters: TranscriptChapter[], currentTime: number): number {
  if (!chapters.length || !Number.isFinite(currentTime)) return -1;
  let index = -1;
  chapters.forEach((c, i) => {
    if (c.start <= currentTime + EPS) index = i;
  });
  return index;
}

export interface ChapterSpan extends TranscriptChapter {
  /** Exclusive end: the next chapter's start, or the media duration. */
  end: number | null;
}

/** Add an `end` to each chapter so a span can be highlighted or filtered. */
export function chapterSpans(
  chapters: TranscriptChapter[],
  durationSeconds?: number | null
): ChapterSpan[] {
  const total =
    typeof durationSeconds === 'number' && Number.isFinite(durationSeconds) && durationSeconds > 0
      ? durationSeconds
      : null;
  return chapters.map((c, i) => ({
    ...c,
    end: i < chapters.length - 1 ? chapters[i + 1].start : total,
  }));
}

/** Parse '1:32', '01:32', '92' or '1:02:03' into seconds. Null when unusable. */
export function parseTimestamp(value: string): number | null {
  const raw = (value ?? '').trim();
  if (!raw) return null;
  if (!/^\d{1,2}(:\d{1,2}){0,2}$|^\d+$/.test(raw)) return null;
  const parts = raw.split(':').map((p) => Number(p));
  if (parts.some((n) => !Number.isFinite(n) || n < 0)) return null;
  if (parts.length === 1) return parts[0];
  if (parts.length === 2) {
    if (parts[1] > 59) return null;
    return parts[0] * 60 + parts[1];
  }
  if (parts[1] > 59 || parts[2] > 59) return null;
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

/** Segments that fall inside chapter `index` (its start up to the next start). */
export function segmentsInChapter(
  segments: TranscriptSegment[] | null | undefined,
  chapters: TranscriptChapter[],
  index: number
): TranscriptSegment[] {
  const list = segments ?? [];
  if (index < 0 || index >= chapters.length) return list;
  const start = chapters[index].start;
  const next = index < chapters.length - 1 ? chapters[index + 1].start : null;
  return list.filter(
    (s) => s.start >= start - EPS && (next === null || s.start < next - EPS)
  );
}

export interface TranscriptMatch {
  segment: TranscriptSegment;
  /** Index in the original segment list. */
  index: number;
  chapterIndex: number;
  chapterTitle: string | null;
}

/** Case-insensitive substring search across segments, tagged with its chapter. */
export function searchTranscript(
  segments: TranscriptSegment[] | null | undefined,
  chapters: TranscriptChapter[],
  query: string
): TranscriptMatch[] {
  const q = (query ?? '').trim().toLowerCase();
  const list = segments ?? [];
  if (!q) return [];
  const out: TranscriptMatch[] = [];
  list.forEach((segment, index) => {
    if (!segment.text?.toLowerCase().includes(q)) return;
    const chapterIndex = activeChapterIndex(chapters, segment.start);
    out.push({
      segment,
      index,
      chapterIndex,
      chapterTitle: chapterIndex >= 0 ? chapters[chapterIndex].title : null,
    });
  });
  return out;
}

/** "3 matches in 2 sections" / "1 match" — learner-facing search summary. */
export function searchSummary(matches: TranscriptMatch[], hasChapters: boolean): string {
  const n = matches.length;
  if (n === 0) return 'No matches found';
  const noun = n === 1 ? 'match' : 'matches';
  if (!hasChapters) return `${n} ${noun}`;
  const sections = new Set(matches.map((m) => m.chapterIndex).filter((i) => i >= 0)).size;
  if (!sections) return `${n} ${noun}`;
  return `${n} ${noun} in ${sections} ${sections === 1 ? 'section' : 'sections'}`;
}

/** "0:00 · Arriving at the house" — one line per chapter for copy/download. */
export function chapterHeading(chapter: TranscriptChapter): string {
  return `${formatTime(chapter.start)} — ${chapter.title}`;
}
