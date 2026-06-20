import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const VIDEO_EXT = [".mp4", ".webm", ".m4v", ".mov", ".ogg"];

const uuidRegex =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isVideo(name: string): boolean {
  const lower = name.toLowerCase();
  return VIDEO_EXT.some((ext) => lower.endsWith(ext));
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("authorization");
    const bearerToken = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : null;
    if (!bearerToken) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify the caller and require an admin role.
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: `Bearer ${bearerToken}` } },
    });
    const {
      data: { user },
      error: authError,
    } = await userClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roleData } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id);
    const roles = (roleData || []).map((r: { role: string }) => r.role);
    const isAdmin =
      roles.includes("admin") ||
      roles.includes("super_admin") ||
      roles.includes("ops_training_admin") ||
      roles.includes("trainer");
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "Access denied" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json().catch(() => ({}));
    const packageId: string = body?.package_id ?? "";
    if (!uuidRegex.test(packageId)) {
      return new Response(JSON.stringify({ error: "Invalid package ID" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Look for a video file at the package root, then one level deep.
    const findVideo = async (prefix: string): Promise<string | null> => {
      const { data, error } = await adminClient.storage
        .from("scorm-extracted")
        .list(prefix, { limit: 1000 });
      if (error || !data) return null;
      const direct = data.find((f) => f.id && isVideo(f.name));
      if (direct) return `${prefix}/${direct.name}`;
      // Recurse into folders (one level) for nested media.
      const folders = data.filter((f) => !f.id);
      for (const folder of folders) {
        const nested = await adminClient.storage
          .from("scorm-extracted")
          .list(`${prefix}/${folder.name}`, { limit: 1000 });
        const hit = nested.data?.find((f) => f.id && isVideo(f.name));
        if (hit) return `${prefix}/${folder.name}/${hit.name}`;
      }
      return null;
    };

    const videoPath = await findVideo(packageId);
    if (!videoPath) {
      return new Response(
        JSON.stringify({ error: "No video file found in package" }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const { data: signed, error: signError } = await adminClient.storage
      .from("scorm-extracted")
      .createSignedUrl(videoPath, 300);
    if (signError || !signed?.signedUrl) {
      return new Response(
        JSON.stringify({ error: "Could not sign media URL" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({ url: signed.signedUrl, file: videoPath }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (err) {
    console.error("scorm-media-probe error:", err);
    return new Response(JSON.stringify({ error: "Unexpected error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
