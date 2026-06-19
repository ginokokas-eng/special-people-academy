import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isValidUUID(uuid: unknown): uuid is string {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof uuid === 'string' && uuidRegex.test(uuid);
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const supabaseAnon = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await supabaseAnon.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const userId = claimsData.claims.sub as string;

    const admin = createClient(supabaseUrl, serviceKey);

    // Authorize: only training admins / trainers
    const { data: roles } = await admin
      .from('user_roles')
      .select('role')
      .eq('user_id', userId);
    const allowed = ['super_admin', 'admin', 'ops_training_admin', 'trainer'];
    if (!roles?.some(r => allowed.includes(r.role as string))) {
      return new Response(JSON.stringify({ error: 'Forbidden' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let body: { course_id?: unknown };
    try { body = await req.json(); } catch { body = {}; }
    const { course_id } = body;
    if (!isValidUUID(course_id)) {
      return new Response(JSON.stringify({ error: 'Invalid course_id' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Course
    const { data: course } = await admin
      .from('courses')
      .select('id, title, certificate_expiry_months')
      .eq('id', course_id)
      .single();
    if (!course) {
      return new Response(JSON.stringify({ error: 'Course not found' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Lessons
    const { data: lessons } = await admin
      .from('lessons')
      .select('id, title, lesson_type')
      .eq('course_id', course_id);
    const lessonIds = (lessons || []).map(l => l.id);
    const totalLessons = lessonIds.length;

    // Final quiz: prefer a lesson whose title mentions "final", else the quiz with most questions
    const quizLessonIds = (lessons || []).filter(l => l.lesson_type === 'quiz').map(l => l.id);
    let finalQuizId: string | null = null;
    let finalQuizPass = 80;
    let finalQuizAttemptsAllowed: number | null = null;
    if (quizLessonIds.length > 0) {
      const { data: quizzes } = await admin
        .from('quizzes')
        .select('id, lesson_id, passing_score, attempts_allowed')
        .in('lesson_id', quizLessonIds);
      if (quizzes && quizzes.length > 0) {
        const finalLesson = (lessons || []).find(
          l => l.lesson_type === 'quiz' && /final/i.test(l.title),
        );
        const chosen =
          (finalLesson && quizzes.find(q => q.lesson_id === finalLesson.id)) ||
          quizzes.find(q => (q.attempts_allowed ?? 0) > 0) ||
          quizzes[0];
        if (chosen) {
          finalQuizId = chosen.id;
          finalQuizPass = chosen.passing_score ?? 80;
          finalQuizAttemptsAllowed = chosen.attempts_allowed ?? null;
        }
      }
    }

    // Enrollments
    const { data: enrollments } = await admin
      .from('enrollments')
      .select('user_id, completed_at')
      .eq('course_id', course_id);
    const userIds = [...new Set((enrollments || []).map(e => e.user_id))];

    if (userIds.length === 0) {
      return new Response(JSON.stringify({ course, finalQuizPass, finalQuizAttemptsAllowed, rows: [] }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Profiles
    const { data: profiles } = await admin
      .from('profiles')
      .select('user_id, full_name')
      .in('user_id', userIds);
    const profileMap = new Map((profiles || []).map(p => [p.user_id, p.full_name]));

    // Lesson progress
    const { data: progress } = lessonIds.length
      ? await admin.from('lesson_progress').select('user_id, lesson_id, completed').in('user_id', userIds).in('lesson_id', lessonIds)
      : { data: [] as any[] };
    const progressByUser = new Map<string, number>();
    for (const p of progress || []) {
      if (p.completed) progressByUser.set(p.user_id, (progressByUser.get(p.user_id) || 0) + 1);
    }

    // Final quiz attempts
    const attemptsByUser = new Map<string, { best: number; count: number; passed: boolean }>();
    if (finalQuizId) {
      const { data: attempts } = await admin
        .from('quiz_attempts')
        .select('user_id, score, passed')
        .eq('quiz_id', finalQuizId)
        .in('user_id', userIds);
      for (const a of attempts || []) {
        const cur = attemptsByUser.get(a.user_id) || { best: 0, count: 0, passed: false };
        cur.count += 1;
        cur.best = Math.max(cur.best, a.score ?? 0);
        cur.passed = cur.passed || !!a.passed;
        attemptsByUser.set(a.user_id, cur);
      }
    }

    // Certificates (completion + competency)
    const { data: certs } = await admin
      .from('certificates')
      .select('user_id, certificate_number, certificate_type, issued_at, competency_signed_at, competency_signed_by')
      .eq('course_id', course_id)
      .in('user_id', userIds);
    const completionCert = new Map<string, any>();
    const competencyCert = new Map<string, any>();
    for (const c of certs || []) {
      if (c.certificate_type === 'competency') competencyCert.set(c.user_id, c);
      else completionCert.set(c.user_id, c);
    }

    // Practical / competency sign-offs
    const { data: signoffs } = await admin
      .from('competency_signoffs')
      .select('user_id, outcome, signed_off_at, assessor_id')
      .eq('course_id', course_id)
      .in('user_id', userIds);
    const signoffMap = new Map<string, any>();
    for (const s of signoffs || []) signoffMap.set(s.user_id, s);

    const expiryMonths = course.certificate_expiry_months as number | null;
    const computeExpiry = (issuedAt: string | null) => {
      if (!issuedAt || !expiryMonths) return null;
      const d = new Date(issuedAt);
      d.setMonth(d.getMonth() + expiryMonths);
      return d.toISOString();
    };

    const rows = userIds.map(uid => {
      const att = attemptsByUser.get(uid);
      const comp = completionCert.get(uid);
      const competency = competencyCert.get(uid);
      const signoff = signoffMap.get(uid);
      return {
        user_id: uid,
        full_name: profileMap.get(uid) || null,
        lessons_completed: progressByUser.get(uid) || 0,
        lessons_total: totalLessons,
        final_quiz_best_score: att ? att.best : null,
        final_quiz_attempts_used: att ? att.count : 0,
        final_quiz_attempts_allowed: finalQuizAttemptsAllowed,
        final_quiz_passed: att ? att.passed : false,
        completion_certificate_number: comp?.certificate_number || null,
        completion_certificate_issued_at: comp?.issued_at || null,
        completion_certificate_expires_at: computeExpiry(comp?.issued_at || null),
        practical_signoff_outcome: signoff?.outcome || null,
        practical_signoff_at: signoff?.signed_off_at || null,
        competency_certificate_number: competency?.certificate_number || null,
        competency_certificate_issued_at: competency?.issued_at || competency?.competency_signed_at || null,
      };
    });

    rows.sort((a, b) => (a.full_name || '').localeCompare(b.full_name || ''));

    return new Response(JSON.stringify({ course, finalQuizPass, finalQuizAttemptsAllowed, rows }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('course-progress-report error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
