import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface AssistantRequest {
  course_id: string;
  message: string;
}

Deno.serve(async (req: Request): Promise<Response> => {
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
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return json({ error: "Invalid or expired token" }, 401);
    }

    const body = (await req.json()) as AssistantRequest;
    const course_id = (body.course_id || "").trim();
    const message = (body.message || "").trim();

    if (!course_id || !message) {
      return json({ error: "Missing course_id or message" }, 400);
    }
    if (message.length > 2000) {
      return json({ error: "Message is too long" }, 400);
    }

    // Authorisation: enrolled learner or staff/trainer/admin
    const { data: enrollment } = await supabaseAdmin
      .from("enrollments")
      .select("id")
      .eq("user_id", user.id)
      .eq("course_id", course_id)
      .maybeSingle();

    let isStaff = false;
    if (!enrollment) {
      const { data: roles } = await supabaseAdmin
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id);
      isStaff = (roles || []).some((r: { role: string }) =>
        ["super_admin", "admin", "ops_training_admin", "trainer"].includes(r.role)
      );
    }

    if (!enrollment && !isStaff) {
      return json({ error: "You must be enrolled in this course to use the assistant" }, 403);
    }

    // Gather course-grounded context
    const { data: course } = await supabaseAdmin
      .from("courses")
      .select("id, title, subtitle, description, overview, category, level")
      .eq("id", course_id)
      .single();

    if (!course) {
      return json({ error: "Course not found" }, 404);
    }

    const [{ data: modules }, { data: lessons }, { data: resources }] = await Promise.all([
      supabaseAdmin.from("modules").select("id, title, order_index").eq("course_id", course_id).order("order_index"),
      supabaseAdmin
        .from("lessons")
        .select("id, title, description, lesson_type, duration_minutes, module_id, order_index")
        .eq("course_id", course_id)
        .order("order_index"),
      supabaseAdmin
        .from("course_resources")
        .select("id, title, description, resource_type, lesson_id")
        .eq("course_id", course_id),
    ]);

    const moduleMap = new Map((modules || []).map((m: any) => [m.id, m.title]));

    const lessonLines = (lessons || []).map((l: any) => {
      const mod = l.module_id ? moduleMap.get(l.module_id) : null;
      const parts = [
        `- Lesson "${l.title}" [type: ${l.lesson_type}${l.duration_minutes ? `, ${l.duration_minutes} min` : ""}${mod ? `, module: ${mod}` : ""}]`,
      ];
      if (l.description) parts.push(`  Summary: ${l.description}`);
      return parts.join("\n");
    });

    const resourceLines = (resources || []).map((r: any) => {
      const scope = r.lesson_id ? "lesson resource" : "course resource";
      return `- Resource "${r.title}" [${r.resource_type}, ${scope}]${r.description ? `: ${r.description}` : ""}`;
    });

    const courseContext = [
      `COURSE: ${course.title}${course.subtitle ? ` — ${course.subtitle}` : ""}`,
      course.category ? `Category: ${course.category}` : "",
      course.level ? `Level: ${course.level}` : "",
      course.description ? `Description: ${course.description}` : "",
      course.overview ? `Overview: ${course.overview}` : "",
      "",
      "MODULES & LESSONS:",
      lessonLines.length ? lessonLines.join("\n") : "(no lessons listed)",
      "",
      "RESOURCES:",
      resourceLines.length ? resourceLines.join("\n") : "(no resources listed)",
    ]
      .filter(Boolean)
      .join("\n");

    const systemPrompt = `You are the course assistant for Special People Training Academy, a care-training platform.

STRICT GROUNDING RULES:
- Answer ONLY using the COURSE CONTEXT provided below (course description, modules, lessons, and resource metadata).
- If the answer is not contained in the course context, say you can only help with content from this course and suggest the learner review the relevant lesson or contact their trainer.
- Where possible, cite the specific lesson or resource you are drawing from by name (e.g., 'See the lesson "..."').
- Keep answers concise, supportive, and professional.

YOU MUST REFUSE and redirect to a qualified trainer/clinician for:
- Medical advice, diagnosis, or treatment decisions.
- Specific dosing, prescribing, or direct hands-on care instructions beyond what the course teaches.
- Policy decisions or anything requiring clinical judgement outside this course.
- Any claim not supported by the course content.

When refusing, briefly explain why and point the learner to their trainer or the course's safety guidance.

COURSE CONTEXT:
${courseContext}`;

    const aiResp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${lovableApiKey}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: message },
        ],
        temperature: 0.2,
      }),
    });

    if (aiResp.status === 429) {
      return json({ error: "The assistant is busy right now. Please try again in a moment." }, 429);
    }
    if (aiResp.status === 402) {
      return json({ error: "AI usage limit reached. Please contact your administrator." }, 402);
    }
    if (!aiResp.ok) {
      const t = await aiResp.text();
      console.error("AI gateway error:", aiResp.status, t);
      return json({ error: "The assistant is unavailable right now." }, 502);
    }

    const aiData = await aiResp.json();
    const answer = aiData?.choices?.[0]?.message?.content ?? "I couldn't generate a response.";

    return json({ answer }, 200);
  } catch (error: unknown) {
    console.error("Error in course-assistant:", error);
    const messageStr = error instanceof Error ? error.message : "Internal server error";
    return json({ error: messageStr }, 500);
  }
});

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
