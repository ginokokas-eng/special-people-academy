/**
 * AI authoring drafts → real lesson blocks.
 *
 * The edge function returns id-FREE drafts on purpose. Every id (option ids,
 * card ids, accordion item ids, scenario node/choice ids and slugs) is minted
 * HERE, in the browser, so nothing a model produced can end up as a database
 * identifier. Pure functions only, so the mapping is unit-testable.
 */
import {
  validateScenario,
  type AccordionPayload,
  type BlockPayload,
  type BlockType,
  type CalloutPayload,
  type CalloutVariant,
  type FlipCardsPayload,
  type McqPayload,
  type ScenarioNode,
  type ScenarioPayload,
  type TextPayload,
  type VideoCheckpoint,
} from '@/components/course-learn/blocks/types';

export type DraftBlockType = 'text' | 'callout' | 'flip_cards' | 'accordion' | 'mcq' | 'scenario';

export interface DraftScenarioChoice {
  label: string;
  next_slug: string;
  quality: 'best' | 'acceptable' | 'unsafe';
  feedback?: string;
}

export interface DraftScenarioNode {
  slug: string;
  kind: 'decision' | 'end';
  title?: string;
  body: string;
  choices?: DraftScenarioChoice[];
}

export interface DraftScenario {
  start_slug: string;
  debrief?: string;
  nodes: DraftScenarioNode[];
}

/** A single draft block exactly as the edge function returns it. */
export interface DraftBlock {
  block_type: DraftBlockType;
  heading?: string;
  text?: string;
  variant?: string;
  cards?: { front: string; back: string }[];
  items?: { title: string; body: string }[];
  question?: string;
  options?: { label: string }[];
  correct_index?: number;
  explanation?: string;
  scenario?: DraftScenario;
}

export interface DraftCheckpoint {
  at_s: number;
  question: string;
  options: { label: string }[];
  correct_index: number;
  explanation?: string;
}

/** Id source, injectable so tests get deterministic output. */
export type IdFactory = () => string;

const defaultIds: IdFactory = () => crypto.randomUUID();

const clean = (value?: string) => (typeof value === 'string' ? value.trim() : '');

