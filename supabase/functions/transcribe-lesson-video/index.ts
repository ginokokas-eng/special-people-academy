import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

/**
 * transcribe-lesson-video
 *
 * Accepts a 16 kHz mono WAV (extracted from the lesson video IN THE BROWSER —
 * the video itself is never sent here, it is far past the STT body ceiling) and
 * returns a transcript plus timestamped segments when the model produced real
 * timings. Nothing is written to the database: the author reviews and confirms
 * in the editor first.
 *
 * Auth: ops_training_admin only (checked with the caller's JWT).
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const MAX_BYTES = 24 * 1024 * 1024; // stay under the ~26 MiB gateway ceiling
const MAX_SECONDS = 20 * 60;
/** OpenAI-route output ceiling; near it, output may have been silently cut. */
const OUTPUT_TOKEN_CEILING = 2048;

interface Segment {
  start_s: number;
  end_s: number | null;
  text: string;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/** WAV duration from the fmt/data chunks — no decoding. */
function wavDurationSeconds(bytes: Uint8Array): number | null {
  try {
    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    if (String.fromCharCode(...bytes.slice(0, 4)) !== 'RIFF') return null;
    let offset = 12;
    let byteRate = 0;
    while (offset + 8 <= bytes.length) {
      const id = String.fromCharCode(...bytes.slice(offset, offset + 4));
      const size = view.getUint32(offset + 4, true);
      if (id === 'fmt ') byteRate = view.getUint32(offset + 16, true);
      if (id === 'data' && byteRate > 0) return size / byteRate;
      offset += 8 + size + (size % 2);
    }
    return null;
  } catch {
    return null;
  }
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function wordsPerSecond(text: string, duration: number | null): number | null {
  if (!duration || duration <= 0) return null;
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return words / duration;
}

/** Pulls the first JSON object/array out of a model reply that may be fenced. */
function extractJson(raw: string): unknown | null {
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

function normaliseSegments(value: unknown): Segment[] | null {
  if (!Array.isArray(value)) return null;
  const out: Segment[] = [];
  for (const raw of value) {
    if (!raw || typeof raw !== 'object') continue;
    const r = raw as Record<string, unknown>;
    const start = Number(r.start_s ?? r.start ?? r.from);
    const endRaw = r.end_s ?? r.end ?? r.to;
    const end = endRaw == null ? null : Number(endRaw);
    const text = typeof r.text === 'string' ? r.text.trim() : '';
    if (!text || !Number.isFinite(start) || start < 0) continue;
    out.push({
      start_s: Math.round(start * 100) / 100,
      end_s: end != null && Number.isFinite(end) && end > start ? Math.round(end * 100) / 100 : null,
      text,
    });
  }
  if (!out.length) return null;
  out.sort((a, b) => a.start_s - b.start_s);
  return out;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ error: 'Not signed in' }, 401);

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claims } = await supabase.auth.getClaims(token);
    const userId = claims?.claims?.sub as string | undefined;
    if (!userId) return json({ error: 'Not signed in' }, 401);

