// Shared helpers for the B2B organisation invitation flow.
//
// Token rules (do not weaken):
//  - the raw token is 32 random bytes, base64url-encoded, and is NEVER stored
//    and NEVER logged. Only its SHA-256 hex digest lands in
//    organisation_invitations.token_hash.
//  - invitations live for 14 days and are single-use.

export const INVITE_TTL_DAYS = 14;

/** Emails are compared and stored lowercased/trimmed. */
export function normaliseEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length < 5 || !email.includes('@') || /\s/.test(email)) return null;
  // Deliberately permissive but structural: local@domain.tld
  return /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/.test(email) ? email : null;
}

/** Splits a bulk paste (newlines, commas, semicolons) into unique emails + rejects. */
export function parseEmailList(raw: string): { emails: string[]; invalid: string[] } {
  const parts = raw
    .split(/[\n,;]+/)
    .map((p) => p.trim())
    .filter(Boolean);

  const emails: string[] = [];
  const invalid: string[] = [];
  for (const part of parts) {
    const email = normaliseEmail(part);
    if (!email) {
      invalid.push(part.slice(0, 120));
    } else if (!emails.includes(email)) {
      emails.push(email);
    }
  }
  return { emails, invalid };
}

function base64url(bytes: Uint8Array): string {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/** 32 cryptographically random bytes, base64url encoded (43 chars). */
export function createRawToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return base64url(bytes);
}

/** SHA-256 hex digest — the only form of the token that is persisted. */
export async function hashToken(rawToken: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(rawToken));
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/** Raw tokens are 43-char base64url strings; anything else is rejected early. */
export function looksLikeToken(value: unknown): value is string {
  return typeof value === 'string' && /^[A-Za-z0-9_-]{32,128}$/.test(value);
}

export const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isUuid(value: unknown): value is string {
  return typeof value === 'string' && UUID_RE.test(value);
}
