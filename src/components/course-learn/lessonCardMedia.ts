import type {
  CarouselPayload,
  HotGraphicPayload,
  ImagePayload,
  MediaRef,
} from './blocks/types';

/** Minimal block row shape needed to derive a card image. */
export interface CardMediaBlockRow {
  lesson_id: string;
  block_type: string;
  order_index?: number | null;
  payload: unknown;
}

function normalise(ref?: MediaRef | null): MediaRef | null {
  if (!ref) return null;
  if (ref.source === 'storage' && ref.path?.trim()) return ref;
  if (ref.url?.trim()) return { source: 'url', url: ref.url.trim() };
  return null;
}

function fromBlock(row: CardMediaBlockRow): MediaRef | null {
  const payload = (row.payload ?? {}) as Record<string, unknown>;
  if (row.block_type === 'image') {
    const p = payload as unknown as ImagePayload;
    return normalise(p.media) || (p.url?.trim() ? { source: 'url', url: p.url.trim() } : null);
  }
  if (row.block_type === 'hot_graphic') {
    return normalise((payload as unknown as HotGraphicPayload).image);
  }
  if (row.block_type === 'carousel') {
    const items = (payload as unknown as CarouselPayload).items || [];
    for (const item of items) {
      const ref = normalise(item.media);
      if (ref) return ref;
    }
  }
  return null;
}

/** Block types we can derive a still image from, in priority order. */
const PRIORITY = ['image', 'hot_graphic', 'carousel'] as const;

/**
 * Derives one card image per lesson from its authored blocks, in the priority
 * order image → hot graphic → carousel slide. Video blocks are skipped (no
 * frame grabbing). Pure and cheap — call inside a memo over a single query.
 */
export function deriveLessonCardMedia(rows: CardMediaBlockRow[]): Map<string, MediaRef> {
  const byLesson = new Map<string, CardMediaBlockRow[]>();
  for (const row of rows) {
    const list = byLesson.get(row.lesson_id);
    if (list) list.push(row);
    else byLesson.set(row.lesson_id, [row]);
  }

  const out = new Map<string, MediaRef>();
  byLesson.forEach((list, lessonId) => {
    const ordered = [...list].sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
    for (const type of PRIORITY) {
      const hit = ordered.filter((r) => r.block_type === type).map(fromBlock).find(Boolean);
      if (hit) {
        out.set(lessonId, hit);
        return;
      }
    }
  });
  return out;
}
