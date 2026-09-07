import fs from 'node:fs';
import { request as playwrightRequest, type APIRequestContext } from '@playwright/test';
import { supabaseAnonKey, supabaseUrl } from './env';

/**
 * Reads the Supabase access token out of a saved Playwright storageState.
 * Auth is localStorage-based (`sb-<ref>-auth-token`), so the token travels with
 * the state file the setup project wrote.
 */
export function accessTokenFromState(statePath: string): string {
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8')) as {
    origins?: { localStorage?: { name: string; value: string }[] }[];
  };
  for (const origin of state.origins ?? []) {
    for (const item of origin.localStorage ?? []) {
      if (!/^sb-.*-auth-token$/.test(item.name)) continue;
      const parsed = JSON.parse(item.value) as { access_token?: string };
      if (parsed.access_token) return parsed.access_token;
    }
  }
  throw new Error(`No Supabase session found in ${statePath} — re-run: npm run test:e2e:setup`);
}

/** An authenticated REST/RPC context for the given saved session. */
export async function apiFor(statePath: string): Promise<APIRequestContext> {
  const token = accessTokenFromState(statePath);
  return playwrightRequest.newContext({
    baseURL: supabaseUrl(),
    extraHTTPHeaders: {
      apikey: supabaseAnonKey(),
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}

/** Calls a Postgres function through the Data API and returns its JSON result. */
export async function rpc<T = unknown>(
  api: APIRequestContext,
  name: string,
  body: Record<string, unknown> = {},
): Promise<T> {
  const res = await api.post(`/rest/v1/rpc/${name}`, { data: body });
  const text = await res.text();
  if (!res.ok()) throw new Error(`rpc ${name} failed (${res.status()}): ${text}`);
  return (text ? JSON.parse(text) : null) as T;
}

/** Reads rows through the Data API (used only to resolve ids for later specs). */
export async function select<T = unknown>(
  api: APIRequestContext,
  pathAndQuery: string,
): Promise<T[]> {
  const res = await api.get(`/rest/v1/${pathAndQuery}`);
  const text = await res.text();
  if (!res.ok()) throw new Error(`select ${pathAndQuery} failed (${res.status()}): ${text}`);
  return JSON.parse(text) as T[];
}
