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
  'carousel',
  'hot_graphic',
  'mcq',
  'drag_match',
  'checklist',
  'scenario',
  'reflection',
] as const;
export type BlockType = (typeof BLOCK_TYPES)[number];

/* ------------------------------- shared media ------------------------------ */

/**
 * A reference to a piece of media. Storage refs point at an object in the
 * PRIVATE `lesson-media` bucket and are played/shown through a short-lived
 * signed URL; url refs hold an external link. Never inline media data.
 */
export interface MediaRef {
  source: 'storage' | 'url';
  /** Object path in `lesson-media`: {course_id}/{lesson_id}/{uuid}.{ext} */
  path?: string;
  /** External/direct link (secondary to uploading). */
  url?: string;
  /** Original file name, so authors recognise their upload. */
  file_name?: string;
}

export const IMAGE_MAX_MB = 10;
export const IMAGE_ACCEPT = 'image/png,image/jpeg,image/webp';
export const IMAGE_ALLOWED_EXT = ['png', 'jpg', 'jpeg', 'webp'] as const;

/* ------------------------ conditional visibility --------------------------- */

/**
 * When a block is shown. Absence of `visibility` means "always" — every block
 * authored before adaptive remediation keeps behaving exactly as before.
 *
 * `block_id` points at an EARLIER interactive block in the same lesson:
 *  - if_complete  → that block's completion signal is satisfied
 *  - if_correct   → that block was answered correctly
 *  - if_incorrect → that block was answered, but not correctly
 */
export type VisibilityWhen = 'if_correct' | 'if_incorrect' | 'if_complete';

export interface BlockVisibility {
  when: VisibilityWhen;
  block_id: string;
}

/** Every payload may carry a visibility condition. */
export interface VisibilityAware {
  visibility?: BlockVisibility;
}

/* ------------------------------- half width -------------------------------- */

export type BlockLayout = 'full' | 'half';

/** Payloads that may opt into a half-width column. */
export interface LayoutAware extends VisibilityAware {
  layout?: BlockLayout;
}


/** Block types where the width toggle is offered. Everything else is full-only. */
export const HALF_ELIGIBLE_TYPES: readonly BlockType[] = [
  'text',
  'callout',
  'image',
  'flip_cards',
  'mcq',
  'carousel',
  'hot_graphic',
];

export function allowsHalfWidth(type: BlockType): boolean {
  return HALF_ELIGIBLE_TYPES.includes(type);
}

/** Effective authored layout — anything not eligible is always full. */
export function blockLayout(type: BlockType, payload?: BlockPayload): BlockLayout {
  if (!allowsHalfWidth(type)) return 'full';
  return (payload as LayoutAware | undefined)?.layout === 'half' ? 'half' : 'full';
}

export interface TextPayload extends LayoutAware {
  heading?: string;
  /** Plain text. Blank lines separate paragraphs; lines starting with -/•/* become bullets. */
  text: string;
}

export type CalloutVariant = 'info' | 'safety' | 'warning' | 'success';

export interface CalloutPayload extends LayoutAware {
  variant: CalloutVariant;
  title?: string;
  text: string;
}

export interface DeckCard {
  id: string;
  front: string;
  back: string;
}

export interface CardDeckPayload extends VisibilityAware {
  heading?: string;
  instruction?: string;
  cards: DeckCard[];
}

