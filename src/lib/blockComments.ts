/**
 * Reviewer comments on lesson blocks.
 *
 * Comments are keyed on the block's STABLE client id (the `lesson_blocks` row is
 * rewritten on every save, so its row id is not a safe key). These helpers are
 * pure so the editor UI and the tests share one rule.
 */
export interface BlockComment {
  id: string;
  lesson_id: string;
  block_client_id: string;
  author: string;
  body: string;
  created_at: string;
  resolved_at: string | null;
  resolved_by: string | null;
}

export function isOpen(comment: Pick<BlockComment, 'resolved_at'>): boolean {
  return !comment.resolved_at;
}

/** Open-comment count per block client id. Resolved comments are not counted. */
export function openCountByBlock(
  comments: readonly Pick<BlockComment, 'block_client_id' | 'resolved_at'>[]
): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const comment of comments) {
    if (!isOpen(comment)) continue;
    counts[comment.block_client_id] = (counts[comment.block_client_id] ?? 0) + 1;
  }
  return counts;
}

/** Total open comments in a lesson. */
export function openCount(
  comments: readonly Pick<BlockComment, 'resolved_at'>[]
): number {
  return comments.filter(isOpen).length;
}

/** Comments whose block no longer exists — cleaned up when the lesson is saved. */
export function orphanCommentIds(
  comments: readonly Pick<BlockComment, 'id' | 'block_client_id'>[],
  liveBlockClientIds: readonly string[]
): string[] {
  const live = new Set(liveBlockClientIds);
  return comments.filter((c) => !live.has(c.block_client_id)).map((c) => c.id);
}

/** Newest last, so a thread reads top to bottom. */
export function sortThread<T extends Pick<BlockComment, 'created_at'>>(comments: readonly T[]): T[] {
  return [...comments].sort((a, b) => a.created_at.localeCompare(b.created_at));
}
