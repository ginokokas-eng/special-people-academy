/**
 * Block-based lesson content.
 *
 * Blocks live in the `lesson_blocks` table (one row per block, stable id) and
 * render inside a lesson of `lesson_type = 'blocks'`. Payload shapes are a
 * discriminated union keyed on `block_type`.
 */

export const BLOCK_TYPES = ['text', 'callout', 'card_deck', 'image'] as const;
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

export type BlockPayload = TextPayload | CalloutPayload | CardDeckPayload | ImagePayload;

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
  image: 'Image',
};

export const BLOCK_DESCRIPTIONS: Record<BlockType, string> = {
  text: 'Headed paragraphs and bullet lists.',
  callout: 'A highlighted note — info, safety, warning or good practice.',
  card_deck: 'Tap-to-reveal cards. Learners must open every card.',
  image: 'A picture with alt text and an optional caption.',
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
    case 'image':
      return { url: '', alt: '', caption: '' } satisfies ImagePayload;
  }
}

/** Blocks that need a learner interaction before the lesson can be completed. */
export function isInteractive(type: BlockType): boolean {
  return type === 'card_deck';
}

/** Simple text parser shared by text blocks (same convention as reading lessons). */
export type TextChunk =
  | { kind: 'paragraph'; text: string }
  | { kind: 'list'; items: string[] };

export function parseBlockText(text: string): TextChunk[] {
  const chunks: TextChunk[] = [];
  const parts = (text || '').replace(/\r\n/g, '\n').split(/\n\s*\n/);
  for (const raw of parts) {
    const lines = raw.split('\n').map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;
    const bullets = lines.filter((l) => /^[•\-*]\s+/.test(l));
    if (bullets.length === lines.length) {
      chunks.push({ kind: 'list', items: lines.map((l) => l.replace(/^[•\-*]\s+/, '')) });
    } else {
      chunks.push({ kind: 'paragraph', text: lines.join(' ') });
    }
  }
  return chunks;
}
