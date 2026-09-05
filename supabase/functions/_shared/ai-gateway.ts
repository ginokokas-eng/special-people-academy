/**
 * Shared Lovable AI Gateway helper for edge functions.
 *
 * One buffered chat call with a strict JSON schema, the same model id the
 * transcription function uses, and the 402/403/429 status mapping copied from
 * it so callers can pass the gateway's own message straight through.
 */

export const GATEWAY_URL = 'https://ai.gateway.lovable.dev/v1/chat/completions';
export const GATEWAY_MODEL = 'google/gemini-3.7-flash';

/** Pulls the first JSON object/array out of a reply that may be fenced. */
export function extractJson(raw: string): unknown | null {
  const fenced = raw.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = (fenced ? fenced[1] : raw).trim();
  const start = candidate.search(/[[{]/);
  if (start === -1) return null;
  try {
    return JSON.parse(candidate.slice(start));
  } catch {
    return null;
  }
}

export interface GatewayJsonResult {
  ok: boolean;
  /** Parsed JSON reply when ok. */
  data?: unknown;
  /** Raw text reply, for schema-failure retries. */
  raw?: string;
  /** HTTP status to relay to the client when not ok. */
  status?: number;
  /** Message safe to show a staff user. */
  error?: string;
  /** Gateway status when the failure came from the gateway itself. */
  gatewayStatus?: number;
}

export interface GatewayJsonRequest {
  apiKey: string;
  system: string;
  user: string;
  schemaName: string;
  schema: Record<string, unknown>;
  model?: string;
  maxTokens?: number;
}

/**
 * Buffered JSON completion. Retryability is the caller's business: only 429 and
 * 5xx are retryable, and this helper never retries by itself.
 */
export async function callGatewayJson(req: GatewayJsonRequest): Promise<GatewayJsonResult> {
  const res = await fetch(GATEWAY_URL, {
    method: 'POST',
    headers: { Authorization: `Bearer ${req.apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: req.model ?? GATEWAY_MODEL,
      max_tokens: req.maxTokens ?? 8192,
      messages: [
        { role: 'system', content: req.system },
        { role: 'user', content: req.user },
      ],
      response_format: {
        type: 'json_schema',
        json_schema: { name: req.schemaName, strict: true, schema: req.schema },
      },
    }),
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => '');
    console.error('AI gateway call failed:', res.status);
    if (res.status === 402) {
      return {
        ok: false,
        status: 402,
        gatewayStatus: 402,
        error: detail || 'This workspace has run out of AI credits.',
      };
    }
    if (res.status === 403) {
      return {
        ok: false,
        status: 403,
        gatewayStatus: 403,
        error: detail || 'AI is switched off for this workspace.',
      };
    }
    if (res.status === 429) {
      return {
        ok: false,
        status: 429,
        gatewayStatus: 429,
        error: detail || 'The AI service is busy. Please try again in a minute.',
      };
    }
    return {
      ok: false,
      status: res.status >= 500 ? 502 : 500,
      gatewayStatus: res.status,
      error: 'The AI service could not be reached. Please try again.',
    };
  }

  const body = await res.json().catch(() => null);
  const content: string = body?.choices?.[0]?.message?.content ?? '';
  const parsed = content ? extractJson(content) : null;
  if (!parsed) {
    return { ok: false, status: 422, raw: content, error: 'The AI reply could not be read.' };
  }
  return { ok: true, data: parsed, raw: content };
}
