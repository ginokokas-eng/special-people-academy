/**
 * Content history helpers (Leg 3, Part H).
 *
 * Two jobs, both deliberately pure so they can be unit-tested:
 *
 * 1. Deciding the DEFAULT state of the "This changes what learners must know"
 *    checkbox on save. A material change is one that touches something learners
 *    are assessed or gated on — never a wording or picture tweak.
 * 2. Deriving the "updated since you completed" flag from a completed version
 *    number against the lesson's current version.
 *
 * The database is the source of truth for whether a change was material: the
 * author's checkbox is passed to `set_content_change_context` before saving and
 * the history trigger reads it.
 */

import type { BlockPayload, BlockType } from '@/components/course-learn/blocks/types';

/** Block types that are always material — learners are assessed/gated on them. */
export const MATERIAL_BLOCK_TYPES: readonly BlockType[] = [
  'mcq',
  'drag_match',
  'hot_graphic',
  'scenario',
  'reflection',
];

export interface MaterialBlockLike {
  client_id: string;
  block_type: BlockType;
  payload: BlockPayload | Record<string, unknown>;
  contributes_to_completion?: boolean;
}

/**
 * True when this single block is material: an assessed/interactive type, a
 * video carrying checkpoint questions, or a checklist in assessed mode.
 */
export function isMaterialBlock(block: MaterialBlockLike): boolean {
  if (MATERIAL_BLOCK_TYPES.includes(block.block_type)) return true;
  const payload = (block.payload ?? {}) as Record<string, unknown>;
  if (block.block_type === 'video') {
    const checkpoints = payload.checkpoints;
    return Array.isArray(checkpoints) && checkpoints.length > 0;
  }
  if (block.block_type === 'checklist') {
    return payload.mode === 'assessed';
  }
  return false;
}

const sameContent = (a: MaterialBlockLike, b: MaterialBlockLike) =>
  a.block_type === b.block_type &&
  a.contributes_to_completion === b.contributes_to_completion &&
  JSON.stringify(a.payload ?? {}) === JSON.stringify(b.payload ?? {});

/**
 * Default for the material checkbox: ON when any material block was added,
 * removed or edited in this save; OFF for text/callout/image-only edits.
 */
export function materialChangeDefault(
  before: MaterialBlockLike[],
  after: MaterialBlockLike[]
): boolean {
  const beforeById = new Map(before.map((b) => [b.client_id, b]));
  const afterById = new Map(after.map((b) => [b.client_id, b]));

  for (const block of after) {
    const previous = beforeById.get(block.client_id);
    if (!previous) {
      if (isMaterialBlock(block)) return true; // added
      continue;
    }
    if (!sameContent(previous, block) && (isMaterialBlock(block) || isMaterialBlock(previous))) {
      return true; // edited
    }
  }

  for (const block of before) {
    if (!afterById.has(block.client_id) && isMaterialBlock(block)) return true; // removed
  }

  return false;
}

/* --------------------------- changed-since-completion --------------------------- */

export interface ChangedSinceCompletionRow {
  course_id: string;
  course_title?: string | null;
  lesson_id: string;
  lesson_title?: string | null;
  completed_version: number | null;
  current_version: number | null;
  require_recompletion: boolean | null;
}

/** A completed lesson is flagged when its content moved on since completion. */
export function isChangedSinceCompletion(row: {
  completed_version: number | null;
  current_version: number | null;
}): boolean {
  if (row.completed_version == null || row.current_version == null) return false;
  return row.completed_version < row.current_version;
}

/** Lesson ids that must be re-completed (course setting on + flagged). */
export function lessonsNeedingRecompletion(rows: ChangedSinceCompletionRow[]): Set<string> {
  return new Set(
    rows
      .filter((r) => isChangedSinceCompletion(r) && !!r.require_recompletion)
      .map((r) => r.lesson_id)
  );
}

/** Course ids with at least one flagged lesson (informational pill). */
export function coursesWithUpdates(rows: ChangedSinceCompletionRow[]): Set<string> {
  return new Set(rows.filter(isChangedSinceCompletion).map((r) => r.course_id));
}

/* ------------------------------ diff presentation ------------------------------ */

const IGNORED_DIFF_KEYS = new Set(['updated_at', 'created_at', 'content_version']);

export interface FieldDiff {
  key: string;
  before: unknown;
  after: unknown;
}

/** Key-level diff for the History timeline (never a raw JSON dump). */
export function diffFields(
  before: Record<string, unknown> | null | undefined,
  after: Record<string, unknown> | null | undefined
): FieldDiff[] {
  const keys = new Set([...Object.keys(before ?? {}), ...Object.keys(after ?? {})]);
  const diffs: FieldDiff[] = [];
  for (const key of keys) {
    if (IGNORED_DIFF_KEYS.has(key)) continue;
    const b = before?.[key];
    const a = after?.[key];
    if (JSON.stringify(b ?? null) === JSON.stringify(a ?? null)) continue;
    diffs.push({ key, before: b, after: a });
  }
  return diffs.sort((x, y) => x.key.localeCompare(y.key));
}

/** Short human value for a diff cell. */
export function formatDiffValue(value: unknown): string {
  if (value === null || value === undefined) return '—';
  if (typeof value === 'string') return value.length > 160 ? `${value.slice(0, 160)}…` : value;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return String(value);
  const json = JSON.stringify(value);
  return json.length > 160 ? `${json.slice(0, 160)}…` : json;
}
