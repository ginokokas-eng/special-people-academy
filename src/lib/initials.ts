/**
 * One initials derivation for the whole app.
 *
 * Sources are tried in the same order everywhere so a person never sees two
 * different avatars on one screen:
 *   1. the saved profile name (`profiles.full_name`, what /profile shows)
 *   2. the sign-up name held on the auth account (`user_metadata.full_name`)
 *   3. the email address
 */
function lettersFrom(value?: string | null): string | null {
  const name = (value ?? '').trim();
  if (!name) return null;
  const parts = name.split(/\s+/).filter(Boolean);
  const letters = (parts.length > 1 ? [parts[0], parts[parts.length - 1]] : [parts[0]])
    .map((p) => p[0])
    .join('');
  return letters ? letters.toUpperCase().slice(0, 2) : null;
}

export function initialsFor(
  profileFullName?: string | null,
  metadataFullName?: string | null,
  email?: string | null
): string {
  return (
    lettersFrom(profileFullName) ??
    lettersFrom(metadataFullName) ??
    ((email ?? '').trim() ? (email as string).trim().slice(0, 2).toUpperCase() : 'U')
  );
}
