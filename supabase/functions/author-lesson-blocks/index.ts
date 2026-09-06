/**
 * author-lesson-blocks
 *
 * Staff-only AI authoring copilot for the lesson block editor. It NEVER writes
 * lesson content: it returns id-free drafts that the author accepts (or edits,
 * or rejects) in the editor, and only the editor's own Save writes blocks.
 *
 * Modes: draft_lesson · knowledge_check · suggest_checkpoints · improve_block.
 * Every run is logged to ai_authoring_runs (user_id only — no learner PII).
 */
import { callGatewayJson, GATEWAY_MODEL } from '../_shared/ai-gateway.ts';
import { adminClient, corsHeaders, json, requireOpsTrainingAdmin, resolveUser } from '../_shared/staff-auth.ts';

const MAX_TEXT_CHARS = 40_000;
const MAX_INSTRUCTION_CHARS = 300;
const DAILY_RUN_CEILING = 60;

type Mode = 'draft_lesson' | 'knowledge_check' | 'suggest_checkpoints' | 'improve_block' | 'translate_blocks';
const MODES: Mode[] = [
  'draft_lesson',
  'knowledge_check',
  'suggest_checkpoints',
  'improve_block',
  'translate_blocks',
];

/** v1 ships Romanian only. Adding a language is a constant change here. */
const TRANSLATION_LANGS: Record<string, string> = { ro: 'Romanian (Română)' };

const DRAFT_BLOCK_TYPES = ['text', 'callout', 'flip_cards', 'accordion', 'mcq', 'scenario'] as const;

/* --------------------------------- schemas -------------------------------- */

const optionSchema = {
  type: 'array',
  items: {
    type: 'object',
    additionalProperties: false,
    properties: { label: { type: 'string' } },
    required: ['label'],
  },
};

const scenarioSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    start_slug: { type: 'string' },
    debrief: { type: 'string' },
    nodes: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          slug: { type: 'string' },
          kind: { type: 'string', enum: ['decision', 'end'] },
          title: { type: 'string' },
          body: { type: 'string' },
          choices: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: {
                label: { type: 'string' },
                next_slug: { type: 'string' },
                quality: { type: 'string', enum: ['best', 'acceptable', 'unsafe'] },
                feedback: { type: 'string' },
              },
              required: ['label', 'next_slug', 'quality', 'feedback'],
            },
          },
        },
        required: ['slug', 'kind', 'title', 'body', 'choices'],
      },
    },
  },
  required: ['start_slug', 'debrief', 'nodes'],
};

/**
 * One flat, id-FREE draft block. Every field is present (strict mode); unused
 * fields are empty. Ids are minted in the browser when the author accepts.
 */
const draftBlockSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    block_type: { type: 'string', enum: DRAFT_BLOCK_TYPES as unknown as string[] },
    heading: { type: 'string' },
    text: { type: 'string' },
    variant: { type: 'string', enum: ['info', 'safety', 'warning', 'success', 'none'] },
    cards: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { front: { type: 'string' }, back: { type: 'string' } },
        required: ['front', 'back'],
      },
    },
    items: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: { title: { type: 'string' }, body: { type: 'string' } },
        required: ['title', 'body'],
      },
    },
    question: { type: 'string' },
    options: optionSchema,
    correct_index: { type: 'integer' },
    explanation: { type: 'string' },
    scenario: scenarioSchema,
  },
  required: [
    'block_type',
    'heading',
    'text',
    'variant',
    'cards',
    'items',
    'question',
    'options',
    'correct_index',
    'explanation',
    'scenario',
  ],
};

const blocksSchema = {
  type: 'object',
  additionalProperties: false,
  properties: { blocks: { type: 'array', items: draftBlockSchema } },
  required: ['blocks'],
};

const checkpointsSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    checkpoints: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          at_s: { type: 'number' },
          question: { type: 'string' },
          options: optionSchema,
          correct_index: { type: 'integer' },
          explanation: { type: 'string' },
        },
        required: ['at_s', 'question', 'options', 'correct_index', 'explanation'],
      },
    },
  },
  required: ['checkpoints'],
};

