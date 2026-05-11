import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roleCheck } = await admin
      .from("user_roles")
      .select("role")
      .eq("user_id", userData.user.id);
    const callerRoles = (roleCheck ?? []).map((r) => r.role);
    const isAdmin = callerRoles.some((r) =>
      ["super_admin", "admin", "ops_training_admin"].includes(r),
    );
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get all learner role user_ids
    const { data: learnerRoles, error: lrErr } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("role", "learner");
    if (lrErr) throw lrErr;
    const learnerIds = Array.from(
      new Set((learnerRoles ?? []).map((r) => r.user_id)),
    );

    if (learnerIds.length === 0) {
      return new Response(JSON.stringify({ learners: [] }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Profiles
    const { data: profiles } = await admin
      .from("profiles")
      .select(
        "user_id, full_name, source_system, fountain_applicant_id, created_at",
      )
      .in("user_id", learnerIds);

    // Enrollments count per user
    const { data: enrollments } = await admin
      .from("enrollments")
      .select("user_id, completed_at")
      .in("user_id", learnerIds);

    // Certificates count per user
    const { data: certificates } = await admin
      .from("certificates")
      .select("user_id")
      .in("user_id", learnerIds);

    // Emails via Admin API (paginated)
    const emailMap = new Map<string, { email: string; last_sign_in_at: string | null; created_at: string }>();
    let page = 1;
    const perPage = 200;
    while (true) {
      const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
      if (error) break;
      for (const u of data.users) {
        emailMap.set(u.id, {
          email: u.email ?? "",
          last_sign_in_at: u.last_sign_in_at ?? null,
          created_at: u.created_at,
        });
      }
      if (data.users.length < perPage) break;
      page += 1;
      if (page > 50) break; // safety cap
    }

    const enrollByUser = new Map<string, { total: number; completed: number }>();
    for (const e of enrollments ?? []) {
      const cur = enrollByUser.get(e.user_id) ?? { total: 0, completed: 0 };
      cur.total += 1;
      if (e.completed_at) cur.completed += 1;
      enrollByUser.set(e.user_id, cur);
    }
    const certByUser = new Map<string, number>();
    for (const c of certificates ?? []) {
      certByUser.set(c.user_id, (certByUser.get(c.user_id) ?? 0) + 1);
    }
    const profileByUser = new Map(
      (profiles ?? []).map((p) => [p.user_id, p] as const),
    );

    const learners = learnerIds.map((id) => {
      const p = profileByUser.get(id);
      const a = emailMap.get(id);
      const en = enrollByUser.get(id) ?? { total: 0, completed: 0 };
      return {
        user_id: id,
        email: a?.email ?? "",
        full_name: p?.full_name ?? "",
        source_system: p?.source_system ?? null,
        fountain_applicant_id: p?.fountain_applicant_id ?? null,
        created_at: p?.created_at ?? a?.created_at ?? null,
        last_sign_in_at: a?.last_sign_in_at ?? null,
        enrollments_total: en.total,
        enrollments_completed: en.completed,
        certificates_count: certByUser.get(id) ?? 0,
      };
    });

    return new Response(JSON.stringify({ learners }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("list-learners error", err);
    return new Response(
      JSON.stringify({ error: err instanceof Error ? err.message : "Unknown" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