export interface ImagePayload extends LayoutAware {
  /** Legacy/pasted URL. Kept for every pre-Phase-6 image block. */
  url: string;
  /** Uploaded or pasted media reference. Wins over `url` when present. */
  media?: MediaRef;
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

export interface AccordionPayload extends VisibilityAware {
  heading?: string;
  items: AccordionItemPayload[];
}

/**
 * An in-video checkpoint question. The player pauses at `at_s`, the question
 * overlays inside the player container, and playback resumes once answered.
 * Formative only — never touches `quizzes` / `quiz_attempts`.
 */
export interface VideoCheckpoint {
  id: string;
  /** Cue time in seconds. */
  at_s: number;
  question: string;
  options: { id: string; label: string }[];
  correct_id: string;
  explanation?: string;
}

/**
 * Video block. Media is stored BY REFERENCE only — never inlined.
 * `storage` sources hold a `lesson-media` object path and are played through a
 * short-lived signed URL; `url` sources hold an external/direct link.
 */
export interface VideoPayload extends VisibilityAware {
  source: 'storage' | 'url';
  /** Object path in the private `lesson-media` bucket: {course_id}/{lesson_id}/{uuid}.{ext} */
  path?: string;
  /** External URL (YouTube / Vimeo / direct file). */
  url?: string;
  title?: string;
  caption?: string;
  /** Original file name, shown to authors so they can recognise the upload. */
  file_name?: string;
  /** Optional in-video checkpoint questions. Absent on every pre-Phase-5 block. */
  checkpoints?: VideoCheckpoint[];
  /** Stop learners scrubbing past an unanswered checkpoint. Defaults to true. */
  lock_seek?: boolean;
}


/* -------------------------- narrative carousel ---------------------------- */

export interface CarouselItem {
  id: string;
  title: string;
  text: string;
  /** Optional slide image. Fixed aspect box, so slides never jump height. */
  media?: MediaRef;
  /** Alt text for the slide image. */
  alt?: string;
}

/** Narrative carousel — one item at a time, prev/next, dots, swipe. */
export interface CarouselPayload extends LayoutAware {
  heading?: string;
  instruction?: string;
  items: CarouselItem[];
}

/* ------------------------------ hot graphic -------------------------------- */

export interface Hotspot {
  id: string;
  /** Position as a PERCENTAGE of the rendered image box (0–100). */
  x: number;
  y: number;
  title: string;
  text: string;
}

/** Labelled pins placed on an image; learners open each one. */
export interface HotGraphicPayload extends LayoutAware {
  heading?: string;
  instruction?: string;
  image?: MediaRef;
  /** Required — describes the image itself for screen readers. */
  alt?: string;
  hotspots: Hotspot[];
}

/** Multiple-choice knowledge check. Formative only — never touches quizzes. */
export interface McqOption {
  id: string;
  label: string;
  /** Optional per-answer feedback, used by bank-sourced questions. */
  feedback?: string;
}

export interface McqPayload extends LayoutAware {
  question: string;
  options: McqOption[];
  correct_id: string;
  explanation?: string;
  /** Provenance when this block was copied from the shared question bank. */
  bank_id?: string;
  bank_version?: number;
}



/** Drag-and-drop matching. Grading is a pure comparison of item.target_id. */
export interface DragMatchTarget {
  id: string;
  label: string;
}

export interface DragMatchItem {
  id: string;
  label: string;
  target_id: string;
}

export interface DragMatchPayload extends VisibilityAware {
  prompt: string;
  targets: DragMatchTarget[];
  items: DragMatchItem[];
  shuffle: boolean;
  feedback: { correct: string; incorrect: string };
}

/** Flip cards — same content shape as a card deck, flip-in-place presentation. */
export interface FlipCardsPayload extends LayoutAware {
  heading?: string;
  instruction?: string;
  cards: DeckCard[];
}


/** Read-only practical checklist. Learners cannot tick it; no sign-off link. */
export interface ChecklistStep {
  id: string;
  step_title: string;
  instruction?: string;
  safety_note?: string;
}

export interface ChecklistPayload extends VisibilityAware {
  heading?: string;
  caption?: string;
  steps: ChecklistStep[];
}

/* ----------------------------- branching scenario -------------------------- */

export type ScenarioQuality = 'best' | 'acceptable' | 'unsafe';

export interface ScenarioChoice {
  id: string;
  label: string;
  /** Node this choice leads to. */
  next_id: string;
  feedback?: string;
  quality: ScenarioQuality;
}

export interface ScenarioNode {
  id: string;
  /** Author-visible short key, unique within the scenario. */
  slug: string;
  kind: 'decision' | 'outcome' | 'end';
  title?: string;
  body: string;
  /** STORAGE PATH in the private `lesson-media` bucket — never a URL. */
  image_path?: string;
  /** Decision nodes only, two or more. */
  choices?: ScenarioChoice[];
  /** Outcome nodes only (required there, forbidden on end nodes). */
  next_id?: string;
}

export interface ScenarioPayload extends VisibilityAware {
  version: 1;
  start_id: string;
  /** When on, the block is assessed: a clean run (no unsafe choice) is correct. */
  require_best_path: boolean;
  debrief?: string;
  nodes: ScenarioNode[];
}

export type BlockPayload =
  | TextPayload
  | CalloutPayload
  | CardDeckPayload
  | AccordionPayload
  | ImagePayload
  | VideoPayload
  | CarouselPayload
  | HotGraphicPayload
  | McqPayload
  | DragMatchPayload
  | FlipCardsPayload
  | ChecklistPayload
  | ScenarioPayload;



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
  /**
   * Stable id for the draft, minted client-side and used as the row id when the
   * block is inserted. Conditional visibility can therefore point at a block
   * that has not been saved yet, and the reference survives the save.
   */
  client_id: string;
  block_type: BlockType;
  payload: BlockPayload;
  contributes_to_completion: boolean;
}