/**
 * Translation reply. Paths are sent as ENTRIES, not as a free-form object, so a
 * strict schema can describe them. The client owns the path map, so the model
 * only ever echoes back the paths it was given.
 */
const translationSchema = {
  type: 'object',
  additionalProperties: false,
  properties: {
    blocks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        properties: {
          block_id: { type: 'string' },
          texts: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              properties: { path: { type: 'string' }, text: { type: 'string' } },
              required: ['path', 'text'],
            },
          },
        },
        required: ['block_id', 'texts'],
      },
    },
  },
  required: ['blocks'],
};


/* -------------------------------- validators ------------------------------- */

type Rec = Record<string, unknown>;

function validateDraftBlock(b: unknown, index: number): string[] {
  const errs: string[] = [];
  const at = `blocks[${index}]`;
  if (!b || typeof b !== 'object') return [`${at} is not an object`];
  const r = b as Rec;
  const type = r.block_type;
  if (typeof type !== 'string' || !(DRAFT_BLOCK_TYPES as readonly string[]).includes(type)) {
    return [`${at}.block_type must be one of ${DRAFT_BLOCK_TYPES.join(', ')}`];
  }
  const str = (k: string) => (typeof r[k] === 'string' ? (r[k] as string).trim() : '');
  const arr = (k: string) => (Array.isArray(r[k]) ? (r[k] as Rec[]) : []);

  if (type === 'text' && !str('text')) errs.push(`${at}.text must not be empty`);
  if (type === 'callout') {
    if (!str('text')) errs.push(`${at}.text must not be empty`);
    if (!['info', 'safety', 'warning', 'success'].includes(str('variant')))
      errs.push(`${at}.variant must be info, safety, warning or success`);
  }
  if (type === 'flip_cards') {
    const cards = arr('cards');
    if (cards.length < 2) errs.push(`${at}.cards needs at least 2 cards`);
    if (cards.some((c) => !String(c.front ?? '').trim() || !String(c.back ?? '').trim()))
      errs.push(`${at}.cards each need a front and a back`);
  }
  if (type === 'accordion') {
    const items = arr('items');
    if (items.length < 2) errs.push(`${at}.items needs at least 2 sections`);
    if (items.some((i) => !String(i.title ?? '').trim() || !String(i.body ?? '').trim()))
      errs.push(`${at}.items each need a title and a body`);
  }
  if (type === 'mcq') {
    if (!str('question')) errs.push(`${at}.question must not be empty`);
    const options = arr('options');
    if (options.length < 2 || options.length > 4)
      errs.push(`${at}.options needs between 2 and 4 options`);
    if (options.some((o) => !String(o.label ?? '').trim()))
      errs.push(`${at}.options each need a label`);
    const ci = Number(r.correct_index);
    if (!Number.isInteger(ci) || ci < 0 || ci >= options.length)
      errs.push(`${at}.correct_index must point at one of the options`);
  }
  if (type === 'scenario') {
    const s = r.scenario as Rec | undefined;
    const nodes = Array.isArray(s?.nodes) ? (s!.nodes as Rec[]) : [];
    if (nodes.length < 3) errs.push(`${at}.scenario.nodes needs at least 3 nodes`);
    const slugs = new Set(nodes.map((n) => String(n.slug ?? '').trim()).filter(Boolean));
    if (slugs.size !== nodes.length) errs.push(`${at}.scenario node slugs must be unique`);
    if (!slugs.has(String(s?.start_slug ?? '').trim()))
      errs.push(`${at}.scenario.start_slug must match a node slug`);
    for (const n of nodes) {
      if (!String(n.body ?? '').trim()) errs.push(`${at}.scenario node "${n.slug}" needs a body`);
      const choices = Array.isArray(n.choices) ? (n.choices as Rec[]) : [];
      if (n.kind === 'decision') {
        if (choices.length < 2)
          errs.push(`${at}.scenario decision "${n.slug}" needs at least 2 choices`);
        for (const c of choices) {
          if (!slugs.has(String(c.next_slug ?? '').trim()))
            errs.push(`${at}.scenario choice "${c.label}" points at an unknown slug`);
        }
      } else if (choices.length) {
        errs.push(`${at}.scenario ending "${n.slug}" must have no choices`);
      }
    }
    if (!nodes.some((n) => n.kind === 'end')) errs.push(`${at}.scenario needs at least one ending`);
  }
  return errs;
}

