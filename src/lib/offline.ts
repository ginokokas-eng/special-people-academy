import { Filesystem, Directory } from '@capacitor/filesystem';
import { Network } from '@capacitor/network';
import { Capacitor } from '@capacitor/core';
import { supabase } from '@/integrations/supabase/client';
import { isNativeShell } from '@/lib/native';
import { haptics } from '@/hooks/useHaptics';

/**
 * Offline lesson media.
 *
 * Granularity is the LESSON, so a part-downloaded course is still useful and
 * the Learn tab can honestly say "4 of 7 lessons". Everything is keyed on the
 * storage path the media already lives at, and the bytes land in the app's own
 * data directory — never anywhere the gallery would index them.
 *
 * The manifest is the single source of truth for "is this cached", the storage
 * total, and eviction. It lives in localStorage because it is small, synchronous
 * to read during render, and survives the app being killed.
 */

export type DownloadState = 'idle' | 'queued' | 'downloading' | 'ready' | 'error';

export interface OfflineEntry {
  lessonId: string;
  courseId: string;
  /** Storage path inside the private lesson-media bucket. */
  path: string;
  /** Filesystem path the bytes were written to. */
  file: string;
  bytes: number;
  savedAt: number;
}

const MANIFEST_KEY = 'spa.offline.manifest';
const WIFI_ONLY_KEY = 'spa.offline.wifi-only';
const DIR = Directory.Data;
const FOLDER = 'offline-lessons';

type Manifest = Record<string, OfflineEntry>;

const readManifest = (): Manifest => {
  try {
    return JSON.parse(localStorage.getItem(MANIFEST_KEY) ?? '{}') as Manifest;
  } catch {
    return {};
  }
};

const writeManifest = (m: Manifest) => {
  localStorage.setItem(MANIFEST_KEY, JSON.stringify(m));
  listeners.forEach((l) => l());
};

const listeners = new Set<() => void>();
/** Subscribe to manifest changes (react-friendly). */
export const subscribeOffline = (fn: () => void) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

export const isWifiOnly = () => localStorage.getItem(WIFI_ONLY_KEY) !== 'off';
export const setWifiOnly = (on: boolean) =>
  localStorage.setItem(WIFI_ONLY_KEY, on ? 'on' : 'off');

/** Downloads are only possible inside the shell — the browser has no store. */
export const offlineSupported = () => isNativeShell() && Capacitor.isPluginAvailable('Filesystem');

export const getEntry = (lessonId: string): OfflineEntry | null => readManifest()[lessonId] ?? null;
export const isReady = (lessonId: string) => !!readManifest()[lessonId];
export const entries = (): OfflineEntry[] => Object.values(readManifest());

/** Total cached bytes. Shown on Learn's "Ready offline" header and in Profile. */
export const storageUsed = () => entries().reduce((a, e) => a + e.bytes, 0);

export const readyCountForCourse = (courseId: string) =>
  entries().filter((e) => e.courseId === courseId).length;

export function formatBytes(bytes: number): string {
  if (bytes <= 0) return '0 MB';
  const mb = bytes / (1024 * 1024);
  if (mb < 1) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  if (mb < 1024) return `${mb < 10 ? mb.toFixed(1) : Math.round(mb)} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

/** True when downloading now would spend the learner's mobile data. */
export async function wouldUseMobileData(): Promise<boolean> {
  if (!offlineSupported()) return false;
  try {
    const status = await Network.getStatus();
    return status.connected && status.connectionType !== 'wifi';
  } catch {
    return false;
  }
}

const fileNameFor = (path: string) => `${FOLDER}/${path.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

/**
 * Fetch the media once and keep it. Returns the manifest entry, or throws with
 * a message worth showing — callers surface it on the row, never in a modal.
 */
export async function downloadLesson(opts: {
  lessonId: string;
  courseId: string;
  path: string;
  onProgress?: (percent: number) => void;
}): Promise<OfflineEntry> {
  const { lessonId, courseId, path, onProgress } = opts;
  if (!offlineSupported()) throw new Error('Downloads need the app.');

  const existing = getEntry(lessonId);
  if (existing) return existing;

  const { data, error } = await supabase.functions.invoke('lesson-media-url', { body: { path } });
  if (error) throw new Error('Could not get a link for this lesson.');
  const url = (data as { url?: string } | null)?.url;
  if (!url) throw new Error('This lesson has no media to download.');

  const res = await fetch(url);
  if (!res.ok) throw new Error('The download failed. Try again on a better connection.');

  // Stream so a long download can report progress rather than sitting silent.
  const total = Number(res.headers.get('content-length') ?? 0);
  const reader = res.body?.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  if (reader) {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
        if (total && onProgress) onProgress(Math.min(99, Math.round((received / total) * 100)));
      }
    }
  } else {
    const buf = new Uint8Array(await res.arrayBuffer());
    chunks.push(buf);
    received = buf.byteLength;
  }

  const blob = new Blob(chunks as BlobPart[]);
  const base64 = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onerror = () => reject(new Error('Could not save this lesson.'));
    fr.onload = () => resolve(String(fr.result).split(',')[1] ?? '');
    fr.readAsDataURL(blob);
  });

  const file = fileNameFor(path);
  await Filesystem.mkdir({ path: FOLDER, directory: DIR, recursive: true }).catch(() => undefined);
  await Filesystem.writeFile({ path: file, data: base64, directory: DIR, recursive: true });

  const entry: OfflineEntry = { lessonId, courseId, path, file, bytes: received, savedAt: Date.now() };
  const m = readManifest();
  m[lessonId] = entry;
  writeManifest(m);
  onProgress?.(100);
  // The phone is usually back in a pocket by now — which is the point.
  haptics.success();
  return entry;
}

/** A local src the player can use with no signal. */
export async function localSrc(lessonId: string): Promise<string | null> {
  const entry = getEntry(lessonId);
  if (!entry) return null;
  try {
    const { uri } = await Filesystem.getUri({ path: entry.file, directory: DIR });
    return Capacitor.convertFileSrc(uri);
  } catch {
    return null;
  }
}

export async function removeLesson(lessonId: string): Promise<void> {
  const entry = getEntry(lessonId);
  if (!entry) return;
  await Filesystem.deleteFile({ path: entry.file, directory: DIR }).catch(() => undefined);
  const m = readManifest();
  delete m[lessonId];
  writeManifest(m);
}

export async function removeAll(): Promise<void> {
  for (const e of entries()) {
    await Filesystem.deleteFile({ path: e.file, directory: DIR }).catch(() => undefined);
  }
  writeManifest({});
}

/**
 * Evict media for courses the learner has finished and will not revisit soon:
 * a certificate exists and its renewal is more than 90 days out. Safe to call
 * on launch — it only ever removes what it can prove is spare.
 */
export async function evictSettledCourses(userId: string): Promise<number> {
  if (!offlineSupported()) return 0;
  const cached = entries();
  if (!cached.length) return 0;

  const { data } = await supabase
    .from('certificates')
    .select('course_id, expires_at')
    .eq('user_id', userId);

  const horizon = Date.now() + 90 * 86_400_000;
  const settled = new Set(
    (data ?? [])
      .filter((c) => !c.expires_at || new Date(c.expires_at as string).getTime() > horizon)
      .map((c) => c.course_id as string),
  );

  let freed = 0;
  for (const e of cached) {
    if (settled.has(e.courseId)) {
      await removeLesson(e.lessonId);
      freed += 1;
    }
  }
  return freed;
}
