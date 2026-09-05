/**
 * Shared CORS + staff authorisation for edge functions.
 *
 * The caller's token is always passed to getClaims EXPLICITLY — the argless form
 * reads ambient state and must never be used here.
 */
import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

export interface ResolvedUser {
  userId: string;
  client: SupabaseClient;
}

/** Resolves the signed-in user from the Authorization header, or null. */
export async function resolveUser(req: Request): Promise<ResolvedUser | null> {
  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return null;
  const client = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  );
  const token = authHeader.replace('Bearer ', '');
  const { data } = await client.auth.getClaims(token);
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) return null;
  return { userId, client };
}

/** True when this user may author training content. */
export async function requireOpsTrainingAdmin(
  client: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await client.rpc('is_ops_training_admin', { _user_id: userId });
  if (error) {
    console.error('Role check failed:', error.message);
    return false;
  }
  return data === true;
}

/** Service-role client for writes the caller must not be able to forge. */
export function adminClient(): SupabaseClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
}