function validateBlocksReply(data: unknown, min: number, max: number, onlyMcq = false): string[] {
  if (!data || typeof data !== 'object') return ['reply is not an object'];
  const blocks = (data as Rec).blocks;
  if (!Array.isArray(blocks)) return ['reply.blocks must be an array'];
  if (blocks.length < min || blocks.length > max)
    return [`reply.blocks must contain between ${min} and ${max} blocks`];
  const errs: string[] = [];
  blocks.forEach((b, i) => {
    errs.push(...validateDraftBlock(b, i));
    if (onlyMcq && (b as Rec)?.block_type !== 'mcq') errs.push(`blocks[${i}] must be an mcq`);
  });
  return errs;
}

function validateCheckpointsReply(data: unknown, starts: number[]): string[] {
  if (!data || typeof data !== 'object') return ['reply is not an object'];
  const list = (data as Rec).checkpoints;
  if (!Array.isArray(list) || !list.length) return ['reply.checkpoints must be a non-empty array'];
  const errs: string[] = [];
  list.forEach((c, i) => {
    const r = (c ?? {}) as Rec;
    const at = `checkpoints[${i}]`;
    const atS = Number(r.at_s);
    if (!Number.isFinite(atS) || atS <= 0) errs.push(`${at}.at_s must be a positive number`);
    else if (!starts.some((s) => Math.abs(s - atS) < 0.01))
      errs.push(`${at}.at_s must be exactly one of the segment start times`);
    if (!String(r.question ?? '').trim()) errs.push(`${at}.question must not be empty`);
    const options = Array.isArray(r.options) ? (r.options as Rec[]) : [];
    if (options.length < 2 || options.length > 4) errs.push(`${at}.options needs 2 to 4 options`);
    if (options.some((o) => !String(o.label ?? '').trim())) errs.push(`${at}.options each need a label`);
    const ci = Number(r.correct_index);
    if (!Number.isInteger(ci) || ci < 0 || ci >= options.length)
      errs.push(`${at}.correct_index must point at one of the options`);
  });
  return errs;
}

/**
 * The reply must cover the blocks and paths that were ASKED FOR — nothing else.
 * Unknown block ids or paths are a schema failure, not something to guess at.
 */
function validateTranslationReply(data: unknown, wanted: Map<string, Set<string>>): string[] {
  if (!data || typeof data !== 'object') return ['reply is not an object'];
  const blocks = (data as Rec).blocks;
  if (!Array.isArray(blocks) || !blocks.length) return ['reply.blocks must be a non-empty array'];
  const errs: string[] = [];
  const seen = new Set<string>();
  for (const entry of blocks as Rec[]) {
    const id = String(entry.block_id ?? '');
    const paths = wanted.get(id);
    if (!paths) {
      errs.push(`block_id "${id}" was not in the request`);
      continue;
    }
    seen.add(id);
    const texts = Array.isArray(entry.texts) ? (entry.texts as Rec[]) : [];
    const got = new Set<string>();
    for (const t of texts) {
      const path = String(t.path ?? '');
      if (!paths.has(path)) {
        errs.push(`block "${id}" returned unknown path "${path}"`);
        continue;
      }
      if (!String(t.text ?? '').trim()) errs.push(`block "${id}" path "${path}" is empty`);
      got.add(path);
    }
    for (const path of paths) {
      if (!got.has(path)) errs.push(`block "${id}" is missing path "${path}"`);
    }
  }
  for (const id of wanted.keys()) if (!seen.has(id)) errs.push(`block "${id}" is missing`);
  return errs;
}



