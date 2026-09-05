/**
 * One initials derivation for the whole app.
 *
 * The learner shell used `email.slice(0, 2)` while the profile page used the
 * saved full name, so the same person saw two different avatars on the same
 * screen. Prefer the name, fall back to the email.
 */
export function initialsFor(fullName?: string | null, email?: string | null): string {
  const name = (fullName ?? '').trim();
  if (name) {
    const parts = name.split(/\s+/).filter(Boolean);
    const letters = (parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0]])
      .map((p) => p[0])
      .join('');
    if (letters) return letters.toUpperCase().slice(0, 2);
  }
  const mail = (email ?? '').trim();
  if (mail) return mail.slice(0, 2).toUpperCase();
  return 'U';
}