export const BLOCK_LABELS: Record<BlockType, string> = {
  text: 'Text',
  callout: 'Callout',
  card_deck: 'Card deck',
  flip_cards: 'Flip cards',
  accordion: 'Accordion',
  image: 'Image',
  video: 'Video',
  carousel: 'Story carousel',
  hot_graphic: 'Labelled image',
  mcq: 'Knowledge check',
  drag_match: 'Matching activity',
  checklist: 'Practical checklist',
  scenario: 'Scenario',
};

export const BLOCK_DESCRIPTIONS: Record<BlockType, string> = {
  text: 'Headed paragraphs and bullet lists.',
  callout: 'A highlighted note — info, safety, warning or good practice.',
  card_deck: 'Tap-to-reveal cards. Learners must open every card.',
  flip_cards: 'Cards that flip over in place to show the answer.',
  accordion: 'Collapsible sections learners open one at a time.',
  image: 'A picture with alt text and an optional caption.',
  video: 'Upload a video file, or paste a YouTube, Vimeo or direct link.',
  carousel: 'A step-by-step story learners click through, one slide at a time.',
  hot_graphic: 'An image with labelled points learners tap to explore.',
  mcq: 'A single multiple-choice question with instant feedback.',
  drag_match: 'Learners match items to the right group. Drag, tap or keyboard.',
  checklist: 'Read-only practical steps learners can study before assessment.',
  scenario: 'Branching decision story with consequences.',
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
    case 'flip_cards':
      return {
        heading: '',
        instruction: 'Tap a card to flip it over.',
        cards: [{ id: crypto.randomUUID(), front: '', back: '' }],
      } satisfies FlipCardsPayload;
    case 'accordion':
      return {
        heading: '',
        items: [{ id: crypto.randomUUID(), title: '', body: '' }],
      } satisfies AccordionPayload;
    case 'image':
      return { url: '', alt: '', caption: '' } satisfies ImagePayload;
    case 'video':
      return { source: 'storage', path: '', url: '', title: '', caption: '' } satisfies VideoPayload;
    case 'carousel':
      return {
        heading: '',
        instruction: 'Use the arrows to move through each step.',
        items: [{ id: crypto.randomUUID(), title: '', text: '' }],
      } satisfies CarouselPayload;
    case 'hot_graphic':
      return {
        heading: '',
        instruction: 'Select each point on the image to find out more.',
        image: { source: 'storage' },
        alt: '',
        hotspots: [],
      } satisfies HotGraphicPayload;

    case 'mcq': {
      const first = crypto.randomUUID();
      return {
        question: '',
        options: [
          { id: first, label: '' },
          { id: crypto.randomUUID(), label: '' },
        ],
        correct_id: first,
        explanation: '',
      } satisfies McqPayload;
    }
    case 'drag_match': {
      const target = crypto.randomUUID();
      return {
        prompt: '',
        targets: [
          { id: target, label: '' },
          { id: crypto.randomUUID(), label: '' },
        ],
        items: [{ id: crypto.randomUUID(), label: '', target_id: target }],
        shuffle: true,
        feedback: {
          correct: 'That’s right — well matched.',
          incorrect: 'Not quite. The ones that don’t match are back in the list — try again.',
        },
      } satisfies DragMatchPayload;
    }
    case 'checklist':
      return {
        heading: '',
        caption: 'Your assessor completes the real sign-off in person.',
        steps: [{ id: crypto.randomUUID(), step_title: '', instruction: '', safety_note: '' }],
      } satisfies ChecklistPayload;
    case 'scenario':
      return defaultScenarioPayload();
  }
}

