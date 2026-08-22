import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

/** Signed-URL TTL. Long enough for a full lesson video, short enough to matter. */
const TTL_SECONDS = 60 * 60;
const BUCKET = "lesson-media";
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Paths are always {course_id}/{lesson_id}/{uuid}.{ext} — nothing else is signed. */
function isValidPath(path: string): boolean {
  if (path.includes("..") || path.startsWith("/")) return false;
  const parts = path.split("/");
  if (parts.length !== 3) return false;
  const [courseId, lessonId, file] = parts;
  if (!UUID_RE.test(courseId) || !UUID_RE.test(lessonId)) return false;
  return /^[0-9a-f-]{36}\.[a-z0-9]{2,5}$/i.test(file);
}

serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: claims, error: claimsError } = await supabaseUser.auth.getClaims();
    const userId = claims?.claims?.sub as string | undefined;
    if (claimsError || !userId) {
      return json({ error: "Invalid or expired token" }, 401);
    }

    const body = await req.json().catch(() => ({}));
    const path = typeof body?.path === "string" ? body.path : "";
    if (!isValidPath(path)) {
      return json({ error: "Invalid media path" }, 400);
    }
    const courseId = path.split("/")[0];

    const { data: isAdmin } = await supabaseAdmin.rpc("is_ops_training_admin", {
      _user_id: userId,
    });

    let allowed = isAdmin === true;
    if (!allowed) {
      const { data: enrolled } = await supabaseAdmin.rpc("is_enrolled", {
        _user_id: userId,
        _course_id: courseId,
      });
      allowed = enrolled === true;
    }

    if (!allowed) {
      return json({ error: "You must be enrolled in this course to watch this video" }, 403);
    }

    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET)
      .createSignedUrl(path, TTL_SECONDS);

    if (error || !data?.signedUrl) {
      console.error("createSignedUrl failed", error);
      return json({ error: "Video not available" }, 404);
    }

    return json({ url: data.signedUrl, expires_in: TTL_SECONDS }, 200);
  } catch (error: unknown) {
    console.error("Error in lesson-media-url:", error);
    return json({ error: "Internal server error" }, 500);
  }
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