    const { data: isAuthor, error: roleError } = await supabase.rpc('is_ops_training_admin', {
      _user_id: userId,
    });
    if (roleError) throw roleError;
    if (!isAuthor) return json({ error: 'You do not have permission to generate transcripts' }, 403);

    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return json({ error: 'Send the audio as multipart/form-data' }, 400);
    }

    const form = await req.formData();
    const file = form.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return json({ error: 'No audio was received. Please try again.' }, 400);
    }
    if (file.size > MAX_BYTES) {
      return json({ error: 'That audio is too long to transcribe in one go.' }, 400);
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const duration = wavDurationSeconds(bytes);
    if (duration != null && duration > MAX_SECONDS) {
      return json({ error: 'Audio longer than 20 minutes cannot be transcribed.' }, 400);
    }

    const apiKey = Deno.env.get('LOVABLE_API_KEY');
    if (!apiKey) return json({ error: 'AI is not configured for this workspace.' }, 500);

    let transcriptText = '';
    let segments: Segment[] | null = null;
    let possiblyTruncated = false;
    let truncationReason: string | null = null;

    // Preferred route: Gemini chat with audio input. It exposes finish_reason
    // (so truncation is detectable) and can return real timings.
    const chatRes = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'google/gemini-3.7-flash',
        messages: [
          {
            role: 'system',
            content:
              'You transcribe UK healthcare training audio verbatim in British English. Return ONLY JSON: {"transcript_text": string, "segments": [{"start_s": number, "end_s": number, "text": string}]}. Segment timings must be the real spoken times taken from the audio. If you cannot determine real timings, return "segments": null. Never invent timings and never summarise.',
          },
          {
            role: 'user',
            content: [
              { type: 'text', text: 'Transcribe this lesson audio.' },
              { type: 'input_audio', input_audio: { data: toBase64(bytes), format: 'wav' } },
            ],
          },
        ],
      }),
    });

    if (chatRes.ok) {
      const data = await chatRes.json();
      const choice = data?.choices?.[0];
      const content: string = choice?.message?.content ?? '';
      const parsed = extractJson(content) as Record<string, unknown> | null;
      if (parsed && typeof parsed.transcript_text === 'string') {
        transcriptText = parsed.transcript_text.trim();
        segments = normaliseSegments(parsed.segments);
      } else if (content.trim()) {
        transcriptText = content.trim();
      }
      const finish = choice?.finish_reason;
      if (finish && finish !== 'stop') {
        possiblyTruncated = true;
        truncationReason = 'The model stopped early, so the ending may be missing.';
      }
    } else {
      const detail = await chatRes.text().catch(() => '');
      console.error('Gemini transcription route failed:', chatRes.status, detail);
      if (chatRes.status === 429 || chatRes.status === 402 || chatRes.status === 403) {
        return json({ error: detail || 'Transcription is unavailable right now.' }, chatRes.status);
      }
    }

    // Fallback: dedicated OpenAI-compatible transcription route (text only).
    if (!transcriptText) {
      const upstream = new FormData();
      upstream.append('model', 'openai/gpt-4o-transcribe');
      upstream.append('file', new Blob([bytes], { type: 'audio/wav' }), 'lesson-audio.wav');
      const sttRes = await fetch('https://ai.gateway.lovable.dev/v1/audio/transcriptions', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: upstream,
      });
      if (!sttRes.ok) {
        const detail = await sttRes.text().catch(() => '');
        console.error('Transcription failed:', sttRes.status, detail);
        return json(
          { error: detail || 'Transcription failed. Please try again.' },
          sttRes.status >= 400 && sttRes.status < 600 ? sttRes.status : 500
        );
      }
      const sttData = await sttRes.json();
      transcriptText = (sttData?.text ?? '').trim();
      segments = null; // this route cannot give trustworthy timings
      const outputTokens = Number(sttData?.usage?.output_tokens ?? 0);
      if (outputTokens && outputTokens >= OUTPUT_TOKEN_CEILING - 32) {
        possiblyTruncated = true;
        truncationReason = 'The transcript reached the model output limit and may be cut short.';
      }
    }

    if (!transcriptText) {
      return json({ error: 'No speech was detected in this video.' }, 422);
    }

    // Implausibly few words for the audio length = probably cut short.
    const wps = wordsPerSecond(transcriptText, duration);
    if (wps != null && wps < 1.5) {
      possiblyTruncated = true;
      truncationReason =
        truncationReason ??
        'The transcript looks short for the length of this video — please check the ending.';
    }

    return json({
      transcript_text: transcriptText,
      segments,
      possibly_truncated: possiblyTruncated,
      truncation_reason: truncationReason,
      duration_seconds: duration,
    });
  } catch (error) {
    console.error('transcribe-lesson-video error:', error);
    return json({ error: 'Unable to generate a transcript right now.' }, 500);
  }
});
