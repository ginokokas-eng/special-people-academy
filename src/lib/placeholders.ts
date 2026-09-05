/**
 * Placeholder detection for settings-driven content.
 *
 * Branding defaults ship with unfinished values such as
 * "https://linkedin.com/company/YOUR_HANDLE" or "[Support Email]". Anything
 * that still looks like a placeholder is treated as absent so the site never
 * shows square brackets or links to a dead page.
 */
export function isPlaceholder(value?: string | null): boolean {
  const v = (value ?? '').trim();
  if (!v) return true;
  if (v.includes('YOUR_')) return true;
  if (v.startsWith('[')) return true;
  return false;
}

/** Convenience inverse: a value worth rendering. */
export function hasRealValue(value?: string | null): boolean {
  return !isPlaceholder(value);
}
