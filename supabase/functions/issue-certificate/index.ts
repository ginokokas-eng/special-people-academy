/**
 * issue-certificate — the ONLY path that mints a completion certificate.
 *
 * Completion is re-verified server-side (required-lessons rule + graded quiz
 * gate + practical sign-off gate — same semantics as check-course-completion,
 * which this function supersedes). The client's claim is never trusted.
 *
 * Actions:
 *   default / { course_id }      → verify completion, idempotently issue
 *   { action: 'download', certificate_id } → entitlement-checked signed URL
 *
 * Never logs tokens. Uses getUser(token) explicitly (argless getClaims banned).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });

function isValidUUID(uuid: unknown): uuid is string {
  return typeof uuid === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uuid);
}

function certificateNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SPA-${timestamp}-${random}`;
}

/** 12 chars, non-ambiguous alphabet (no O/0, I/1, etc.), CSPRNG-backed. */
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
function verificationCode(): string {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Missing or invalid authorization header' }, 401);
    }
    const token = authHeader.slice('Bearer '.length);
    const { data: userData, error: userErr } = await admin.auth.getUser(token);
    if (userErr || !userData?.user) return json({ error: 'Unauthorized' }, 401);
    const userId = userData.user.id;

    let body: { course_id?: unknown; action?: unknown; certificate_id?: unknown };
    try {
      body = await req.json();
    } catch {
      return json({ error: 'Invalid JSON body' }, 400);
    }

    /* ------------------------------------------------------------------ *
     * DOWNLOAD — entitlement-checked signed URL. The storage path always
     * comes from the row, never from client input.
     * ------------------------------------------------------------------ */
    if (body.action === 'download') {
      if (!isValidUUID(body.certificate_id)) {
        return json({ error: 'Invalid certificate_id' }, 400);
      }
      const { data: cert } = await admin
        .from('certificates')
        .select('id, user_id, pdf_path')
        .eq('id', body.certificate_id)
        .maybeSingle();
      if (!cert) return json({ error: 'Certificate not found' }, 404);

      let allowed = cert.user_id === userId;
      if (!allowed) {
        const { data: staff } = await admin.rpc('is_platform_staff', { _user_id: userId });
        allowed = staff === true;
      }
      if (!allowed) {
        const { data: orgAdmin } = await admin.rpc('is_org_admin_of_member', {
          _admin: userId,
          _member: cert.user_id,
        });
        allowed = orgAdmin === true;
      }
      if (!allowed) return json({ error: 'Access denied' }, 403);

      let path = cert.pdf_path as string | null;
      if (!path) {
        // Render on demand through the existing generator, then re-read the row.
        await fetch(`${supabaseUrl}/functions/v1/generate-certificate`, {
          method: 'POST',
          headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
          body: JSON.stringify({ certificate_id: cert.id }),
        }).catch(() => undefined);
        const { data: again } = await admin
          .from('certificates')
          .select('pdf_path')
          .eq('id', cert.id)
          .maybeSingle();
        path = (again?.pdf_path as string | null) ?? null;
      }
      if (!path) return json({ error: 'Certificate file is not ready yet' }, 409);

      const { data: signed, error: signErr } = await admin.storage
        .from('certificates')
        .createSignedUrl(path, 300);
      if (signErr || !signed) return json({ error: 'Failed to generate download URL' }, 500);
      return json({ url: signed.signedUrl });
    }

    /* ------------------------------------------------------------------ *
     * ISSUE
     * ------------------------------------------------------------------ */
    const courseId = body.course_id;
    if (!isValidUUID(courseId)) return json({ error: 'Invalid course_id' }, 400);

    // Idempotent: one completion certificate per user × course.
    const { data: existing } = await admin
      .from('certificates')
      .select('id, certificate_number, verification_code, expires_at')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .or('certificate_type.is.null,certificate_type.eq.completion')
      .maybeSingle();

    if (existing) {
      return json({
        completed: true,
        certificate_id: existing.id,
        certificate_number: existing.certificate_number,
        verification_code: existing.verification_code,
        expires_at: existing.expires_at,
        already_issued: true,
        message: 'Certificate already issued',
      });
    }

    const { data: course } = await admin
      .from('courses')
      .select('id, title, requires_practical_signoff, delivery_type, certificate_expiry_months')
      .eq('id', courseId)
      .maybeSingle();
    if (!course) return json({ error: 'Course not found' }, 404);

    const { data: enrollment } = await admin
      .from('enrollments')
      .select('id, licence_seat_id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .maybeSingle();
    if (!enrollment) return json({ completed: false, reason: 'Not enrolled in this course' });

    // --- required lessons (same denominator as src/lib/progress.ts) ---
    const { data: lessons } = await admin
      .from('lessons')
      .select('id, lesson_type, is_required')
      .eq('course_id', courseId);
    const required = (lessons || []).filter((l) => l.is_required === true);
    const { data: progress } = await admin
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', userId)
      .in('lesson_id', required.map((l) => l.id));
    const done = new Set((progress || []).filter((p) => p.completed).map((p) => p.lesson_id));
    const completedCount = required.filter((l) => done.has(l.id)).length;
    if (completedCount < required.length) {
      return json({
        completed: false,
        reason: 'Not all lessons completed',
        progress: { lessons: { completed: completedCount, total: required.length } },
      });
    }

    // --- graded quizzes ---
    const quizLessonIds = (lessons || []).filter((l) => l.lesson_type === 'quiz').map((l) => l.id);
    if (quizLessonIds.length > 0) {
      const { data: quizzes } = await admin
        .from('quizzes')
        .select('id, passing_score')
        .in('lesson_id', quizLessonIds);
      let graded = (quizzes || []).filter((q) => (q.passing_score ?? 0) > 0);
      if (graded.length > 0) {
        const { data: qCounts } = await admin
          .from('quiz_questions')
          .select('quiz_id')
          .in('quiz_id', graded.map((q) => q.id));
        const withQuestions = new Set((qCounts || []).map((q) => q.quiz_id));
        graded = graded.filter((q) => withQuestions.has(q.id));
      }
      if (graded.length > 0) {
        const { data: attempts } = await admin
          .from('quiz_attempts')
          .select('quiz_id')
          .eq('user_id', userId)
          .eq('passed', true)
          .in('quiz_id', graded.map((q) => q.id));
        const passed = new Set((attempts || []).map((a) => a.quiz_id));
        if (!graded.every((q) => passed.has(q.id))) {
          return json({
            completed: false,
            reason: 'Not all quizzes passed',
            progress: { quizzes: { passed: passed.size, total: graded.length } },
          });
        }
      }
    }

    // --- practical sign-off ---
    if (course.requires_practical_signoff || course.delivery_type === 'blended') {
      const { data: sessions } = await admin
        .from('practical_sessions')
        .select('id')
        .eq('course_id', courseId);
      if (sessions && sessions.length > 0) {
        const { data: attendance } = await admin
          .from('practical_attendance')
          .select('id')
          .eq('user_id', userId)
          .eq('attended', true)
          .eq('competency_outcome', 'pass')
          .in('session_id', sessions.map((s) => s.id));
        if (!attendance || attendance.length === 0) {
          return json({
            completed: false,
            reason: 'Practical assessment not yet passed',
            progress: { practical: { completed: false } },
          });
        }
      }
    }

    /* ---------------- verified complete: issue ---------------- */

    // Organisation snapshot: prefer the org whose licence seat funded this
    // enrollment, else the learner's earliest active membership (home org).
    let organisationId: string | null = null;
    if (enrollment.licence_seat_id) {
      const { data: seat } = await admin
        .from('licence_seats')
        .select('licence_id, licences(organisation_id)')
        .eq('id', enrollment.licence_seat_id)
        .maybeSingle();
      organisationId =
        ((seat as { licences?: { organisation_id?: string } } | null)?.licences?.organisation_id) ?? null;
    }
    if (!organisationId) {
      const { data: membership } = await admin
        .from('organisation_members')
        .select('organisation_id')
        .eq('user_id', userId)
        .is('ended_at', null)
        .order('started_at', { ascending: true })
        .limit(1)
        .maybeSingle();
      organisationId = membership?.organisation_id ?? null;
    }

    const months = course.certificate_expiry_months as number | null;
    let expiresAt: string | null = null;
    if (months && months > 0) {
      const d = new Date();
      d.setMonth(d.getMonth() + months);
      expiresAt = d.toISOString();
    }

    let inserted: { id: string; certificate_number: string; verification_code: string } | null = null;
    let lastError: unknown = null;
    for (let attempt = 0; attempt < 5 && !inserted; attempt++) {
      const code = verificationCode();
      const { data, error } = await admin
        .from('certificates')
        .insert({
          user_id: userId,
          course_id: courseId,
          certificate_number: certificateNumber(),
          certificate_type: 'completion',
          verification_code: code,
          expires_at: expiresAt,
          organisation_id: organisationId,
        })
        .select('id, certificate_number, verification_code')
        .single();
      if (!error && data) {
        inserted = data as typeof inserted;
      } else {
        lastError = error;
      }
    }
    if (!inserted) {
      console.error('Certificate insert failed', lastError);
      return json({ error: 'Failed to create certificate' }, 500);
    }

    await admin
      .from('enrollments')
      .update({ completed_at: new Date().toISOString() })
      .eq('id', enrollment.id);

    // A seat used to complete a course is consumed forever (revoke_seat's rule).
    if (enrollment.licence_seat_id) {
      await admin
        .from('licence_seats')
        .update({ status: 'completed' })
        .eq('id', enrollment.licence_seat_id);
    }

    // Render + store the PDF through the existing generator (best effort — the
    // row is authoritative and download can render later).
    await fetch(`${supabaseUrl}/functions/v1/generate-certificate`, {
      method: 'POST',
      headers: { Authorization: authHeader, 'Content-Type': 'application/json' },
      body: JSON.stringify({ certificate_id: inserted.id }),
    }).catch((e) => console.error('PDF render failed', e));

    return json({
      completed: true,
      certificate_id: inserted.id,
      certificate_number: inserted.certificate_number,
      verification_code: inserted.verification_code,
      expires_at: expiresAt,
      already_issued: false,
      message: 'Congratulations! Certificate issued successfully.',
    });
  } catch (error) {
    console.error('issue-certificate error', error);
    return json({ error: error instanceof Error ? error.message : 'Unknown error' }, 500);
  }
});