/** Slugify an author-facing scenario key; ids themselves are always UUIDs. */
export function slugify(value: string, fallback: string): string {
  const slug = clean(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return slug || fallback;
}

/**
 * Maps one AI draft to a real block payload, minting every id locally.
 * Unknown block types are rejected by the caller, never silently coerced.
 */
export function draftToBlock(
  draft: DraftBlock,
  newId: IdFactory = defaultIds
): { block_type: BlockType; payload: BlockPayload } {
  switch (draft.block_type) {
    case 'text':
      return {
        block_type: 'text',
        payload: { heading: clean(draft.heading), text: clean(draft.text) } satisfies TextPayload,
      };
    case 'callout': {
      const allowed: CalloutVariant[] = ['info', 'safety', 'warning', 'success'];
      const variant = allowed.includes(draft.variant as CalloutVariant)
        ? (draft.variant as CalloutVariant)
        : 'info';
      return {
        block_type: 'callout',
        payload: {
          variant,
          title: clean(draft.heading),
          text: clean(draft.text),
        } satisfies CalloutPayload,
      };
    }
    case 'flip_cards':
      return {
        block_type: 'flip_cards',
        payload: {
          heading: clean(draft.heading),
          instruction: 'Tap a card to flip it over.',
          cards: (draft.cards ?? []).map((c) => ({
            id: newId(),
            front: clean(c.front),
            back: clean(c.back),
          })),
        } satisfies FlipCardsPayload,
      };
    case 'accordion':
      return {
        block_type: 'accordion',
        payload: {
          heading: clean(draft.heading),
          items: (draft.items ?? []).map((i) => ({
            id: newId(),
            title: clean(i.title),
            body: clean(i.body),
          })),
        } satisfies AccordionPayload,
      };
    case 'mcq': {
      const options = (draft.options ?? []).map((o) => ({ id: newId(), label: clean(o.label) }));
      const index = Number.isInteger(draft.correct_index) ? (draft.correct_index as number) : 0;
      const correct = options[index] ?? options[0];
      return {
        block_type: 'mcq',
        payload: {
          question: clean(draft.question),
          options,
          correct_id: correct?.id ?? '',
          explanation: clean(draft.explanation),
        } satisfies McqPayload,
      };
    }
    case 'scenario': {
      const draftNodes = draft.scenario?.nodes ?? [];
      // Slug → freshly minted node id, so choices can be re-pointed.
      const idBySlug = new Map<string, string>();
      const usedSlugs = new Set<string>();
      const slugByOriginal = new Map<string, string>();
      draftNodes.forEach((n, i) => {
        let slug = slugify(n.slug || n.title || '', `step-${i + 1}`);
        while (usedSlugs.has(slug)) slug = `${slug}-${i + 1}`;
        usedSlugs.add(slug);
        slugByOriginal.set(n.slug, slug);
        idBySlug.set(n.slug, newId());
      });
      const nodes: ScenarioNode[] = draftNodes.map((n, i) => ({
        id: idBySlug.get(n.slug) as string,
        slug: slugByOriginal.get(n.slug) ?? `step-${i + 1}`,
        kind: n.kind === 'decision' ? 'decision' : 'end',
        title: clean(n.title),
        body: clean(n.body),
        ...(n.kind === 'decision'
          ? {
              choices: (n.choices ?? []).map((c) => ({
                id: newId(),
                label: clean(c.label),
                next_id: idBySlug.get(c.next_slug) ?? '',
                quality: c.quality === 'best' || c.quality === 'unsafe' ? c.quality : 'acceptable',
                feedback: clean(c.feedback),
              })),
            }
          : {}),
      }));
      return {
        block_type: 'scenario',
        payload: {
          version: 1,
          start_id: idBySlug.get(draft.scenario?.start_slug ?? '') ?? nodes[0]?.id ?? '',
          require_best_path: false,
          debrief: clean(draft.scenario?.debrief),
          nodes,
        } satisfies ScenarioPayload,
      };
    }
  }
}

/** Maps a suggested checkpoint to a real one, minting option ids locally. */
export function draftToCheckpoint(
  draft: DraftCheckpoint,
  newId: IdFactory = defaultIds
): VideoCheckpoint {
  const options = (draft.options ?? []).map((o) => ({ id: newId(), label: clean(o.label) }));
  const index = Number.isInteger(draft.correct_index) ? draft.correct_index : 0;
  return {
    id: newId(),
    at_s: Math.max(0, Math.round(Number(draft.at_s) || 0)),
    question: clean(draft.question),
    options,
    correct_id: (options[index] ?? options[0])?.id ?? '',
    explanation: clean(draft.explanation),
  };
}

/**
 * Author-facing problems with a mapped draft. A draft with issues is shown with
 * the reason and cannot be accepted until the author edits it.
 */
export function draftBlockIssues(block: {
  block_type: BlockType;
  payload: BlockPayload;
}): string[] {
  const issues: string[] = [];
  const p = block.payload as unknown as Record<string, unknown>;
  if (block.block_type === 'text' && !clean(p.text as string)) issues.push('This draft has no text.');
  if (block.block_type === 'callout' && !clean(p.text as string))
    issues.push('This callout has no text.');
  if (block.block_type === 'flip_cards') {
    const cards = (p.cards as { front: string; back: string }[]) ?? [];
    if (cards.length < 2) issues.push('Flip cards need at least two cards.');
    if (cards.some((c) => !clean(c.front) || !clean(c.back)))
      issues.push('Every card needs a front and a back.');
  }
  if (block.block_type === 'accordion') {
    const items = (p.items as { title: string; body: string }[]) ?? [];
    if (items.length < 2) issues.push('An accordion needs at least two sections.');
    if (items.some((i) => !clean(i.title) || !clean(i.body)))
      issues.push('Every section needs a title and body.');
  }
  if (block.block_type === 'mcq') {
    const mcq = block.payload as McqPayload;
    if (!clean(mcq.question)) issues.push('This question is empty.');
    if ((mcq.options ?? []).length < 2) issues.push('A knowledge check needs two or more options.');
    if ((mcq.options ?? []).some((o) => !clean(o.label))) issues.push('Every option needs a label.');
    if (!mcq.options?.some((o) => o.id === mcq.correct_id))
      issues.push('No correct answer is marked.');
  }
  if (block.block_type === 'scenario') {
    for (const issue of validateScenario(block.payload as ScenarioPayload)) issues.push(issue.message);
  }
  return issues;
}

/** Maps a whole AI reply, keeping order and attaching any issues found. */
export interface MappedDraft {
  block_type: BlockType;
  payload: BlockPayload;
  issues: string[];
}

export function mapDraftBlocks(drafts: DraftBlock[], newId: IdFactory = defaultIds): MappedDraft[] {
  return drafts.map((draft) => {
    const mapped = draftToBlock(draft, newId);
    return { ...mapped, issues: draftBlockIssues(mapped) };
  });
}
