/**
 * Fallback cover art for courses without a thumbnail.
 *
 * Catalogue cards used to print the art-direction brief itself
 * ("[ ILLUSTRATION … ]") whenever `thumbnail_url` was empty, which shipped to
 * learners on almost every card. Instead we render the same treatment My
 * Courses uses: a category-tinted gradient behind a course icon. All colours
 * are semantic tokens so the tint themes correctly.
 */

const TINTS = [
  'bg-gradient-to-br from-primary/20 to-accent/20',
  'bg-gradient-to-br from-accent/20 to-primary/15',
  'bg-gradient-to-br from-secondary/40 to-primary/15',
  'bg-gradient-to-br from-primary/15 to-secondary/40',
  'bg-gradient-to-br from-accent/25 to-secondary/30',
] as const;

/** Stable tint for a category name, so a category always looks the same. */
export function categoryTintClass(category?: string | null): string {
  const key = (category ?? '').trim().toLowerCase();
  if (!key) return TINTS[0];
  let sum = 0;
  for (let i = 0; i < key.length; i += 1) sum += key.charCodeAt(i);
  return TINTS[sum % TINTS.length];
}