/* --------------------------------- prompts -------------------------------- */

const HOUSE_STYLE =
  'You write UK social care and healthcare training content for care workers. Plain British English, short sentences, second person, no jargon and no Americanisms. Never invent clinical dosing, prescribing or medical advice. Content is policy-led: where practice has a limit, say to stop and escalate. Distractors in questions must be plausible mistakes a real care worker could make — never silly. Return ONLY JSON matching the schema. Leave any field you do not need as an empty string, an empty array or 0.';

function stripMedia(value: unknown, depth = 0): unknown {
  if (depth > 6) return null;
  if (Array.isArray(value)) return value.map((v) => stripMedia(v, depth + 1));
  if (value && typeof value === 'object') {
    const out: Rec = {};
    for (const [k, v] of Object.entries(value as Rec)) {
      if (['path', 'url', 'image_path', 'media', 'image', 'file_name'].includes(k)) continue;
      out[k] = stripMedia(v, depth + 1);
    }
    return out;
  }
  return value;
}

/* ---------------------------------- handler ------------------------------- */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const admin = adminClient();
  let userId: string | null = null;
  let mode = '';
  let lessonId: string | null = null;
  let inputChars = 0;

  const logRun = async (status: string, outputChars: number, error?: string) => {
    if (!userId) return;
    const { error: logError } = await admin.from('ai_authoring_runs').insert({
      user_id: userId,
      lesson_id: lessonId,
      mode: mode || 'unknown',
      input_chars: inputChars,
      output_chars: outputChars,
      model: GATEWAY_MODEL,
      status,
      error: error ? error.slice(0, 500) : null,
    });
    if (logError) console.error('Could not log authoring run:', logError.message);
  };

  try {
    const resolved = await resolveUser(req);
    if (!resolved) return json({ error: 'Not signed in' }, 401);
    userId = resolved.userId;

    const isStaff = await requireOpsTrainingAdmin(resolved.client, resolved.userId);
    if (!isStaff) return json({ error: 'You do not have permission to draft lesson content' }, 403);

    const body = (await req.json().catch(() => null)) as Rec | null;
    if (!body) return json({ error: 'Send a JSON body' }, 400);
    mode = String(body.mode ?? '');
    if (!MODES.includes(mode as Mode)) return json({ error: 'Unknown mode' }, 400);
    const rawLesson = typeof body.lesson_id === 'string' ? body.lesson_id : '';
    lessonId = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawLesson)
      ? rawLesson
      : null;
    const input = (body.input ?? {}) as Rec;

    // Per-user ceiling over a rolling 24 hours.
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    const { count, error: countError } = await admin
      .from('ai_authoring_runs')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', since);
    if (countError) throw countError;
    if ((count ?? 0) >= DAILY_RUN_CEILING) {
      await logRun('rate_limited', 0, 'daily ceiling reached');
      return json(
        {
          error: `You have used all ${DAILY_RUN_CEILING} AI drafts for today. Please try again tomorrow.`,
        },
        429
      );
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return json({ error: 'AI is not configured for this workspace.' }, 500);

    let system = HOUSE_STYLE;
    let user = '';
    let schema: Record<string, unknown> = blocksSchema;
    let schemaName = 'lesson_blocks';
    let validate: (data: unknown) => string[] = (d) => validateBlocksReply(d, 1, 12);

    if (mode === 'draft_lesson') {
      const text = String(input.text ?? '').trim();
      if (!text) return json({ error: 'Paste the source text first.' }, 400);
      if (text.length > MAX_TEXT_CHARS)
        return json({ error: 'That text is too long. Paste up to 40,000 characters.' }, 400);
      inputChars = text.length;
      const title = String(input.title ?? '').trim();
      const audience = String(input.audience ?? 'care worker').trim() || 'care worker';
      system += ` Produce between 4 and 10 blocks. The FIRST block must be a text block of learning objectives, headed "What you will learn", written as "-" bullet lines. Include at least one callout with variant "safety" wherever the source warrants a safety limit. Use flip_cards, accordion, mcq and at most one scenario to vary the lesson. Audience: ${audience}.`;
      user = `Lesson title: ${title || '(untitled)'}\n\nSource material:\n${text}`;
      validate = (d) => validateBlocksReply(d, 4, 10);
    } else if (mode === 'knowledge_check') {
      const count = Math.min(Math.max(Number(input.count ?? 3) || 3, 1), 6);
      const cleaned = stripMedia(input.blocks ?? []);
      const serialised = JSON.stringify(cleaned).slice(0, MAX_TEXT_CHARS);
      inputChars = serialised.length;
      system += ` Write exactly ${count} multiple-choice knowledge check blocks (block_type "mcq") drawn ONLY from the lesson content given. Every question needs an explanation of why the right answer is right.`;
      user = `Lesson blocks (text content only):\n${serialised}`;
      validate = (d) => validateBlocksReply(d, count, count, true);
    } else if (mode === 'suggest_checkpoints') {
      const segments = Array.isArray(input.segments) ? (input.segments as Rec[]) : [];
      const starts = segments
        .map((s) => Number(s.start))
        .filter((n) => Number.isFinite(n) && n > 0);
      if (!starts.length)
        return json({ error: 'This video has no transcript timings to work from.' }, 400);
      const count = Math.min(Math.max(Number(input.count ?? 3) || 3, 1), 5);
      const trimmed = segments
        .map((s) => ({ start: Number(s.start), end: Number(s.end ?? 0), text: String(s.text ?? '') }))
        .filter((s) => Number.isFinite(s.start));
      const serialised = JSON.stringify(trimmed).slice(0, MAX_TEXT_CHARS);
      inputChars = serialised.length;
      schema = checkpointsSchema;
      schemaName = 'video_checkpoints';
      system += ` Suggest exactly ${count} in-video checkpoint questions, spread across the video. Each at_s MUST be copied exactly from one of the segment start times given, and the question must be answerable from what the learner has heard BEFORE that time.`;
      user = `Transcript segments:\n${serialised}`;
      validate = (d) => validateCheckpointsReply(d, starts);
    } else if (mode === 'translate_blocks') {
      const lang = String(input.lang ?? body.lang ?? '');
      const langName = TRANSLATION_LANGS[lang];
      if (!langName) return json({ error: 'That language is not available yet.' }, 400);
      const list = Array.isArray(input.blocks) ? (input.blocks as Rec[]) : [];
      // The CLIENT extracts the texts using translatablePaths, so this function
      // never guesses which fields of a block hold readable content.
      const payload: { block_id: string; block_type: string; texts: Rec }[] = [];
      const wanted = new Map<string, Set<string>>();
      for (const entry of list) {
        const id = String(entry.block_id ?? '');
        const texts = (entry.texts ?? {}) as Rec;
        const paths = Object.keys(texts).filter((p) => String(texts[p] ?? '').trim());
        if (!id || !paths.length) continue;
        wanted.set(id, new Set(paths));
        payload.push({
          block_id: id,
          block_type: String(entry.block_type ?? ''),
          texts: Object.fromEntries(paths.map((p) => [p, String(texts[p])])),
        });
      }
      if (!wanted.size) return json({ error: 'There is no text to translate here.' }, 400);
      const serialised = JSON.stringify(payload);
      if (serialised.length > MAX_TEXT_CHARS)
        return json({ error: 'Too much text at once. Translate this lesson in parts.' }, 400);
      inputChars = serialised.length;
      schema = translationSchema;
      schemaName = 'block_translations';
      system = `You are a professional translator for UK social care training. Translate the given strings from British English into ${langName}. Plain, respectful register a care worker would use at work; do not paraphrase, summarise, add or remove content. Keep numbers, units, times, dates, medication names, brand names, proper nouns, job titles of named systems and abbreviations exactly as they are. Keep every placeholder, bullet marker such as "-", and line break in the same place. Never translate the paths, the block ids or any JSON key. Return every block and every path you were given, once each. Return ONLY JSON matching the schema.`;
      user = `Target language: ${langName}\n\nBlocks to translate:\n${serialised}`;
      validate = (d) => validateTranslationReply(d, wanted);
    } else {

      const blockType = String(input.block_type ?? '');
      const instruction = String(input.instruction ?? '').trim();
      if (!blockType) return json({ error: 'Missing block_type' }, 400);
      if (!instruction) return json({ error: 'Say what you want changed.' }, 400);
      if (instruction.length > MAX_INSTRUCTION_CHARS)
        return json({ error: 'Keep the instruction under 300 characters.' }, 400);
      const cleaned = JSON.stringify(stripMedia(input.payload ?? {})).slice(0, MAX_TEXT_CHARS);
      inputChars = cleaned.length + instruction.length;
      const addSafety = instruction === 'add_safety_callout';
      if (!(DRAFT_BLOCK_TYPES as readonly string[]).includes(blockType) && !addSafety) {
        return json({ error: 'That block type cannot be redrafted by AI yet.' }, 400);
      }
      system += addSafety
        ? ' Return TWO blocks: first the original block rewritten only if it needs it, then a new callout block with variant "safety" naming the real safety limit and the escalation step.'
        : ` Return exactly ONE block of block_type "${blockType}", keeping the same structure and meaning while applying the instruction.`;
      user = `Instruction: ${instruction}\n\nCurrent block (${blockType}):\n${cleaned}`;
      validate = (d) => validateBlocksReply(d, addSafety ? 2 : 1, addSafety ? 2 : 1);
    }

    // One call, then at most ONE retry with the validator's complaint appended.
    let attempt = 0;
    let lastErrors: string[] = [];
    let userMessage = user;
    while (attempt < 2) {
      attempt += 1;
      const result = await callGatewayJson({
        apiKey,
        system,
        user: userMessage,
        schemaName,
        schema,
        maxTokens: mode === 'draft_lesson' ? 8192 : 4096,
      });
      if (!result.ok && result.gatewayStatus) {
        await logRun('gateway_error', 0, `gateway ${result.gatewayStatus}`);
        return json({ error: result.error }, result.status ?? 502);
      }
      if (!result.ok) {
        lastErrors = [result.error ?? 'unreadable reply'];
      } else {
        const errors = validate(result.data);
        if (!errors.length) {
          const out = JSON.stringify(result.data);
          await logRun('ok', out.length);
          // Translation replies come back as path/text entries; hand the client
          // the { path: translated } map it will store as overrides.
          if (mode === 'translate_blocks') {
            const blocks = ((result.data as Rec).blocks as Rec[]).map((entry) => ({
              block_id: String(entry.block_id),
              texts: Object.fromEntries(
                (entry.texts as Rec[]).map((t) => [String(t.path), String(t.text)])
              ),
            }));
            return json({ blocks }, 200);
          }
          return json(result.data as Rec, 200);
        }
        lastErrors = errors;

      }
      userMessage = `${user}\n\nYour previous reply was rejected for these reasons. Fix them all and return valid JSON only:\n- ${lastErrors.slice(0, 8).join('\n- ')}`;
    }

    await logRun('schema_failed', 0, lastErrors.join('; '));
    return json(
      {
        error: 'The AI draft came back unusable. Please try again, or reword the source text.',
        reason: lastErrors.slice(0, 5),
      },
      422
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('author-lesson-blocks failed:', message);
    await logRun('gateway_error', 0, message);
    return json({ error: 'Something went wrong drafting this content.' }, 500);
  }
});
