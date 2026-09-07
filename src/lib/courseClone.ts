/**
 * Pure helpers for course duplication (the RPC does the real work).
 *
 * Kept free of React and Supabase so both the dialog and vitest can use them.
 */

/**
 * Default title offered in the Duplicate dialog.
 *
 * The end-to-end cleanup RPC (`e2e_delete_course`) refuses any course whose
 * title does not start with "E2E ", so a copy of a test course must keep that
 * prefix in front — "Copy of E2E …" would be undeletable.
 */
export function cloneDefaultTitle(sourceTitle: string): string {
  const title = (sourceTitle ?? '').trim();
  if (!title) return 'Copy of untitled course';
  if (title.startsWith('E2E ')) return `E2E Copy of ${title}`;
  return `Copy of ${title}`;
}

/** Minimal shape of the conditional-visibility rule inside a block payload. */
export interface VisibilityPayload {
  visibility?: { block_id?: string } & Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Re-points a block's conditional visibility at the copied block.
 *
 * A rule that names a block which was not copied is dropped rather than left
 * dangling — a dangling reference would hide the block from every learner.
 */
export function remapVisibility<T extends VisibilityPayload>(
  payload: T,
  idMap: Record<string, string>,
): T {
  const rule = payload?.visibility;
  const oldId = rule?.block_id;
  if (!rule || !oldId) return payload;

  const newId = idMap[oldId];
  if (!newId) {
    const { visibility: _dropped, ...rest } = payload;
    return rest as T;
  }
  return { ...payload, visibility: { ...rule, block_id: newId } };
}
