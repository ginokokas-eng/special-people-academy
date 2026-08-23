import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { MediaRef } from '@/components/course-learn/blocks/types';

/**
 * Signed URLs for private `lesson-media` objects, shared by every image surface
 * (image block, carousel slides, hot graphic).
 *
 * The cache is module-level and keyed by OBJECT PATH, so ten hotspot images in
 * one lesson mint at most one signed URL each and a re-render never re-signs.
 * Server TTL is 60 minutes; we treat an entry as stale at 50 so a long-open
 * lesson refreshes before the URL dies, and `onError` invalidates once more.
 */
const STALE_AFTER_MS = 50 * 60 * 1000;

interface CacheEntry {
  url: string;
  signedAt: number;
}

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<string | null>>();

function cachedUrl(path: string): string | null {
  const hit = cache.get(path);
  if (!hit) return null;
  if (Date.now() - hit.signedAt > STALE_AFTER_MS) {
    cache.delete(path);
    return null;
  }
  return hit.url;
}

async function signPath(path: string): Promise<string | null> {
  const existing = inflight.get(path);
  if (existing) return existing;

  const promise = (async () => {
    try {
      const { data, error } = await supabase.functions.invoke('lesson-media-url', {
        body: { path },
      });
      if (error) throw error;
      const url = (data as { url?: string } | null)?.url;
      if (!url) throw new Error('No URL returned');
      cache.set(path, { url, signedAt: Date.now() });
      return url;
    } catch (err) {
      console.error('Could not get a media link:', err);
      return null;
    } finally {
      inflight.delete(path);
    }
  })();

  inflight.set(path, promise);
  return promise;
}

export interface SignedMedia {
  /** Ready-to-use src, or null while loading / on failure. */
  url: string | null;
  loading: boolean;
  error: boolean;
  /** Drop the cached signature and sign again (wire to `<img onError>`). */
  refresh: () => void;
}

/** Resolves a MediaRef to a usable src. `url` refs resolve synchronously. */
export function useSignedMediaUrl(ref?: MediaRef | null): SignedMedia {
  const isStorage = ref?.source === 'storage' && !!ref.path;
  const path = isStorage ? (ref!.path as string) : null;
  const directUrl = !isStorage ? ref?.url?.trim() || null : null;

  const [url, setUrl] = useState<string | null>(() => (path ? cachedUrl(path) : directUrl));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    if (!path) {
      setUrl(directUrl);
      setError(false);
      setLoading(false);
      return;
    }
    const hit = cachedUrl(path);
    if (hit) {
      setUrl(hit);
      setError(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(false);
    void signPath(path).then((signed) => {
      if (cancelled) return;
      setUrl(signed);
      setError(!signed);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [path, directUrl, nonce]);

  const refresh = useCallback(() => {
    if (path) cache.delete(path);
    setNonce((n) => n + 1);
  }, [path]);

  return { url, loading, error, refresh };
}
