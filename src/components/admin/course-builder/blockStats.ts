/**
 * Lesson Insights — item analysis for block lessons.
 *
 * Pure types, labels and formatters shared by the admin Insights tab and the
 * organisation portal Insights tab. All numbers come from the security-definer
 * RPCs (`lesson_block_item_stats`, `get_org_lesson_block_stats`,
 * `get_lesson_block_learner_detail`) — nothing is derived from raw response
 * rows in the client, and no timing metric exists anywhere.
 */

import type { BlockPayload, BlockType } from '@/components/course-learn/blocks/types';
import { BLOCK_LABELS } from '@/components/course-learn/blocks/types';

/** Block types that produce answers worth analysing. */
export const INSIGHT_BLOCK_TYPES = ['mcq', 'drag_match', 'video', 'hot_graphic'] as const;
export type InsightBlockType = (typeof INSIGHT_BLOCK_TYPES)[number];

export interface BlockItemStat {
  block_id: string;
  block_type: InsightBlockType | BlockType;
  position: number;
  learners: number;
  completed: number;
  correct: number;
  correct_without_retry: number;
  avg_attempts: number;
  /** mcq: {option_id: count}. video: {checkpoint_id: {attempts_sum, correct}}. */
  option_counts: Record<string, number | { attempts_sum?: number; correct?: number }>;
  /** drag_match only: wrong placements. */
  confusion: { item_id: string; target_id: string; count: number }[];
}

export interface LearnerDetailRow {
  user_id: string;
  full_name: string | null;
  email: string | null;
  block_id: string;
  block_type: string;
  state: string;
  is_correct: boolean | null;
  attempt_count: number;
  updated_at: string;
}

export function blockLabel(type: string): string {
  return BLOCK_LABELS[type as BlockType] ?? type;
}

/** The authored question/prompt for a block, used as the card heading. */
export function blockPrompt(type: string, payload: BlockPayload | null | undefined): string {
  if (!payload) return blockLabel(type);
  const p = payload as unknown as Record<string, unknown>;
  const text =
    (typeof p.question === 'string' && p.question) ||
    (typeof p.prompt === 'string' && p.prompt) ||
    (typeof p.title === 'string' && p.title) ||
    (typeof p.heading === 'string' && p.heading) ||
    '';
  return text.trim() || blockLabel(type);
}

/* --------------------------------- numbers -------------------------------- */

/** Share of picks for one option, as a whole percentage. 0 when nobody answered. */
export function optionSharePct(count: number, total: number): number {
  if (!total || total <= 0 || !count || count <= 0) return 0;
  return Math.round((count / total) * 100);
}

/** Average attempts to one decimal place. Empty string when there is no data. */
export function formatAvgAttempts(value: number | null | undefined): string {
  if (value == null || !Number.isFinite(value) || value <= 0) return '—';
  return (Math.round(value * 10) / 10).toFixed(1);
}

/** Percentage of learners, rounded. */
export function pctOf(part: number, whole: number): number {
  return optionSharePct(part, whole);
}

export interface OptionTally {
  id: string;
  label: string;
  count: number;
  correct: boolean;
}

/** Numeric pick counts for an MCQ block (ignores the video checkpoint shape). */
export function mcqCounts(stat: BlockItemStat): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of Object.entries(stat.option_counts ?? {})) {
    if (typeof value === 'number') out[key] = value;
  }
  return out;
}

/** Options with their pick counts, highest first. */
export function optionTallies(
  options: { id: string; label: string }[],
  counts: Record<string, number>,
  correctId: string | undefined,
): OptionTally[] {
  return options
    .map((o) => ({
      id: o.id,
      label: o.label || 'Option',
      count: counts[o.id] ?? 0,
      correct: o.id === correctId,
    }))
    .sort((a, b) => b.count - a.count);
}

/**
 * The most-picked WRONG option. Null when no wrong option was ever picked.
 * Ties resolve to the first option in the given order.
 */
export function topDistractor(tallies: OptionTally[]): OptionTally | null {
  let best: OptionTally | null = null;
  for (const t of tallies) {
    if (t.correct || t.count <= 0) continue;
    if (!best || t.count > best.count) best = t;
  }
  return best;
}

/** Total picks recorded for a block (current answer plus retained history). */
export function totalPicks(counts: Record<string, number>): number {
  return Object.values(counts).reduce((sum, n) => sum + (n || 0), 0);
}

/* --------------------------------- labels --------------------------------- */

export function stateLabel(state: string): string {
  return state === 'complete' ? 'Complete' : 'In progress';
}

export function correctLabel(value: boolean | null): string {
  if (value === true) return 'Correct';
  if (value === false) return 'Not yet';
  return '—';
}

export function fmtWhen(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function learnerName(row: LearnerDetailRow): string {
  return row.full_name?.trim() || row.email || 'Learner';
}
