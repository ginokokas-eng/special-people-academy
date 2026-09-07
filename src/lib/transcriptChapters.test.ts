import { describe, expect, it } from 'vitest';
import {
  activeChapterIndex,
  chapterHeading,
  chapterSpans,
  normaliseChapters,
  parseTimestamp,
  searchSummary,
  searchTranscript,
  segmentsInChapter,
  snapToSegmentStarts,
} from './transcriptChapters';
import type { TranscriptSegment } from '@/components/course-learn/types';

const segments: TranscriptSegment[] = [
  { start: 0, end: 8, text: 'You arrive at the house and knock.' },
  { start: 8, end: 16, text: 'Wait for an answer before you use the key safe.' },
  { start: 16, end: 24, text: 'Say who you are as you step inside.' },
  { start: 30, end: 38, text: 'Look for signs of injury on the arms and legs.' },
  { start: 38, end: 46, text: 'Any new bruise or graze is recorded.' },
  { start: 46, end: 60, text: 'If you are unsure, stop and escalate to the office.' },
];

const chapters = [
  { start: 0, title: 'Arriving at the house' },
  { start: 30, title: 'Checking for injuries' },
];

describe('normaliseChapters', () => {
  it('returns an empty list for non-arrays', () => {
    expect(normaliseChapters(null)).toEqual([]);
    expect(normaliseChapters('nope')).toEqual([]);
    expect(normaliseChapters({ start: 0 })).toEqual([]);
  });

  it('sorts by start and trims titles', () => {
    expect(
      normaliseChapters([
        { start: 30, title: '  Checking for injuries  ' },
        { start: 0, title: 'Arriving at the house' },
      ])
    ).toEqual(chapters);
  });

  it('drops invalid rows', () => {
    expect(
      normaliseChapters([
        { start: -1, title: 'Negative' },
        { start: 'abc', title: 'Not a number' },
        { start: 5, title: '   ' },
        { start: 5 },
        null,
        { start: 10, title: 'Kept' },
      ])
    ).toEqual([{ start: 10, title: 'Kept' }]);
  });

  it('drops duplicate starts, keeping the first', () => {
    expect(
      normaliseChapters([
        { start: 12, title: 'First' },
        { start: 12, title: 'Second' },
      ])
    ).toEqual([{ start: 12, title: 'First' }]);
  });

  it('caps titles at 80 characters', () => {
    const long = 'a'.repeat(120);
    const [only] = normaliseChapters([{ start: 0, title: long }]);
    expect(only.title).toHaveLength(80);
  });
});

describe('snapToSegmentStarts', () => {
  it('snaps each start to the nearest segment start', () => {
    expect(
      snapToSegmentStarts(
        [
          { start: 2, title: 'Arriving at the house' },
          { start: 29, title: 'Checking for injuries' },
        ],
        segments
      )
    ).toEqual(chapters);
  });

  it('leaves chapters alone when there are no segments', () => {
    expect(snapToSegmentStarts(chapters, [])).toEqual(chapters);
    expect(snapToSegmentStarts(chapters, null)).toEqual(chapters);
  });

  it('collapses two chapters that snap onto the same segment', () => {
    const out = snapToSegmentStarts(
      [
        { start: 31, title: 'One' },
        { start: 32, title: 'Two' },
      ],
      segments
    );
    expect(out).toEqual([{ start: 30, title: 'One' }]);
  });
});

describe('activeChapterIndex', () => {
  it('is -1 before the first chapter', () => {
    expect(activeChapterIndex([{ start: 10, title: 'Later' }], 4)).toBe(-1);
  });

  it('returns the last chapter at or before the time', () => {
    expect(activeChapterIndex(chapters, 0)).toBe(0);
    expect(activeChapterIndex(chapters, 29.9)).toBe(0);
    expect(activeChapterIndex(chapters, 30)).toBe(1);
    expect(activeChapterIndex(chapters, 400)).toBe(1);
  });

  it('handles empty input safely', () => {
    expect(activeChapterIndex([], 5)).toBe(-1);
    expect(activeChapterIndex(chapters, Number.NaN)).toBe(-1);
  });
});

