import { SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

/**
 * Spaced refreshers for a single learner, for Ariadne to poll and push from.
 *
 * Calling get_due_refreshers with the service role also materialises any due
 * refresher (draws and snapshots its three questions), so a poll is what makes
 * a refresher answerable — this app never schedules email or push itself.
 */
export async function handleRefreshers(
  admin: SupabaseClient,
  url: URL,
  origin: string,
  json: (body: unknown, status?: number) => Response,
) {
  const email = url.searchParams.get('email')?.trim().toLowerCase();
  const fountainId = url.searchParams.get('fountain_applicant_id')?.trim();
  const externalId = url.searchParams.get('external_id')?.trim();
  const ariadneId = url.searchParams.get('ariadne_user_id')?.trim();

  if (!email && !fountainId && !externalId && !ariadneId) {
    return json(
      { error: 'Provide email, fountain_applicant_id, external_id or ariadne_user_id' },
      400,
    );
  }

  let userId: string | null = null;

  if (fountainId || externalId || ariadneId) {
    const column = fountainId
      ? 'fountain_applicant_id'
      : externalId
        ? 'external_id'
        : 'ariadne_user_id';
    const value = fountainId ?? externalId ?? ariadneId!;
    const { data } = await admin
      .from('profiles')
      .select('user_id')
      .eq(column, value)
      .maybeSingle();
    userId = data?.user_id ?? null;
  }

  if (!userId && email) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const match = (list?.users ?? []).find((u) => u.email?.toLowerCase() === email);
    userId = match?.id ?? null;
  }

  if (!userId) return json({ error: 'Learner not found' }, 404);

  const { data, error } = await admin.rpc('get_due_refreshers', { _user: userId });
  if (error) return json({ error: error.message }, 500);

  type Row = {
    schedule_id: string;
    course_id: string;
    course_title: string | null;
    kind: string;
    due_at: string;
    status: string;
    question_count: number;
  };
  const rows = (data ?? []) as Row[];
  const now = Date.now();

  const due = rows
    .filter(
      (r) =>
        r.status === 'ready' && r.question_count > 0 && new Date(r.due_at).getTime() <= now,
    )
    .map((r) => ({
      schedule_id: r.schedule_id,
      course_id: r.course_id,
      course_title: r.course_title,
      kind: r.kind,
      due_at: r.due_at,
      deep_link: `${origin}/refresher/${r.schedule_id}`,
    }));

  const nextDue = rows
    .filter((r) => r.status === 'pending' && new Date(r.due_at).getTime() > now)
    .map((r) => r.due_at)
    .sort()[0] ?? null;

  return json({ user_id: userId, due, next_due_at: nextDue });
}
