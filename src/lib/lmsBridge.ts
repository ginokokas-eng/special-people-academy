/**
 * LMS bridge — thin postMessage channel between the Academy learner app and a
 * third-party LMS that has embedded us via a generated SCORM 1.2 launcher.
 *
 * Active ONLY in "LMS mode", which is entered by `?scorm=1` on a learner route
 * (set by /launch after a one-shot launch token is consumed) and then persisted
 * in sessionStorage so it survives in-app navigation.
 *
 * Messages are never broadcast to '*'. We post to the origin of
 * `document.referrer` (the hosting LMS). With no usable referrer origin we skip
 * posting entirely — a silent no-op is the correct failure mode here, and the
 * LMS can still poll `lms-api?resource=launch-status`.
 */

export const LMS_SOURCE = 'special-people-academy';

const MODE_KEY = 'academy_lms_mode';
const ORIGIN_KEY = 'academy_lms_parent_origin';

export type LmsMessageType =
  | 'lesson_completed'
  | 'course_completed'
  | 'score'
  | 'heartbeat';

export interface LmsMessage {
  source: typeof LMS_SOURCE;
  type: LmsMessageType;
  course_id: string;
  lesson_id?: string;
  percent: number;
  score?: number;
  passed?: boolean;
}

export interface LmsMessageInput {
  type: LmsMessageType;
  course_id: string;
  lesson_id?: string | null;
  percent?: number | null;
  score?: number | null;
  passed?: boolean | null;
}

const clampPercent = (value: number | null | undefined): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
};

/** Pure message shaping — the single source of truth for the wire format. */
export function buildLmsMessage(input: LmsMessageInput): LmsMessage {
  const message: LmsMessage = {
    source: LMS_SOURCE,
    type: input.type,
    course_id: input.course_id,
    percent: clampPercent(input.percent),
  };
  if (input.lesson_id) message.lesson_id = input.lesson_id;
  if (typeof input.score === 'number' && Number.isFinite(input.score)) {
    message.score = clampPercent(input.score);
  }
  if (typeof input.passed === 'boolean') message.passed = input.passed;
  return message;
}

/**
 * SCORM 1.2 status mapping, shared with the generated launcher so the two can
 * never drift. `lesson_completed` keeps the SCO incomplete (more lessons to
 * come); `course_completed` closes it as passed or failed against the pass
 * mark, or plain `completed` when the course is not scored.
 */
export function scormStatusFromMessage(
  message: Pick<LmsMessage, 'type' | 'score' | 'passed' | 'percent'>,
  passMark = 80,
): { lesson_status: string; score_raw: number } | null {
  const score = typeof message.score === 'number' ? message.score : message.percent;
  if (message.type === 'heartbeat') return null;
  if (message.type === 'lesson_completed' || message.type === 'score') {
    return { lesson_status: 'incomplete', score_raw: clampPercent(message.percent) };
  }
  // course_completed
  if (typeof message.passed === 'boolean') {
    return { lesson_status: message.passed ? 'passed' : 'failed', score_raw: clampPercent(score) };
  }
  if (typeof message.score === 'number') {
    return {
      lesson_status: message.score >= passMark ? 'passed' : 'failed',
      score_raw: clampPercent(message.score),
    };
  }
  return { lesson_status: 'completed', score_raw: clampPercent(message.percent) };
}

/** Origin of the hosting LMS, or null when it cannot be established. */
export function parentOrigin(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = window.sessionStorage.getItem(ORIGIN_KEY);
    if (stored) return stored;
  } catch {
    /* private mode */
  }
  return referrerOrigin();
}

export function referrerOrigin(): string | null {
  if (typeof document === 'undefined' || !document.referrer) return null;
  try {
    const origin = new URL(document.referrer).origin;
    return origin && origin !== 'null' ? origin : null;
  } catch {
    return null;
  }
}

export function isAllowedFrameOrigin(
  origin: string | null,
  allowed: string[] | null | undefined,
): boolean {
  // No allow-list configured on the key = the organisation has not restricted
  // embedding, so we do not block them out of their own launcher.
  if (!allowed || allowed.length === 0) return true;
  if (!origin) return false;
  const normalise = (value: string) => value.trim().replace(/\/+$/, '').toLowerCase();
  return allowed.map(normalise).includes(normalise(origin));
}

export function enterLmsMode(origin?: string | null) {
  if (typeof window === 'undefined') return;
  try {
    window.sessionStorage.setItem(MODE_KEY, '1');
    const resolved = origin ?? referrerOrigin();
    if (resolved) window.sessionStorage.setItem(ORIGIN_KEY, resolved);
  } catch {
    /* ignore */
  }
}

export function isLmsMode(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.sessionStorage.getItem(MODE_KEY) === '1') return true;
  } catch {
    /* ignore */
  }
  return new URLSearchParams(window.location.search).get('scorm') === '1';
}

/** Call once per learner route render: promotes `?scorm=1` into the flag. */
export function syncLmsModeFromUrl(): boolean {
  if (typeof window === 'undefined') return false;
  if (new URLSearchParams(window.location.search).get('scorm') === '1') enterLmsMode();
  return isLmsMode();
}

export function postLmsMessage(input: LmsMessageInput): boolean {
  if (typeof window === 'undefined' || !isLmsMode()) return false;
  if (window.parent === window) return false;
  const target = parentOrigin();
  if (!target) return false; // never '*'
  try {
    window.parent.postMessage(buildLmsMessage(input), target);
    return true;
  } catch {
    return false;
  }
}

/** Heartbeat while a lesson is open. Returns a stop function. */
export function startLmsHeartbeat(
  input: Omit<LmsMessageInput, 'type'>,
  intervalMs = 60_000,
): () => void {
  if (typeof window === 'undefined' || !isLmsMode()) return () => {};
  const timer = window.setInterval(() => {
    postLmsMessage({ ...input, type: 'heartbeat' });
  }, intervalMs);
  return () => window.clearInterval(timer);
}

/**
 * Clickjacking guard.
 *
 * The proper fix is a response header the app cannot set from the client:
 *   Content-Security-Policy: frame-ancestors 'self' https://lms.example.org
 * That has to be emitted per-request by the host, and the allow-list is
 * per-organisation, so it cannot be baked in statically. Until hosting exposes
 * custom headers we do the feasible half: any framing that did NOT come through
 * /launch breaks out to the top window.
 */
export function breakOutOfUnexpectedFrame(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    if (window.top === window.self) return false;
    // A same-origin parent is never a hijack: the lesson editor embeds the
    // learner preview route in an iframe on the same origin.
    try {
      if (window.top && window.top.location.origin === window.location.origin) return false;
    } catch {
      // Cross-origin top: reading its location throws; fall through to the checks below.
    }
    const path = window.location.pathname;
    if (path.startsWith('/launch')) return false;
    if (isLmsMode()) return false;
    if (window.top) window.top.location = window.self.location.href;
    return true;
  } catch {
    // Cross-origin top: we cannot read or set it. Nothing further to do.
    return false;
  }
}