describe('chapterSpans', () => {
  it('ends each chapter at the next start', () => {
    expect(chapterSpans(chapters, 60)).toEqual([
      { start: 0, title: 'Arriving at the house', end: 30 },
      { start: 30, title: 'Checking for injuries', end: 60 },
    ]);
  });

  it('leaves the last end null when the duration is unknown', () => {
    expect(chapterSpans(chapters)[1].end).toBeNull();
    expect(chapterSpans(chapters, 0)[1].end).toBeNull();
  });
});

describe('parseTimestamp', () => {
  it('parses the accepted shapes', () => {
    expect(parseTimestamp('1:32')).toBe(92);
    expect(parseTimestamp('01:32')).toBe(92);
    expect(parseTimestamp('92')).toBe(92);
    expect(parseTimestamp('1:02:03')).toBe(3723);
    expect(parseTimestamp(' 0:00 ')).toBe(0);
  });

  it('rejects nonsense', () => {
    expect(parseTimestamp('')).toBeNull();
    expect(parseTimestamp('abc')).toBeNull();
    expect(parseTimestamp('1:99')).toBeNull();
    expect(parseTimestamp('-5')).toBeNull();
    expect(parseTimestamp('1:2:3:4')).toBeNull();
    expect(parseTimestamp('1.5')).toBeNull();
  });
});

describe('segmentsInChapter', () => {
  it('returns only the segments inside the chapter', () => {
    expect(segmentsInChapter(segments, chapters, 0).map((s) => s.start)).toEqual([0, 8, 16]);
    expect(segmentsInChapter(segments, chapters, 1).map((s) => s.start)).toEqual([30, 38, 46]);
  });

  it('returns everything for an out-of-range index', () => {
    expect(segmentsInChapter(segments, chapters, -1)).toHaveLength(segments.length);
    expect(segmentsInChapter(segments, chapters, 9)).toHaveLength(segments.length);
  });

  it('handles missing segments', () => {
    expect(segmentsInChapter(null, chapters, 0)).toEqual([]);
  });
});

describe('searchTranscript', () => {
  it('finds matches and tags them with their chapter', () => {
    const matches = searchTranscript(segments, chapters, 'injur');
    expect(matches).toHaveLength(1);
    expect(matches[0].chapterTitle).toBe('Checking for injuries');
    expect(matches[0].index).toBe(3);
  });

  it('is case-insensitive and spans chapters', () => {
    const matches = searchTranscript(segments, chapters, 'THE');
    expect(matches.length).toBeGreaterThan(1);
    expect(new Set(matches.map((m) => m.chapterIndex))).toEqual(new Set([0, 1]));
  });

  it('returns nothing for an empty query', () => {
    expect(searchTranscript(segments, chapters, '   ')).toEqual([]);
  });

  it('tags matches before the first chapter as -1', () => {
    const matches = searchTranscript(segments, [{ start: 30, title: 'Later' }], 'knock');
    expect(matches[0].chapterIndex).toBe(-1);
    expect(matches[0].chapterTitle).toBeNull();
  });
});

describe('searchSummary', () => {
  it('counts matches and sections', () => {
    const matches = searchTranscript(segments, chapters, 'the');
    expect(searchSummary(matches, true)).toMatch(/matches in \d sections?/);
    expect(searchSummary(matches, false)).toBe(`${matches.length} matches`);
  });

  it('uses the singular for one match', () => {
    const matches = searchTranscript(segments, chapters, 'injur');
    expect(searchSummary(matches, true)).toBe('1 match in 1 section');
  });

  it('reports no matches', () => {
    expect(searchSummary([], true)).toBe('No matches found');
  });
});

describe('chapterHeading', () => {
  it('formats a heading for copy and download', () => {
    expect(chapterHeading({ start: 92, title: 'Checking for injuries' })).toBe(
      '1:32 — Checking for injuries'
    );
  });
});