/**
 * Starter scenario: one decision with two choices, leading to a good ending and
 * an unsafe ending. Slugs are prefilled so authors can see the shape at once.
 */
export function defaultScenarioPayload(): ScenarioPayload {
  const start = crypto.randomUUID();
  const good = crypto.randomUUID();
  const bad = crypto.randomUUID();
  return {
    version: 1,
    start_id: start,
    require_best_path: false,
    debrief: '',
    nodes: [
      {
        id: start,
        slug: 'the-situation',
        kind: 'decision',
        title: 'The situation',
        body: 'Describe what the learner walks into, in two or three sentences.',
        choices: [
          {
            id: crypto.randomUUID(),
            label: 'The safe thing to do',
            next_id: good,
            quality: 'best',
            feedback: 'Explain why this is the right call.',
          },
          {
            id: crypto.randomUUID(),
            label: 'The tempting shortcut',
            next_id: bad,
            quality: 'unsafe',
            feedback: 'Explain what goes wrong and what to do instead.',
          },
        ],
      },
      {
        id: good,
        slug: 'safe-ending',
        kind: 'end',
        title: 'A safe outcome',
        body: 'Describe what good practice looked like here.',
      },
      {
        id: bad,
        slug: 'unsafe-ending',
        kind: 'end',
        title: 'An unsafe outcome',
        body: 'Describe the consequence, and the point at which they should stop and escalate.',
      },
    ],
  };
}

/** Blocks that need a learner interaction before the lesson can be completed. */
export function isInteractive(type: BlockType): boolean {
  return (
    type === 'card_deck' ||
    type === 'flip_cards' ||
    type === 'accordion' ||
    type === 'video' ||
    type === 'carousel' ||
    type === 'hot_graphic' ||
    type === 'mcq' ||
    type === 'drag_match' ||
    type === 'scenario'
  );
}

/**
 * Whether the completion switch starts ON for a newly added block.
 * Card decks, knowledge checks, matching activities, story carousels, labelled
 * images and scenarios default ON; video, accordion, flip cards and the
 * practical checklist default OFF.
 */
export function defaultContributesToCompletion(type: BlockType): boolean {
  return (
    type === 'card_deck' ||
    type === 'mcq' ||
    type === 'drag_match' ||
    type === 'carousel' ||
    type === 'hot_graphic' ||
    type === 'scenario'
  );
}


/**
 * Blocks whose learner answers are persisted to lesson_block_responses.
 * Payload-aware: a video block only persists once it carries checkpoints.
 */
export function persistsResponse(type: BlockType, payload?: BlockPayload): boolean {
  if (type === 'mcq' || type === 'drag_match' || type === 'scenario') return true;
  if (type === 'video') return videoCheckpoints(payload as VideoPayload | undefined).length > 0;
  return false;
}

/** Authored checkpoints, sorted by cue time at read time (never on save). */
export function videoCheckpoints(payload?: VideoPayload | null): VideoCheckpoint[] {
  const list = payload?.checkpoints ?? [];
  return [...list].sort((a, b) => (a.at_s ?? 0) - (b.at_s ?? 0));
}

/** Whether checkpoints are technically possible for this video source. */
export function supportsCheckpoints(payload?: VideoPayload | null): boolean {
  if (!payload) return false;
  return payload.source !== 'url';
}

