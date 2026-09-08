/**
 * Lesson translation (Part L) — pure helpers.
 *
 * `translatablePaths` in blocks/types.ts is the single source of truth for what
 * gets translated. Everything here works from a concrete path map — the same
 * path templates with array indices filled in, e.g. `options[1].label` — so a
 * translation lands back on exactly the string it came from. Nothing here reads
 * or writes ids, indices, grading or analytics: merging is render-time only and
 * never mutates the stored payload.
 */

export interface TranslationLanguage {
  /** BCP-47-ish short code stored in the database. */
  code: string;
  /** Name in the language itself, for the learner toggle. */
  label: string;
  /** SpeechSynthesis voice hint for read-aloud. */
  voice: string;
  /** English name, for staff-facing copy. */
  english: string;
}

/** v1 ships Romanian only; adding a language is a constant change here. */
export const TRANSLATION_LANGUAGES: readonly TranslationLanguage[] = [
  { code: 'ro', label: 'Română', voice: 'ro-RO', english: 'Romanian' },
];

export function languageByCode(code: string | null | undefined): TranslationLanguage | null {
  if (!code) return null;
  return TRANSLATION_LANGUAGES.find((l) => l.code === code) ?? null;
}

/* ------------------------------ path plumbing ------------------------------ */

type Rec = Record<string, unknown>;

/** `a.b[].c` -> ['a','b','[]','c'] */
function splitPath(path: string): string[] {
  return path
    .split('.')
    .flatMap((part) => (part.endsWith('[]') ? [part.slice(0, -2), '[]'] : [part]));
}

/**
 * Expands one path template against a payload into concrete `path -> string`
 * entries. Array hops become `[i]`. Missing branches and non-string leaves are
 * skipped, so a payload that never had the field simply contributes nothing.
 */
function expand(value: unknown, segments: string[], prefix: string, out: Record<string, string>) {
  if (value == null) return;
  if (!segments.length) {
    if (typeof value === 'string' && value.trim()) out[prefix] = value;
    return;
  }
  const [head, ...rest] = segments;
  if (head === '[]') {
    if (!Array.isArray(value)) return;
    value.forEach((entry, i) => expand(entry, rest, `${prefix}[${i}]`, out));
    return;
  }
  if (typeof value !== 'object' || Array.isArray(value)) return;
  const next = (value as Rec)[head];
  expand(next, rest, prefix ? `${prefix}.${head}` : head, out);
}

/** Concrete `path -> English text` map for one block. */
export function extractTranslatableTexts(
  payload: unknown,
  paths: readonly string[]
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const template of paths) expand(payload, splitPath(template), '', out);
  return out;
}

