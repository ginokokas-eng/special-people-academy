/**
 * Shared helpers for lesson-media uploads (video + image pickers).
 *
 * Some browsers (notably Windows, and some .mov/.mp4 sources) report an EMPTY
 * `file.type`, which makes the storage request arrive without a usable content
 * type and get rejected by the bucket's MIME allowlist. The extension is always
 * validated against the allowlist before upload, so mapping ext -> MIME is total.
 */

const EXT_MIME: Record<string, string> = {
  mp4: 'video/mp4',
  mov: 'video/quicktime',
  webm: 'video/webm',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
};

export function resolveContentType(file: File, ext: string): string | undefined {
  const reported = (file.type || '').toLowerCase();
  if (reported && reported !== 'application/octet-stream') return reported;
  return EXT_MIME[ext.toLowerCase()];
}

/** Turns a storage error into wording that reflects what actually went wrong. */
export function describeUploadError(err: unknown): string {
  const raw = err as { message?: string; error?: string; statusCode?: string | number; status?: number } | null;
  const message = `${raw?.message ?? ''} ${raw?.error ?? ''}`.toLowerCase();
  const status = Number(raw?.statusCode ?? raw?.status ?? 0);

  if (message.includes('mime') || message.includes('content type') || message.includes('not allowed')) {
    return 'That file type isn’t allowed by storage.';
  }
  if (status === 413 || message.includes('too large') || message.includes('exceeded the maximum') || message.includes('size limit')) {
    return 'That file is over the storage size limit.';
  }
  if (status === 401 || status === 403 || message.includes('jwt') || message.includes('unauthorized') || message.includes('invalid token')) {
    return 'Your session has expired — sign in again.';
  }
  return 'Upload failed. Please check your connection and try again.';
}