/** Author-facing problems with a checkpoint. Empty array = valid. */
export function checkpointIssues(cp: VideoCheckpoint, durationSeconds?: number | null): string[] {
  const issues: string[] = [];
  if (!Number.isFinite(cp.at_s) || cp.at_s <= 0) issues.push('Set a time after the start.');
  if (durationSeconds && cp.at_s >= durationSeconds)
    issues.push('This time is past the end of the video.');
  if (!cp.question?.trim()) issues.push('Add a question.');
  const options = cp.options ?? [];
  if (options.length < 2) issues.push('Add at least two options.');
  if (options.length > 4) issues.push('Use no more than four options.');
  if (options.some((o) => !o.label?.trim())) issues.push('Every option needs a label.');
  if (!options.some((o) => o.id === cp.correct_id)) issues.push('Mark the correct answer.');
  return issues;
}

export function newCheckpoint(at_s = 0): VideoCheckpoint {
  const first = crypto.randomUUID();
  return {
    id: crypto.randomUUID(),
    at_s,
    question: '',
    options: [
      { id: first, label: '' },
      { id: crypto.randomUUID(), label: '' },
    ],
    correct_id: first,
    explanation: '',
  };
}

/** mm:ss helpers for the authoring timestamp field. */
export function secondsToMmSs(total: number): string {
  const s = Math.max(0, Math.round(total || 0));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function mmSsToSeconds(value: string): number | null {
  const raw = (value || '').trim();
  if (!raw) return null;
  const m = raw.match(/^(\d+):([0-5]?\d)$/);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  if (/^\d+$/.test(raw)) return Number(raw);
  return null;
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

/**
 * P9 — authoring guard: does this video payload carry an invalid checkpoint?
 * Used to block "Save content" while a checkpoint time/question/options are
 * unusable. Learner behaviour is untouched.
 */
export function hasInvalidCheckpoints(payload?: VideoPayload | null): boolean {
  if (!supportsCheckpoints(payload)) return false;
  return videoCheckpoints(payload).some((cp) => checkpointIssues(cp).length > 0);
}

/* --------------------------- scenario validation --------------------------- */

export type ScenarioIssueCode =
  | 'no_start'
  | 'empty_body'
  | 'duplicate_slug'
  | 'unreachable'
  | 'dangling_choice'
  | 'dangling_next'
  | 'too_few_choices'
  | 'outcome_missing_next'
  | 'end_has_next'
  | 'no_end_reachable';

export interface ScenarioIssue {
  code: ScenarioIssueCode;
  message: string;
  /** Node the author should jump to, when the issue belongs to one. */
  node_id?: string;
  choice_id?: string;
}

export const SCENARIO_ISSUE_MESSAGES: Record<ScenarioIssueCode, string> = {
  no_start: 'Choose which node the scenario starts at.',
  empty_body: 'Add the wording learners read at this step.',
  duplicate_slug: 'Two nodes share the same short key — make each one unique.',
  unreachable: 'Learners can never reach this node. Link it from a choice, or delete it.',
  dangling_choice: 'This choice points at a node that no longer exists.',
  dangling_next: 'This node points at a node that no longer exists.',
  too_few_choices: 'A decision needs at least two choices.',
  outcome_missing_next: 'An outcome needs to say what happens next.',
  end_has_next: 'An ending cannot lead anywhere — remove what happens next.',
  no_end_reachable: 'No ending can be reached from the start, so the scenario never finishes.',
};

/** Breadth-first order of reachable node ids, grouped by depth from the start. */
export function scenarioDepths(payload: ScenarioPayload): Map<string, number> {
  const byId = new Map((payload.nodes ?? []).map((n) => [n.id, n]));
  const depths = new Map<string, number>();
  const start = payload.start_id;
  if (!start || !byId.has(start)) return depths;
  const queue: string[] = [start];
  depths.set(start, 0);
  while (queue.length) {
    const id = queue.shift() as string;
    const node = byId.get(id);
    if (!node) continue;
    const targets: string[] = [];
    if (node.kind === 'decision') for (const c of node.choices ?? []) targets.push(c.next_id);
    if (node.kind === 'outcome' && node.next_id) targets.push(node.next_id);
    for (const t of targets) {
      if (!t || !byId.has(t) || depths.has(t)) continue;
      depths.set(t, (depths.get(id) ?? 0) + 1);
      queue.push(t);
    }
  }
  return depths;
}

/** Author-facing problems with a scenario. Empty array = publishable. */
export function validateScenario(payload?: ScenarioPayload | null): ScenarioIssue[] {
  const issues: ScenarioIssue[] = [];
  if (!payload) return issues;
  const nodes = payload.nodes ?? [];
  const byId = new Map(nodes.map((n) => [n.id, n]));

  const issue = (code: ScenarioIssueCode, extra?: Partial<ScenarioIssue>) =>
    issues.push({ code, message: SCENARIO_ISSUE_MESSAGES[code], ...extra });

  if (!payload.start_id || !byId.has(payload.start_id)) issue('no_start');

  const seen = new Set<string>();
  for (const node of nodes) {
    const slug = (node.slug || '').trim().toLowerCase();
    if (slug && seen.has(slug)) issue('duplicate_slug', { node_id: node.id });
    if (slug) seen.add(slug);

    if (!node.body?.trim()) issue('empty_body', { node_id: node.id });

    if (node.kind === 'decision') {
      const choices = node.choices ?? [];
      if (choices.length < 2) issue('too_few_choices', { node_id: node.id });
      for (const c of choices) {
        if (!c.next_id || !byId.has(c.next_id))
          issue('dangling_choice', { node_id: node.id, choice_id: c.id });
      }
    }
    if (node.kind === 'outcome') {
      if (!node.next_id) issue('outcome_missing_next', { node_id: node.id });
      else if (!byId.has(node.next_id)) issue('dangling_next', { node_id: node.id });
    }
    if (node.kind === 'end' && node.next_id) issue('end_has_next', { node_id: node.id });
  }

  const depths = scenarioDepths(payload);
  for (const node of nodes) {
    if (!depths.has(node.id)) issue('unreachable', { node_id: node.id });
  }
  const reachesEnd = nodes.some((n) => n.kind === 'end' && depths.has(n.id));
  if (!reachesEnd) issue('no_end_reachable');

  return issues;
}

/* ---------------------------- scenario responses --------------------------- */

export interface ScenarioStep {
  node_id: string;
  choice_id: string;
}

export interface ScenarioRun {
  started_at: string;
  ended_at: string;
  end_node_id: string;
  /** No choice of quality 'unsafe' was taken. */
  is_clean: boolean;
  path: ScenarioStep[];
}

export interface ScenarioResponse {
  kind: 'scenario';
  version: 1;
  runs: ScenarioRun[];
  current?: { started_at: string; path: ScenarioStep[] };
}

export const SCENARIO_RUN_CAP = 10;

/**
 * Keep the stored run list at the cap by keeping the FIRST run (the learner's
 * very first attempt) and the most recent ones.
 */
export function trimScenarioRuns(runs: ScenarioRun[], cap = SCENARIO_RUN_CAP): ScenarioRun[] {
  if (runs.length <= cap) return runs;
  return [runs[0], ...runs.slice(runs.length - (cap - 1))];
}

/* --------------------------- visibility validation ------------------------- */

/** Read the visibility condition off any payload. */
export function blockVisibility(payload?: BlockPayload | null): BlockVisibility | null {
  const v = (payload as VisibilityAware | undefined | null)?.visibility;
  if (!v || !v.block_id || !v.when) return null;
  return v;
}

/**
 * Blocks that can be a visibility SOURCE. All of these report a completion
 * signal, so `if_complete` works for any of them.
 */
export const VISIBILITY_SOURCE_TYPES: readonly BlockType[] = [
  'mcq',
  'drag_match',
  'video',
  'hot_graphic',
  'scenario',
  'card_deck',
  'accordion',
  'flip_cards',
  'carousel',
];

/** Sources that carry a right/wrong outcome, so `if_correct`/`if_incorrect` work. */
export const VISIBILITY_OUTCOME_TYPES: readonly BlockType[] = [
  'mcq',
  'drag_match',
  'video',
  'scenario',
];

export function canBeVisibilitySource(type: BlockType, when: VisibilityWhen): boolean {
  if (when === 'if_complete') return VISIBILITY_SOURCE_TYPES.includes(type);
  return VISIBILITY_OUTCOME_TYPES.includes(type);
}

export const VISIBILITY_WHEN_LABELS: Record<VisibilityWhen, string> = {
  if_correct: 'answered correctly',
  if_incorrect: 'answered, but not correctly',
  if_complete: 'finished',
};

export type VisibilityIssueCode =
  | 'dangling_source'
  | 'forward_reference'
  | 'self_reference'
  | 'source_not_interactive'
  | 'source_no_outcome'
  | 'source_conditional';

export interface VisibilityIssue {
  code: VisibilityIssueCode;
  message: string;
  /** The conditional block the author needs to fix. */
  block_id: string;
}

export const VISIBILITY_ISSUE_MESSAGES: Record<VisibilityIssueCode, string> = {
  dangling_source: 'This block waits on an activity that is no longer in the lesson.',
  forward_reference: 'The activity it waits on must come earlier in the lesson.',
  self_reference: 'A block cannot wait on itself.',
  source_not_interactive: 'Only an activity learners take part in can decide this.',
  source_no_outcome:
    'That activity has no right or wrong answer, so choose “is finished” instead.',
  source_conditional: 'The activity it waits on is itself conditional — keep it to one step.',
};

/** The minimum a block needs to expose for visibility validation/evaluation. */
export interface VisibilityBlock {
  id: string;
  block_type: BlockType;
  payload: BlockPayload;
}

/**
 * Author-facing problems with conditional visibility, across a whole lesson in
 * running order (array order = order_index). Empty array = publishable.
 */
export function validateVisibility(blocks: readonly VisibilityBlock[]): VisibilityIssue[] {
  const issues: VisibilityIssue[] = [];
  const indexOf = new Map(blocks.map((b, i) => [b.id, i]));

  blocks.forEach((block, index) => {
    const vis = blockVisibility(block.payload);
    if (!vis) return;
    const push = (code: VisibilityIssueCode) =>
      issues.push({ code, message: VISIBILITY_ISSUE_MESSAGES[code], block_id: block.id });

    if (vis.block_id === block.id) {
      push('self_reference');
      return;
    }
    const sourceIndex = indexOf.get(vis.block_id);
    if (sourceIndex === undefined) {
      push('dangling_source');
      return;
    }
    if (sourceIndex >= index) {
      push('forward_reference');
      return;
    }
    const source = blocks[sourceIndex];
    if (!VISIBILITY_SOURCE_TYPES.includes(source.block_type)) {
      push('source_not_interactive');
      return;
    }
    if (!canBeVisibilitySource(source.block_type, vis.when)) {
      push('source_no_outcome');
      return;
    }
    // v1 is one level deep: a condition may not hang off a conditional block.
    if (blockVisibility(source.payload)) push('source_conditional');
  });

  return issues;
}

/**
 * Which blocks a learner can currently see. Pure, so both the player and the
 * tests share exactly one rule.
 *
 * `deckState` is the completion signal map, `blockOutcome` the right/wrong map
 * (null = attempted-but-not-assessed or unknown). A block with no condition is
 * always visible; an invalid condition (dangling source) hides the block rather
 * than showing remediation out of nowhere.
 */
export function visibleBlockIds(
  blocks: readonly VisibilityBlock[],
  deckState: Record<string, boolean>,
  blockOutcome: Record<string, boolean | null>
): Set<string> {
  const known = new Set(blocks.map((b) => b.id));
  const visible = new Set<string>();
  for (const block of blocks) {
    const vis = blockVisibility(block.payload);
    if (!vis) {
      visible.add(block.id);
      continue;
    }
    if (!known.has(vis.block_id) || vis.block_id === block.id) continue;
    const outcome = blockOutcome[vis.block_id];
    const met =
      vis.when === 'if_complete'
        ? !!deckState[vis.block_id]
        : vis.when === 'if_correct'
          ? outcome === true
          : outcome === false;
    if (met) visible.add(block.id);
  }
  return visible;
}