/** `options[1].label` -> ['options', 1, 'label'] */
function parseConcrete(path: string): (string | number)[] {
  const parts: (string | number)[] = [];
  for (const chunk of path.split('.')) {
    const match = chunk.match(/^([^[]*)((\[\d+\])*)$/);
    if (!match) return [];
    if (match[1]) parts.push(match[1]);
    for (const idx of match[2].match(/\d+/g) ?? []) parts.push(Number(idx));
  }
  return parts;
}

/**
 * Renders a payload with translated strings overlaid. Structure-preserving and
 * conservative:
 *  - a path that no longer exists is ignored (content edited since translating),
 *  - a non-string value is NEVER overwritten,
 *  - a blank or non-string override is ignored,
 *  - the input payload is never mutated (shallow-copied along the touched path).
 */
export function mergeTranslation<T>(
  payload: T,
  overrides: Record<string, unknown> | null | undefined,
  paths: readonly string[]
): T {
  if (!payload || typeof payload !== 'object' || !overrides) return payload;
  const allowed = new Set(Object.keys(extractTranslatableTexts(payload, paths)));
  let out: unknown = payload;
  let touched = false;

  for (const [path, raw] of Object.entries(overrides)) {
    if (!allowed.has(path)) continue;
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const segments = parseConcrete(path);
    if (!segments.length) continue;
    if (!touched) {
      out = clone(payload);
      touched = true;
    }
    setAt(out, segments, raw);
  }
  return (touched ? out : payload) as T;
}

function clone(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(clone);
  if (value && typeof value === 'object') {
    const out: Rec = {};
    for (const [k, v] of Object.entries(value as Rec)) out[k] = clone(v);
    return out;
  }
  return value;
}

function setAt(target: unknown, segments: (string | number)[], value: string) {
  let node: unknown = target;
  for (let i = 0; i < segments.length - 1; i += 1) {
    if (node == null || typeof node !== 'object') return;
    node = (node as Rec)[segments[i] as string];
  }
  if (node == null || typeof node !== 'object') return;
  const last = segments[segments.length - 1];
  if (typeof (node as Rec)[last as string] !== 'string') return;
  (node as Rec)[last as string] = value;
}

/* -------------------------------- freshness -------------------------------- */

/**
 * Canonical form of a block's English translatable text. Whitespace-insensitive
 * so a reflow or trailing space never marks a good translation stale, but any
 * real wording change does.
 */
export function sourceHashInput(texts: Record<string, string>): string {
  return Object.keys(texts)
    .sort()
    .map((key) => `${key}=${texts[key].replace(/\s+/g, ' ').trim()}`)
    .join('\n');
}

const encoder = new TextEncoder();

/** sha256 hex of the canonical English text. */
export async function sourceHash(texts: Record<string, string>): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', encoder.encode(sourceHashInput(texts)));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/* ------------------------------ available langs ---------------------------- */

export interface TranslationRow {
  lang: string;
  block_id: string;
  status: string;
  source_hash: string;
  overrides: Record<string, unknown>;
}

/**
 * Mirror of the database trigger, for the editor header: a language is complete
 * only when EVERY block in the lesson has a reviewed translation.
 */
export function deriveAvailableLangs(
  blockIds: readonly string[],
  rows: readonly Pick<TranslationRow, 'lang' | 'block_id' | 'status'>[]
): string[] {
  if (!blockIds.length) return [];
  const wanted = new Set(blockIds);
  const byLang = new Map<string, Set<string>>();
  for (const row of rows) {
    if (row.status !== 'reviewed' || !wanted.has(row.block_id)) continue;
    if (!byLang.has(row.lang)) byLang.set(row.lang, new Set());
    byLang.get(row.lang)!.add(row.block_id);
  }
  return [...byLang.entries()]
    .filter(([, ids]) => ids.size === wanted.size)
    .map(([lang]) => lang)
    .sort();
}

/* -------------------------------- batching --------------------------------- */

/**
 * Splits translatable entries into AI batches by source-text size. A batch stops
 * growing when the next entry would push it past `budget` characters or when it
 * already holds `maxCount` entries; an entry bigger than the budget travels
 * alone. Order is preserved.
 */
export function batchTranslatable<T extends { texts: Record<string, string> }>(
  entries: readonly T[],
  budget: number,
  maxCount: number
): T[][] {
  const size = (entry: T) => Object.values(entry.texts).reduce((sum, t) => sum + t.length, 0);
  const batches: T[][] = [];
  let current: T[] = [];
  let total = 0;
  for (const entry of entries) {
    const cost = size(entry);
    if (current.length && (current.length >= maxCount || total + cost > budget)) {
      batches.push(current);
      current = [];
      total = 0;
    }
    current.push(entry);
    total += cost;
  }
  if (current.length) batches.push(current);
  return batches;
}

/* ------------------------------ learner choice ----------------------------- */

/** Where the learner's chosen lesson language is remembered on this device. */
export const LANG_STORAGE_KEY = 'learner_lesson_lang';

/** The learner's chosen language code, or null for English. */
export function storedLang(): string | null {
  if (typeof window === 'undefined') return null;
  const value = window.localStorage.getItem(LANG_STORAGE_KEY);
  return value && languageByCode(value) ? value : null;
}

export function setStoredLang(code: string | null) {
  if (typeof window === 'undefined') return;
  if (code) window.localStorage.setItem(LANG_STORAGE_KEY, code);
  else window.localStorage.removeItem(LANG_STORAGE_KEY);
}

/** Voice tag for read-aloud: the chosen language, else British English. */
export function speechLangTag(): string {
  return languageByCode(storedLang())?.voice ?? 'en-GB';
}
