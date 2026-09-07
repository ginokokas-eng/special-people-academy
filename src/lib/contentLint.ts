/**
 * Readability and accessibility linting for block lessons.
 *
 * Pure functions only — no React, no network. Everything here is advisory:
 * publishing is never blocked by a lint result. Only the human-readable text
 * declared in `translatablePaths` is linted, so ids, urls, storage paths and
 * slugs can never be flagged.
 *
 * Flesch–Kincaid is deliberately reported as 'info': clinical vocabulary
 * ("nasogastric", "administration") inflates the grade even when the sentences
 * themselves are short and plain.
 */
import {
  translatablePaths,
  BLOCK_LABELS,
  type BlockPayload,
  type BlockType,
} from '@/components/course-learn/blocks/types';

export interface LintText {
  /** Concrete payload path, array hops resolved (e.g. `cards[1].front`). */
  path: string;
  text: string;
}

export interface LintBlockInput {
  block_type: BlockType;
  payload: BlockPayload;
}

export type LintCode =
  | 'long-sentence'
  | 'long-paragraph'
  | 'missing-alt'
  | 'heading-order'
  | 'vague-link'
  | 'all-caps'
  | 'reading-age'
  | 'duration-mismatch';

export interface LintIssue {
  code: LintCode;
  severity: 'warning' | 'info';
  /** -1 for lesson-level issues (reading age, duration). */
  blockIndex: number;
  blockType: BlockType | null;
  path: string | null;
  message: string;
  hint: string;
  sample?: string;
}

export interface LintStats {
  words: number;
  sentences: number;
  /** UK reading age estimate (Flesch–Kincaid grade + 5). 0 when no prose. */
  readingAge: number;
  longestSentence: number;
}

export interface LintResult {
  issues: LintIssue[];
  stats: LintStats;
}

export interface LintMeta {
  /** Authored lesson length, used only for the 2× duration sanity check. */
  durationMinutes?: number | null;
  durationSeconds?: number | null;
}

/**
 * House-style shouting that must never be flagged: safety imperatives and
 * sector acronyms care staff expect to see in capitals.
 */
export const LINT_CAPS_WHITELIST = [
  'STOP AND ESCALATE',
  'DO NOT',
  'NEVER',
  'ALWAYS',
  'CQC',
  'MAR',
  'PRN',
  'PEG',
  'NG',
  'DNACPR',
  'RIDDOR',
  'COSHH',
  'IDDSI',
  'BLS',
  'AED',
  'GDPR',
  'NHS',
  'SCORM',
  'E2E',
] as const;

const VAGUE_LINK_TEXTS = ['click here', 'here', 'read more', 'link'];

const LONG_SENTENCE_WORDS = 25;
const LONG_PARAGRAPH_WORDS = 120;
const WORDS_PER_MINUTE = 180;

/* -------------------------------------------------------------------------- */
/* extraction                                                                 */
/* -------------------------------------------------------------------------- */

function splitPath(path: string): string[] {
  return path
    .split('.')
    .flatMap((part) => (part.endsWith('[]') ? [part.slice(0, -2), '[]'] : [part]));
}

function walk(value: unknown, segments: string[], prefix: string, out: LintText[]): void {
  if (value == null) return;
  if (!segments.length) {
    if (typeof value === 'string' && value.trim()) out.push({ path: prefix, text: value.trim() });
    return;
  }
  const [head, ...rest] = segments;
  if (head === '[]') {
    if (!Array.isArray(value)) return;
    value.forEach((entry, index) => walk(entry, rest, `${prefix}[${index}]`, out));
    return;
  }
  if (typeof value !== 'object') return;
  const next = (value as Record<string, unknown>)[head];
  walk(next, rest, prefix ? `${prefix}.${head}` : head, out);
}

/** Every lintable string in a block, with its concrete path. */
export function extractLintTexts(block: LintBlockInput): LintText[] {
  const out: LintText[] = [];
  for (const path of translatablePaths[block.block_type] ?? []) {
    walk(block.payload, splitPath(path), '', out);
  }
  // `criteria[]` and friends produce a bare index path; normalise the join.
  return out.map((entry) => ({ ...entry, path: entry.path.replace(/^\./, '') }));
}

/* -------------------------------------------------------------------------- */
/* text helpers                                                               */
/* -------------------------------------------------------------------------- */

