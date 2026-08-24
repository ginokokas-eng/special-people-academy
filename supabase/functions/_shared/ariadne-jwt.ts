// Verification of Ariadne-issued Supabase access tokens.
//
// Asymmetric verification only, against Ariadne's public JWKS. Issuer and
// audience are pinned; HS*/none are rejected outright. The JWKS is cached for a
// short TTL and verification FAILS CLOSED when the JWKS cannot be fetched.

import {
  ARIADNE_ALLOWED_ALGS,
  ARIADNE_AUDIENCE,
  ARIADNE_ISSUER,
  ARIADNE_JWKS_URL,
} from './ariadne.ts';

const JWKS_TTL_MS = 5 * 60 * 1000;

interface Jwk {
  kid?: string;
  alg?: string;
  kty?: string;
  crv?: string;
  n?: string;
  e?: string;
  x?: string;
  y?: string;
  use?: string;
}

let cache: { keys: Jwk[]; fetchedAt: number } | null = null;

async function getJwks(forceRefresh = false): Promise<Jwk[]> {
  const fresh = cache && Date.now() - cache.fetchedAt < JWKS_TTL_MS;
  if (fresh && !forceRefresh) return cache!.keys;

  const res = await fetch(ARIADNE_JWKS_URL, { headers: { accept: 'application/json' } });
  if (!res.ok) throw new Error(`jwks_fetch_failed:${res.status}`);
  const body = await res.json();
  const keys: Jwk[] = Array.isArray(body?.keys) ? body.keys : [];
  if (keys.length === 0) throw new Error('jwks_empty');
  cache = { keys, fetchedAt: Date.now() };
  return keys;
}

function b64urlToBytes(input: string): Uint8Array {
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
  const raw = atob(padded);
  const bytes = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

function decodeJson(segment: string): Record<string, unknown> {
  return JSON.parse(new TextDecoder().decode(b64urlToBytes(segment)));
}

function algParams(alg: string): { importAlg: RsaHashedImportParams | EcKeyImportParams; verifyAlg: AlgorithmIdentifier | EcdsaParams } {
  if (alg === 'RS256') {
    return {
      importAlg: { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      verifyAlg: { name: 'RSASSA-PKCS1-v1_5' },
    };
  }
  return {
    importAlg: { name: 'ECDSA', namedCurve: 'P-256' },
    verifyAlg: { name: 'ECDSA', hash: 'SHA-256' },
  };
}

export interface AriadneClaims {
  sub: string;
  iat: number;
  exp: number;
  email?: string;
  user_metadata?: Record<string, unknown>;
  app_metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/**
 * Verifies an Ariadne access token. Throws with a short machine code on any
 * failure — callers must translate that into a generic client error.
 */
export async function verifyAriadneToken(token: string): Promise<AriadneClaims> {
  const parts = token.split('.');
  if (parts.length !== 3) throw new Error('token_malformed');

  const header = decodeJson(parts[0]) as { alg?: string; kid?: string; typ?: string };
  const alg = header.alg ?? '';
  if (!(ARIADNE_ALLOWED_ALGS as readonly string[]).includes(alg)) {
    throw new Error(`alg_not_allowed:${alg || 'none'}`);
  }
  if (!header.kid) throw new Error('kid_missing');

  let keys = await getJwks();
  let jwk = keys.find((k) => k.kid === header.kid);
  if (!jwk) {
    // Possible key rotation — one forced refresh, then fail closed.
    keys = await getJwks(true);
    jwk = keys.find((k) => k.kid === header.kid);
  }
  if (!jwk) throw new Error('kid_unknown');
  if (jwk.alg && jwk.alg !== alg) throw new Error('alg_mismatch');

  const { importAlg, verifyAlg } = algParams(alg);
  const key = await crypto.subtle.importKey('jwk', jwk as JsonWebKey, importAlg, false, ['verify']);

  const signature = b64urlToBytes(parts[2]);
  const signed = new TextEncoder().encode(`${parts[0]}.${parts[1]}`);
  const valid = await crypto.subtle.verify(verifyAlg, key, signature, signed);
  if (!valid) throw new Error('signature_invalid');

  const claims = decodeJson(parts[1]) as AriadneClaims;

  if (claims.iss !== ARIADNE_ISSUER) throw new Error('iss_mismatch');

  const aud = claims.aud;
  const audOk = Array.isArray(aud) ? aud.includes(ARIADNE_AUDIENCE) : aud === ARIADNE_AUDIENCE;
  if (!audOk) throw new Error('aud_mismatch');

  const nowSec = Math.floor(Date.now() / 1000);
  if (typeof claims.exp !== 'number' || claims.exp <= nowSec) throw new Error('token_expired');
  if (typeof claims.iat !== 'number' || claims.iat > nowSec + 60) throw new Error('iat_invalid');
  if (typeof claims.sub !== 'string' || !claims.sub) throw new Error('sub_missing');

  return claims;
}
