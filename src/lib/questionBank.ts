/**
 * Pure helpers for the staff question bank.
 *
 * The bank stores an option-id based question (same shape as an MCQ block).
 * Quizzes store a labels array plus an integer index, so copying in either
 * direction needs a deterministic mapping. None of this touches the network.
 */

export interface BankOption {
  id: string;
  label: string;
  feedback?: string;
}

export interface BankQuestion {
  id: string;
  org_id: string | null;
  version: number;
  stem: string;
  options: BankOption[];
  correct_id: string;
  explanation: string | null;
  tags: string[];
  standard_code: string | null;
  difficulty: 'easy' | 'medium' | 'hard' | null;
  created_at?: string;
  updated_at?: string;
}

/** Draft shape used by the New/Edit dialog. */
export interface BankDraft {
  stem: string;
  options: BankOption[];
  correct_id: string;
  explanation: string;
  tags: string[];
  standard_code: string;
  difficulty: 'easy' | 'medium' | 'hard' | null;
}

/** Position of the correct option, or null when the id does not match. */
export function correctIdToIndex(options: BankOption[], correctId: string): number | null {
  const at = options.findIndex((o) => o.id === correctId);
  return at === -1 ? null : at;
}

/** Option index -> option id, or null when out of range. */
export function indexToCorrectId(options: BankOption[], index: number): string | null {
  return options[index]?.id ?? null;
}

/** Quiz questions store plain labels in authored order. */
export function optionLabels(options: BankOption[]): string[] {
  return options.map((o) => o.label);
}

/** A copy is outdated once the bank row has moved on. */
export function isOutdated(
  usageVersion: number | null | undefined,
  bankVersion: number | null | undefined,
): boolean {
  if (typeof usageVersion !== 'number' || typeof bankVersion !== 'number') return false;
  return usageVersion < bankVersion;
}

/**
 * A saved edit bumps the version only when the graded substance changed —
 * stem, options (labels or order) or which option is correct. Tags, standard
 * code, difficulty and explanation are metadata and never bump.
 */
export function needsVersionBump(before: BankDraft | BankQuestion, after: BankDraft): boolean {
  if ((before.stem ?? '') !== (after.stem ?? '')) return true;
  if (before.correct_id !== after.correct_id) return true;
  const a = before.options ?? [];
  const b = after.options ?? [];
  if (a.length !== b.length) return true;
  return a.some((opt, i) => opt.id !== b[i].id || opt.label !== b[i].label);
}

/** Payload fields an MCQ lesson block needs to become a copy of a bank row. */
export interface McqFromBank {
  question: string;
  options: BankOption[];
  correct_id: string;
  explanation: string;
  bank_id: string;
  bank_version: number;
}

export function blockPayloadFromBank(bank: BankQuestion): McqFromBank {
  return {
    question: bank.stem,
    options: (bank.options ?? []).map((o) => ({
      id: o.id,
      label: o.label,
      ...(o.feedback ? { feedback: o.feedback } : {}),
    })),
    correct_id: bank.correct_id,
    explanation: bank.explanation ?? '',
    bank_id: bank.id,
    bank_version: bank.version,
  };
}

/** Reverse mapping: turn an MCQ block payload into a new bank row draft. */
export function bankDraftFromBlock(payload: {
  question?: string;
  options?: BankOption[];
  correct_id?: string;
  explanation?: string;
}): BankDraft {
  const options = (payload.options ?? []).map((o) => ({
    id: o.id,
    label: o.label,
    ...(o.feedback ? { feedback: o.feedback } : {}),
  }));
  return {
    stem: payload.question ?? '',
    options,
    correct_id: payload.correct_id ?? options[0]?.id ?? '',
    explanation: payload.explanation ?? '',
    tags: [],
    standard_code: '',
    difficulty: null,
  };
}

/** Pool configuration stored on quiz_questions.question_payload. */
export interface PoolConfig {
  pool_tags: string[];
  draw_count: number;
  standard_code?: string;
}

export function parsePoolConfig(raw: unknown): PoolConfig | null {
  if (!raw || typeof raw !== 'object') return null;
  const obj = raw as Record<string, unknown>;
  const tags = Array.isArray(obj.pool_tags) ? obj.pool_tags.filter((t): t is string => typeof t === 'string') : [];
  const draw = typeof obj.draw_count === 'number' ? obj.draw_count : Number(obj.draw_count);
  if (!tags.length || !Number.isFinite(draw) || draw <= 0) return null;
  const out: PoolConfig = { pool_tags: tags, draw_count: Math.floor(draw) };
  if (typeof obj.standard_code === 'string' && obj.standard_code) out.standard_code = obj.standard_code;
  return out;
}

/** A pool is publishable only when the bank can fill every draw. */
export function poolIsFillable(matching: number, drawCount: number): boolean {
  return drawCount > 0 && matching >= drawCount;
}

/** Old readers show this as the question text of a pool row. */
export function poolQuestionLabel(tags: string[]): string {
  return `Pool: ${tags.join(', ')}`;
}

/** Comma/enter separated free text -> clean chip list, order preserved. */
export function parseTagInput(value: string): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const raw of value.split(',')) {
    const tag = raw.trim().toLowerCase();
    if (!tag || seen.has(tag)) continue;
    seen.add(tag);
    out.push(tag);
  }
  return out;
}
