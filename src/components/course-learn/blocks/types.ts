/**
 * Block-based lesson content.
 *
 * Blocks live in the `lesson_blocks` table (one row per block, stable id) and
 * render inside a lesson of `lesson_type = 'blocks'`. Payload shapes are a
 * discriminated union keyed on `block_type`.
 */

export const BLOCK_TYPES = [
  'text',
  'callout',
  'card_deck',
  'flip_cards',
  'accordion',
  'image',
  'video',
  'mcq',
  'drag_match',
  'checklist',
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

export interface TextPayload {
  heading?: string;
  /** Plain text. Blank lines separate paragraphs; lines starting with -/•/* become bullets. */
  text: string;
}

export type CalloutVariant = 'info' | 'safety' | 'warning' | 'success';

export interface CalloutPayload {
  variant: CalloutVariant;
  title?: string;
  text: string;
}

export interface DeckCard {
  id: string;
  front: string;
  back: string;
}

export interface CardDeckPayload {
  heading?: string;
  instruction?: string;
  cards: DeckCard[];
}

export interface ImagePayload {
  url: string;
  /** Required for accessibility — described to screen readers. */
  alt: string;
  caption?: string;
}

export interface AccordionItemPayload {
  id: string;
  title: string;
  /** Same plain-text conventions as a text block (blank line = paragraph, "-" = bullet). */
  body: string;
}

export interface AccordionPayload {
  heading?: string;
  items: AccordionItemPayload[];
}

/**
 * Video block. Media is stored BY REFERENCE only — never inlined.
 * `storage` sources hold a `lesson-media` object path and are played through a
 * short-lived signed URL; `url` sources hold an external/direct link.
 */
export interface VideoPayload {
  source: 'storage' | 'url';
  /** Object path in the private `lesson-media` bucket: {course_id}/{lesson_id}/{uuid}.{ext} */
  path?: string;
  /** External URL (YouTube / Vimeo / direct file). */
  url?: string;
  title?: string;
  caption?: string;
  /** Original file name, shown to authors so they can recognise the upload. */
  file_name?: string;
}

export type BlockPayload =
  | TextPayload
  | CalloutPayload
  | CardDeckPayload
  | AccordionPayload
  | ImagePayload
  | VideoPayload;

export interface LessonBlock {
  id: string;
  lesson_id: string;
  order_index: number;
  block_type: BlockType;
  payload: BlockPayload;
  is_graded: boolean;
  contributes_to_completion: boolean;
}

/** A block draft in the admin editor (may not exist in the database yet). */
export interface BlockDraft {
  /** Existing row id, or null for a new block. */
  id: string | null;
  block_type: BlockType;
  payload: BlockPayload;
  contributes_to_completion: boolean;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  text: 'Text',
  callout: 'Callout',
  card_deck: 'Card deck',
  accordion: 'Accordion',
  image: 'Image',
  video: 'Video',
};

export const BLOCK_DESCRIPTIONS: Record<BlockType, string> = {
  text: 'Headed paragraphs and bullet lists.',
  callout: 'A highlighted note — info, safety, warning or good practice.',
  card_deck: 'Tap-to-reveal cards. Learners must open every card.',
  accordion: 'Collapsible sections learners open one at a time.',
  image: 'A picture with alt text and an optional caption.',
  video: 'Upload a video file, or paste a YouTube, Vimeo or direct link.',
};

export function defaultPayload(type: BlockType): BlockPayload {
  switch (type) {
    case 'text':
      return { heading: '', text: '' } satisfies TextPayload;
    case 'callout':
      return { variant: 'info', title: '', text: '' } satisfies CalloutPayload;
    case 'card_deck':
      return {
        heading: '',
        instruction: 'Tap each card to reveal the answer.',
        cards: [{ id: crypto.randomUUID(), front: '', back: '' }],
      } satisfies CardDeckPayload;
    case 'accordion':
      return {
        heading: '',
        items: [{ id: crypto.randomUUID(), title: '', body: '' }],
      } satisfies AccordionPayload;
    case 'image':
      return { url: '', alt: '', caption: '' } satisfies ImagePayload;
    case 'video':
      return { source: 'storage', path: '', url: '', title: '', caption: '' } satisfies VideoPayload;
  }
}

/** Blocks that need a learner interaction before the lesson can be completed. */
export function isInteractive(type: BlockType): boolean {
  return type === 'card_deck' || type === 'accordion' || type === 'video';
}

/**
 * Whether the completion switch starts ON for a newly added block.
 * Card decks default ON (P1 behaviour); video and accordion default OFF.
 */
export function defaultContributesToCompletion(type: BlockType): boolean {
  return type === 'card_deck';
}

/** Upload limits for video blocks — surfaced verbatim in the editor UI. */
export const VIDEO_MAX_MB = 200;
export const VIDEO_ACCEPT = 'video/mp4,video/webm,video/quicktime';
export const VIDEO_ALLOWED_EXT = ['mp4', 'webm', 'mov'] as const;

/** Recognise embed-only sources: no `onEnded` signal is available for these. */
export function videoEmbedUrl(url: string): string | null {
  const raw = (url || '').trim();
  if (!raw) return null;
  const yt = raw.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([A-Za-z0-9_-]{6,})/
  );
  if (yt) return `https://www.youtube.com/embed/${yt[1]}`;
  const vimeo = raw.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  return null;
}

/** Simple text parser shared by text blocks (same convention as reading lessons). */
export type TextChunk =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

const BULLET_RE = /^[•\-*]\s+/;

export function parseBlockText(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  const parts = (text || '').replace(/\r\n/g, '\n').split(/\n\s*\n/);

  for (const raw of parts) {
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    // Line-level parsing INSIDE a chunk: consecutive dash lines become a list,
    // surrounding non-dash lines stay paragraphs. So an intro line followed by
    // dash lines renders as a paragraph + bullet list, matching the editor hint.
    let paragraph: string[] = [];
    let items: string[] = [];

    const flushParagraph = () => {
      if (paragraph.length) chunks.push({ kind: 'paragraph', text: paragraph.join(' ') });
      paragraph = [];
    };
    const flushList = () => {
      if (items.length) chunks.push({ kind: 'list', items });
      items = [];
    };

    for (const line of lines) {
      if (BULLET_RE.test(line)) {
        flushParagraph();
        items.push(line.replace(BULLET_RE, ''));
      } else {
        flushList();
        paragraph.push(line);
      }
    }
    flushParagraph();
    flushList();
  }

  return chunks;
}