/** Strips markdown decoration so word counts and Flesch see prose only. */
function plain(text: string): string {
  return text
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`>#]/g, ' ');
}

export function words(text: string): string[] {
  return plain(text)
    .split(/[\s]+/)
    .map((w) => w.replace(/^[^\p{L}\p{N}]+|[^\p{L}\p{N}]+$/gu, ''))
    .filter(Boolean);
}

/** Sentences split on . ! ? and line breaks; short bullet fragments dropped. */
export function sentences(text: string): string[] {
  return plain(text)
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .filter((s) => words(s).length >= 3);
}

function paragraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);
}

function syllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const trimmed = w
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '');
  const groups = trimmed.match(/[aeiouy]{1,2}/g);
  return Math.max(1, groups ? groups.length : 1);
}

/** Flesch–Kincaid grade level. 0 when there is nothing to measure. */
export function fleschKincaidGrade(text: string): number {
  const ws = words(text);
  const ss = sentences(text);
  if (!ws.length || !ss.length) return 0;
  const syl = ws.reduce((sum, w) => sum + syllables(w), 0);
  const grade = 0.39 * (ws.length / ss.length) + 11.8 * (syl / ws.length) - 15.59;
  return Math.max(0, Math.round(grade * 10) / 10);
}

/** UK reading age estimate from a grade level. */
export function readingAgeFromGrade(grade: number): number {
  return grade > 0 ? Math.round(grade + 5) : 0;
}

function truncate(text: string, max = 80): string {
  const clean = text.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

/* -------------------------------------------------------------------------- */
/* individual rules                                                           */
/* -------------------------------------------------------------------------- */

function capsRuns(text: string): string[] {
  const runs: string[] = [];
  for (const rawLine of text.split(/\n+/)) {
    const line = rawLine.trim();
    if (/^SCENARIO:/.test(line)) continue;
    let stripped = line;
    for (const phrase of LINT_CAPS_WHITELIST) {
      stripped = stripped.replace(new RegExp(`\\b${phrase}\\b`, 'g'), ' ');
    }
    const tokens = stripped.split(/[^A-Za-z'’-]+/);
    let run: string[] = [];
    const flush = () => {
      if (run.length >= 3) runs.push(run.join(' '));
      run = [];
    };
    for (const token of tokens) {
      const isCaps = token.length >= 2 && /^[A-Z][A-Z'’-]*$/.test(token);
      if (isCaps) run.push(token);
      else flush();
    }
    flush();
  }
  return runs;
}

function headingLevelJumps(markdown: string): { from: number; to: number; heading: string }[] {
  const jumps: { from: number; to: number; heading: string }[] = [];
  let previous = 0;
  for (const line of markdown.split(/\n/)) {
    const match = /^(#{1,6})\s+(.*)$/.exec(line.trim());
    if (!match) continue;
    const level = match[1].length;
    if (previous && level > previous + 1) jumps.push({ from: previous, to: level, heading: match[2] });
    previous = level;
  }
  return jumps;
}

function fileNameOf(pathOrUrl: string | null | undefined): string | null {
  if (!pathOrUrl) return null;
  const last = pathOrUrl.split(/[/\\?#]/).filter(Boolean).pop();
  return last ? last.toLowerCase() : null;
}

interface AltTarget {
  path: string;
  alt: string | null | undefined;
  source: string | null | undefined;
  what: string;
}

function altTargets(block: LintBlockInput): AltTarget[] {
  const payload = block.payload as unknown as Record<string, any>;
  if (block.block_type === 'image') {
    return [
      {
        path: 'alt',
        alt: payload.alt,
        source: payload.media?.file_name ?? payload.media?.path ?? payload.media?.url ?? payload.url,
        what: 'this image',
      },
    ];
  }
  if (block.block_type === 'hot_graphic') {
    return [
      {
        path: 'alt',
        alt: payload.alt,
        source: payload.image?.file_name ?? payload.image?.path ?? payload.image?.url,
        what: 'the labelled image',
      },
    ];
  }
  if (block.block_type === 'carousel') {
    const items = Array.isArray(payload.items) ? payload.items : [];
    return items
      .filter((item: any) => item?.media)
      .map((item: any, index: number) => ({
        path: `items[${index}].alt`,
        alt: item.alt,
        source: item.media?.file_name ?? item.media?.path ?? item.media?.url,
        what: `slide ${index + 1}`,
      }));
  }
  return [];
}

/* -------------------------------------------------------------------------- */
/* lessons                                                                    */
/* -------------------------------------------------------------------------- */

/** Lints one block; `index` is used only for reporting. */
export function lintBlock(block: LintBlockInput, index: number): LintIssue[] {
  const issues: LintIssue[] = [];
  const label = BLOCK_LABELS[block.block_type] ?? block.block_type;
  const texts = extractLintTexts(block);

  for (const { path, text } of texts) {
    for (const sentence of sentences(text)) {
      const count = words(sentence).length;
      if (count > LONG_SENTENCE_WORDS) {
        issues.push({
          code: 'long-sentence',
          severity: 'warning',
          blockIndex: index,
          blockType: block.block_type,
          path,
          message: `${label}: a ${count}-word sentence.`,
          hint: `Split this ${count}-word sentence — care staff read on phones between visits.`,
          sample: truncate(sentence),
        });
      }
    }

    for (const paragraph of paragraphs(text)) {
      const count = words(paragraph).length;
      if (count > LONG_PARAGRAPH_WORDS) {
        issues.push({
          code: 'long-paragraph',
          severity: 'warning',
          blockIndex: index,
          blockType: block.block_type,
          path,
          message: `${label}: a ${count}-word paragraph.`,
          hint: 'Break this into shorter paragraphs or a bulleted list.',
          sample: truncate(paragraph),
        });
      }
    }

    // Vague link text: markdown labels first, then a bare phrase in prose.
    const linkLabels = [...text.matchAll(/\[([^\]]*)\]\(([^)]*)\)/g)].map((m) => m[1].trim());
    for (const linkLabel of linkLabels) {
      if (VAGUE_LINK_TEXTS.includes(linkLabel.toLowerCase())) {
        issues.push({
          code: 'vague-link',
          severity: 'warning',
          blockIndex: index,
          blockType: block.block_type,
          path,
          message: `${label}: link says “${linkLabel}”.`,
          hint: 'Name the destination in the link, e.g. “the feeding pump checklist”.',
          sample: truncate(linkLabel),
        });
      }
    }
    if (!linkLabels.length && /click here/i.test(text)) {
      issues.push({
        code: 'vague-link',
        severity: 'warning',
        blockIndex: index,
        blockType: block.block_type,
        path,
        message: `${label}: “click here” tells a screen reader nothing.`,
        hint: 'Name the destination instead of “click here”.',
        sample: truncate(text),
      });
    }

    for (const run of capsRuns(text)) {
      issues.push({
        code: 'all-caps',
        severity: 'warning',
        blockIndex: index,
        blockType: block.block_type,
        path,
        message: `${label}: “${truncate(run, 40)}” is in capitals.`,
        hint: 'Use sentence case — capitals are harder to read and screen readers may spell them out.',
        sample: truncate(run, 40),
      });
    }
  }

  if (block.block_type === 'text') {
    const body = (block.payload as unknown as Record<string, any>).text ?? '';
    for (const jump of headingLevelJumps(String(body))) {
      issues.push({
        code: 'heading-order',
        severity: 'warning',
        blockIndex: index,
        blockType: block.block_type,
        path: 'text',
        message: `${label}: heading jumps from level ${jump.from} to level ${jump.to}.`,
        hint: 'Go down one heading level at a time so screen readers can follow the structure.',
        sample: truncate(jump.heading),
      });
    }
  }

  for (const target of altTargets(block)) {
    const alt = (target.alt ?? '').trim();
    const file = fileNameOf(target.source);
    const isFileName = !!file && alt.toLowerCase() === file;
    if (alt.length < 4 || isFileName) {
      issues.push({
        code: 'missing-alt',
        severity: 'warning',
        blockIndex: index,
        blockType: block.block_type,
        path: target.path,
        message: `${label}: ${target.what} has no useful description.`,
        hint: isFileName
          ? 'Describe what the picture shows rather than repeating the file name.'
          : 'Add a short description of what the picture shows, for learners using a screen reader.',
        sample: alt || undefined,
      });
    }
  }

  return issues;
}

/** Lints a whole lesson's blocks and returns issues plus readability stats. */
export function lintLesson(blocks: LintBlockInput[], meta: LintMeta = {}): LintResult {
  const issues: LintIssue[] = [];
  const allTexts: string[] = [];

  blocks.forEach((block, index) => {
    issues.push(...lintBlock(block, index));
    for (const { text } of extractLintTexts(block)) allTexts.push(text);
  });

  const combined = allTexts.join('\n\n');
  const wordList = words(combined);
  const sentenceList = sentences(combined);
  const longestSentence = sentenceList.reduce((max, s) => Math.max(max, words(s).length), 0);
  const grade = fleschKincaidGrade(combined);
  const readingAge = readingAgeFromGrade(grade);

  if (readingAge > 14) {
    issues.push({
      code: 'reading-age',
      severity: 'info',
      blockIndex: -1,
      blockType: null,
      path: null,
      message: `Reading age about ${readingAge} (advisory; clinical terms inflate this).`,
      hint: 'Shorter sentences and everyday words bring this down where the clinical terms allow.',
    });
  }

  const authoredMinutes =
    meta.durationSeconds != null && meta.durationSeconds > 0
      ? meta.durationSeconds / 60
      : meta.durationMinutes ?? 0;
  if (authoredMinutes > 0 && wordList.length > 0) {
    const estimated = wordList.length / WORDS_PER_MINUTE;
    const ratio = estimated / authoredMinutes;
    if (ratio > 2 || ratio < 0.5) {
      const estLabel = Math.max(1, Math.round(estimated));
      issues.push({
        code: 'duration-mismatch',
        severity: 'info',
        blockIndex: -1,
        blockType: null,
        path: null,
        message: `The wording reads in about ${estLabel} min but the lesson is set to ${Math.round(authoredMinutes)} min.`,
        hint: 'Either adjust the lesson length or check whether content is missing or duplicated.',
      });
    }
  }

  return {
    issues,
    stats: {
      words: wordList.length,
      sentences: sentenceList.length,
      readingAge,
      longestSentence,
    },
  };
}

/** Warning counts per block index, for chips in the editor's block list. */
export function lintByBlock(issues: LintIssue[]): Record<number, number> {
  const map: Record<number, number> = {};
  for (const issue of issues) {
    if (issue.blockIndex < 0) continue;
    map[issue.blockIndex] = (map[issue.blockIndex] ?? 0) + 1;
  }
  return map;
}
