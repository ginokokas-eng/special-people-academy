import type {
  AccordionPayload,
  BlockPayload,
  BlockType,
  CardDeckPayload,
  CarouselPayload,
  ChecklistPayload,
  DragMatchPayload,
  FlipCardsPayload,
  HotGraphicPayload,
  McqPayload,
  ScenarioPayload,
  VideoPayload,
} from '@/components/course-learn/blocks/types';

/**
 * Copying a block to another lesson (or duplicating it) must never share ids
 * with the original: option ids, card ids, scenario node ids and slugs are all
 * referenced from elsewhere in the same payload, so every one is re-minted and
 * every internal reference re-pointed at the new id.
 *
 * Conditional visibility is dropped: it points at a block in the SOURCE lesson,
 * which does not exist in the target.
 */
export type NewId = () => string;

const defaultNewId: NewId = () => crypto.randomUUID();

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/**
 * A fresh, unique, still-readable slug for a copied node. Slugs are author-facing
 * keys, so the copy keeps the original wording with a `-copy` marker rather than
 * a random string — and never reuses the source slug.
 */
function slugFor(base: string, used: Set<string>): string {
  const root = `${(base || 'step').trim() || 'step'}-copy`;
  let candidate = root;
  let n = 2;
  while (used.has(candidate)) candidate = `${root}-${n++}`;
  used.add(candidate);
  return candidate;
}

/**
 * Returns a deep copy of `payload` with every id freshly minted.
 * `newId` is injectable so tests can assert re-minting deterministically.
 */
export function remintBlockPayload(
  type: BlockType,
  payload: BlockPayload,
  newId: NewId = defaultNewId
): BlockPayload {
  const next = clone(payload) as unknown as Record<string, unknown>;
  delete next.visibility;

  switch (type) {
    case 'card_deck':
    case 'flip_cards': {
      const p = next as unknown as CardDeckPayload | FlipCardsPayload;
      p.cards = (p.cards ?? []).map((card) => ({ ...card, id: newId() }));
      break;
    }
    case 'accordion': {
      const p = next as unknown as AccordionPayload;
      p.items = (p.items ?? []).map((item) => ({ ...item, id: newId() }));
      break;
    }
    case 'carousel': {
      const p = next as unknown as CarouselPayload;
      p.items = (p.items ?? []).map((item) => ({ ...item, id: newId() }));
      break;
    }
    case 'hot_graphic': {
      const p = next as unknown as HotGraphicPayload;
      p.hotspots = (p.hotspots ?? []).map((spot) => ({ ...spot, id: newId() }));
      break;
    }
    case 'checklist': {
      const p = next as unknown as ChecklistPayload;
      p.steps = (p.steps ?? []).map((step) => ({ ...step, id: newId() }));
      break;
    }
    case 'mcq': {
      const p = next as unknown as McqPayload;
      const map = new Map<string, string>();
      p.options = (p.options ?? []).map((option) => {
        const id = newId();
        map.set(option.id, id);
        return { ...option, id };
      });
      p.correct_id = map.get(p.correct_id) ?? p.options[0]?.id ?? p.correct_id;
      break;
    }
    case 'drag_match': {
      const p = next as unknown as DragMatchPayload;
      const targets = new Map<string, string>();
      p.targets = (p.targets ?? []).map((target) => {
        const id = newId();
        targets.set(target.id, id);
        return { ...target, id };
      });
      p.items = (p.items ?? []).map((item) => ({
        ...item,
        id: newId(),
        target_id: targets.get(item.target_id) ?? item.target_id,
      }));
      break;
    }
    case 'video': {
      const p = next as unknown as VideoPayload;
      p.checkpoints = (p.checkpoints ?? []).map((cp) => {
        const map = new Map<string, string>();
        const options = (cp.options ?? []).map((option) => {
          const id = newId();
          map.set(option.id, id);
          return { ...option, id };
        });
        return {
          ...cp,
          id: newId(),
          options,
          correct_id: map.get(cp.correct_id) ?? options[0]?.id ?? cp.correct_id,
        };
      });
      break;
    }
    case 'scenario': {
      const p = next as unknown as ScenarioPayload;
      const nodeIds = new Map<string, string>();
      for (const node of p.nodes ?? []) nodeIds.set(node.id, newId());
      const usedSlugs = new Set<string>();
      p.nodes = (p.nodes ?? []).map((node) => ({
        ...node,
        id: nodeIds.get(node.id) as string,
        slug: slugFor(node.slug, usedSlugs),
        next_id: node.next_id ? (nodeIds.get(node.next_id) ?? node.next_id) : node.next_id,
        choices: node.choices?.map((choice) => ({
          ...choice,
          id: newId(),
          next_id: nodeIds.get(choice.next_id) ?? choice.next_id,
        })),
      }));
      p.start_id = nodeIds.get(p.start_id) ?? p.nodes[0]?.id ?? p.start_id;
      break;
    }
    default:
      break;
  }

  return next as unknown as BlockPayload;
}

/** Every id-ish string inside a payload — used by the tests and by nothing else. */
export function collectPayloadIds(payload: BlockPayload): string[] {
  const found: string[] = [];
  const walk = (value: unknown) => {
    if (Array.isArray(value)) return value.forEach(walk);
    if (value && typeof value === 'object') {
      for (const [key, entry] of Object.entries(value as Record<string, unknown>)) {
        if (typeof entry === 'string' && /(^|_)(id|slug)$|_id$/.test(key)) found.push(entry);
        else walk(entry);
      }
    }
  };
  walk(payload);
  return found;
}
