/**
 * SSO security-invariant tests — run against the DEPLOYED sso-from-ariadne
 * edge function. These lock in the auth hygiene: no token, malformed tokens,
 * algorithm-confusion (HS256 against an asymmetric verifier), alg:none, and
 * wrong HTTP method must all be rejected WITHOUT leaking why.
 *
 *   deno test --allow-net tests/sso/sso-security.test.ts
 *
 * Override the target with SSO_FN_URL for a different project.
 */
import { assertEquals, assert } from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { encodeBase64Url } from 'https://deno.land/std@0.224.0/encoding/base64url.ts';

const FN = Deno.env.get('SSO_FN_URL') ??
  'https://qyroautvyzfsgtgwjcur.supabase.co/functions/v1/sso-from-ariadne';
const ARIADNE_ISS = 'https://hbklqmoywlxbjvpxsxyc.supabase.co/auth/v1';

const je = (o: unknown) => encodeBase64Url(new TextEncoder().encode(JSON.stringify(o)));
const claims = (over: Record<string, unknown> = {}) => ({
  iss: ARIADNE_ISS, aud: 'authenticated', role: 'authenticated',
  sub: '11111111-1111-1111-1111-111111111111', exp: 9_999_999_999,
  email: 'attacker@evil.example', ...over,
});

async function post(headers: HeadersInit, body: unknown = { nonce: 'test-nonce' }) {
  const res = await fetch(FN, { method: 'POST', headers: { 'Content-Type': 'application/json', ...headers }, body: JSON.stringify(body) });
  const text = await res.text();
  return { status: res.status, text };
}

Deno.test('rejects a request with no Authorization header (401)', async () => {
  assertEquals((await post({})).status, 401);
});

Deno.test('rejects a malformed bearer token (401)', async () => {
  assertEquals((await post({ Authorization: 'Bearer not.a.jwt' })).status, 401);
});

Deno.test('rejects an HS256-forged token — algorithm confusion (401)', async () => {
  const h = je({ alg: 'HS256', typ: 'JWT' });
  const p = je(claims());
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('secret'),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = encodeBase64Url(new Uint8Array(
    await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(`${h}.${p}`))));
  const { status, text } = await post({ Authorization: `Bearer ${h}.${p}.${sig}` });
  assertEquals(status, 401);
  // Error body must NOT reveal the reason (no "hs256", "algorithm", "signature").
  assert(!/hs256|algorithm|signature|kid/i.test(text), `leaked detail: ${text}`);
});

Deno.test('rejects an alg:none token (401)', async () => {
  const t = `${je({ alg: 'none', typ: 'JWT' })}.${je(claims())}.`;
  assertEquals((await post({ Authorization: `Bearer ${t}` })).status, 401);
});

Deno.test('rejects a well-formed token from the WRONG issuer (401)', async () => {
  // Structurally valid ES256-ish shape but bogus signature + foreign issuer.
  const t = `${je({ alg: 'ES256', typ: 'JWT', kid: 'x' })}.${je(claims({ iss: 'https://evil.example/auth/v1' }))}.${je('nope')}`;
  assertEquals((await post({ Authorization: `Bearer ${t}` })).status, 401);
});

Deno.test('rejects GET (405)', async () => {
  const res = await fetch(FN, { method: 'GET' });
  assertEquals(res.status, 405);
});

Deno.test('error responses are generic (no enumeration of internal state)', async () => {
  const { text } = await post({ Authorization: 'Bearer not.a.jwt' });
  assert(!/stack|supabase|postgres|jwks|internal/i.test(text), `leaked internals: ${text}`);
});
