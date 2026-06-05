import { createClient, SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.95.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-ariadne-secret',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'content-type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const expected = Deno.env.get('ARIADNE_SYNC_SECRET');
  const provided = req.headers.get('x-ariadne-secret');
  if (!expected || provided !== expected) return json({ error: 'Unauthorized' }, 401);

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  const url = new URL(req.url);
  const resource = url.searchParams.get('resource');

  try {
    if (resource === 'catalog') return await handleCatalog(admin, url);
    if (resource === 'enroll') return await handleEnroll(admin, req);
    if (resource === 'progress') return await handleProgress(admin, req, url);
    if (resource === 'certificate') return await handleCertificate(admin, url);

    return json(
      {
        error: 'Unknown resource',
        usage: {
          catalog: 'GET ?resource=catalog[&since=ISO]',
          enroll:
            'POST ?resource=enroll  body: { fountain_applicant_id, course_id, assigned_by?, due_date? }',
          progress:
            'POST ?resource=progress  body: { fountain_applicant_ids?: string[], emails?: string[] }  or  GET ?resource=progress&fountain_applicant_ids=a,b',
          certificate:
            'GET ?resource=certificate&course_id=UUID&(user_id=UUID|fountain_applicant_id=STR)',
        },
      },
      400,
    );
  } catch (e) {
    console.error('ariadne-api error', { resource, message: (e as Error).message, stack: (e as Error).stack });
    return json({ error: (e as Error).message }, 500);
  }
});

async function handleCatalog(admin: SupabaseClient, url: URL) {
  let q = admin
    .from('courses')
    .select(
      'id, title, subtitle, description, category, level, thumbnail_url, duration_minutes, cpd_hours, is_mandatory, is_internal, is_published, has_certificate, pass_mark, language, delivery_type, updated_at',
    )
    .eq('is_published', true)
    .order('updated_at', { ascending: false });

  const since = url.searchParams.get('since');
  if (since) q = q.gte('updated_at', since);

  const { data: courses, error } = await q;
  if (error) throw error;

  const courseIds = (courses ?? []).map((c) => c.id);
  const lessonCountByCourse = new Map<string, number>();
  if (courseIds.length) {
    const { data: lessons } = await admin
      .from('lessons')
      .select('id, course_id')
      .in('course_id', courseIds);
    for (const l of lessons ?? []) {
      lessonCountByCourse.set(l.course_id, (lessonCountByCourse.get(l.course_id) ?? 0) + 1);
    }
  }

  const data = (courses ?? []).map((c) => ({
    ...c,
    lesson_count: lessonCountByCourse.get(c.id) ?? 0,
  }));

  return json({ data });
}

async function handleEnroll(admin: SupabaseClient, req: Request) {
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  let body: {
    fountain_applicant_id?: string;
    course_id?: string;
    assigned_by?: string;
    due_date?: string;
  } = {};
  try {
    body = await req.json();
  } catch {
    return json({ error: 'Invalid JSON body' }, 400);
  }

  if (!body.fountain_applicant_id || !body.course_id) {
    return json({ error: 'fountain_applicant_id and course_id are required' }, 400);
  }

  const { data: profile } = await admin
    .from('profiles')
    .select('user_id')
    .eq('fountain_applicant_id', body.fountain_applicant_id)
    .maybeSingle();

  if (!profile) {
    return json({ error: 'No learner found for the given fountain_applicant_id' }, 404);
  }

  const { data: course } = await admin
    .from('courses')
    .select('id, title, is_published')
    .eq('id', body.course_id)
    .maybeSingle();
  if (!course) return json({ error: 'Course not found' }, 404);
  if (!course.is_published) return json({ error: 'Course is not published' }, 409);

  const { data: enrollment, error } = await admin
    .from('enrollments')
    .upsert(
      { user_id: profile.user_id, course_id: body.course_id },
      { onConflict: 'user_id,course_id', ignoreDuplicates: false },
    )
    .select('id, user_id, course_id, enrolled_at, completed_at')
    .single();
  if (error) throw error;

  return json({
    data: {
      enrollment,
      course: { id: course.id, title: course.title },
      assigned_by: body.assigned_by ?? null,
      due_date: body.due_date ?? null,
    },
  });
}

async function handleProgress(admin: SupabaseClient, req: Request, url: URL) {
  let fountainIds: string[] = [];
  let emails: string[] = [];

  if (req.method === 'POST') {
    try {
      const body = await req.json();
      fountainIds = (body.fountain_applicant_ids ?? []).map(String);
      emails = (body.emails ?? []).map((e: string) => e.toLowerCase());
    } catch {
      // fall through to query parsing
    }
  }
  if (!fountainIds.length && !emails.length) {
    const qIds = url.searchParams.get('fountain_applicant_ids');
    const qEmails = url.searchParams.get('emails');
    if (qIds) fountainIds = qIds.split(',').map((s) => s.trim()).filter(Boolean);
    if (qEmails)
      emails = qEmails.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  }

  if (!fountainIds.length && !emails.length) {
    return json({ error: 'Provide fountain_applicant_ids or emails' }, 400);
  }

  type ProfileRow = {
    user_id: string;
    full_name: string | null;
    fountain_applicant_id: string | null;
    external_id: string | null;
  };
  let profiles: ProfileRow[] = [];

  if (fountainIds.length) {
    const { data } = await admin
      .from('profiles')
      .select('user_id, full_name, fountain_applicant_id, external_id')
      .in('fountain_applicant_id', fountainIds);
    profiles = (data ?? []) as ProfileRow[];
  }

  if (emails.length) {
    const { data: list } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const matched = (list?.users ?? []).filter(
      (u) => u.email && emails.includes(u.email.toLowerCase()),
    );
    if (matched.length) {
      const seen = new Set(profiles.map((p) => p.user_id));
      const { data: extra } = await admin
        .from('profiles')
        .select('user_id, full_name, fountain_applicant_id, external_id')
        .in('user_id', matched.map((u) => u.id));
      for (const p of (extra ?? []) as ProfileRow[]) {
        if (!seen.has(p.user_id)) profiles.push(p);
      }
    }
  }

  if (!profiles.length) return json({ learners: [] });

  const userIds = profiles.map((p) => p.user_id);

  const [enrollmentsRes, certsRes, authListRes] = await Promise.all([
    admin
      .from('enrollments')
      .select('user_id, course_id, enrolled_at, completed_at')
      .in('user_id', userIds),
    admin
      .from('certificates')
      .select('user_id, course_id, certificate_number, certificate_type, issued_at, pdf_path')
      .in('user_id', userIds),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ]);

  const enrollments = enrollmentsRes.data ?? [];
  const certificates = certsRes.data ?? [];

  const emailById = new Map<string, string | null>();
  for (const u of authListRes?.data?.users ?? []) emailById.set(u.id, u.email ?? null);

  const enrolledCourseIds = Array.from(new Set(enrollments.map((e) => e.course_id)));
  const lessonsByCourse = new Map<string, string[]>();
  const completedLessonsByUser = new Map<string, Set<string>>();
  const courseTitleById = new Map<string, string>();

  if (enrolledCourseIds.length) {
    const { data: courseRows } = await admin
      .from('courses')
      .select('id, title')
      .in('id', enrolledCourseIds);
    for (const c of courseRows ?? []) courseTitleById.set(c.id, c.title);

    const { data: lessons } = await admin
      .from('lessons')
      .select('id, course_id')
      .in('course_id', enrolledCourseIds);
    for (const l of lessons ?? []) {
      const arr = lessonsByCourse.get(l.course_id) ?? [];
      arr.push(l.id);
      lessonsByCourse.set(l.course_id, arr);
    }
    const allLessonIds = (lessons ?? []).map((l) => l.id);
    if (allLessonIds.length) {
      const { data: lp } = await admin
        .from('lesson_progress')
        .select('user_id, lesson_id, completed')
        .in('user_id', userIds)
        .in('lesson_id', allLessonIds)
        .eq('completed', true);
      for (const r of lp ?? []) {
        const s = completedLessonsByUser.get(r.user_id) ?? new Set<string>();
        s.add(r.lesson_id);
        completedLessonsByUser.set(r.user_id, s);
      }
    }
  }

  const learners = profiles.map((p) => {
    const myEnr = enrollments.filter((e) => e.user_id === p.user_id);
    const myCerts = certificates.filter((c) => c.user_id === p.user_id);
    const completedLessons = completedLessonsByUser.get(p.user_id) ?? new Set<string>();

    const detailedEnrollments = myEnr.map((e) => {
      const lessonIds = lessonsByCourse.get(e.course_id) ?? [];
      const totalLessons = lessonIds.length;
      const completedCount = lessonIds.filter((id) => completedLessons.has(id)).length;
      const progressPercent =
        totalLessons === 0 ? null : Math.round((completedCount / totalLessons) * 100);
      const status = e.completed_at
        ? 'completed'
        : completedCount > 0
          ? 'in_progress'
          : 'not_started';
      return {
        course_id: e.course_id,
        course_title: courseTitleById.get(e.course_id) ?? null,
        status,
        enrolled_at: e.enrolled_at,
        completed_at: e.completed_at,
        progress_percent: progressPercent,
        lessons_completed: completedCount,
        lessons_total: totalLessons,
      };
    });

    const lastActivity =
      myEnr
        .map((e) => e.completed_at ?? e.enrolled_at)
        .filter(Boolean)
        .sort()
        .pop() ?? null;

    return {
      user_id: p.user_id,
      email: emailById.get(p.user_id) ?? null,
      full_name: p.full_name,
      fountain_applicant_id: p.fountain_applicant_id,
      external_id: p.external_id,
      enrollments_total: detailedEnrollments.length,
      enrollments_completed: detailedEnrollments.filter((e) => e.status === 'completed').length,
      enrollments: detailedEnrollments,
      certificates: myCerts.map((c) => ({
        course_id: c.course_id,
        certificate_number: c.certificate_number,
        certificate_type: c.certificate_type,
        issued_at: c.issued_at,
        has_pdf: !!c.pdf_path,
      })),
      last_activity_at: lastActivity,
    };
  });

  return json({ learners });
}

async function handleCertificate(admin: SupabaseClient, url: URL) {
  let userId = url.searchParams.get('user_id');
  const courseId = url.searchParams.get('course_id');
  const fountainId = url.searchParams.get('fountain_applicant_id');

  if (!courseId) return json({ error: 'course_id is required' }, 400);
  if (!userId && !fountainId) {
    return json({ error: 'user_id or fountain_applicant_id is required' }, 400);
  }

  if (!userId && fountainId) {
    const { data: profile } = await admin
      .from('profiles')
      .select('user_id')
      .eq('fountain_applicant_id', fountainId)
      .maybeSingle();
    if (!profile) return json({ error: 'No learner found for fountain_applicant_id' }, 404);
    userId = profile.user_id;
  }

  const { data: cert } = await admin
    .from('certificates')
    .select('id, certificate_number, certificate_type, issued_at, pdf_path')
    .eq('user_id', userId!)
    .eq('course_id', courseId)
    .maybeSingle();

  if (!cert) return json({ error: 'Certificate not found' }, 404);
  if (!cert.pdf_path) {
    return json({ error: 'Certificate PDF not generated yet' }, 409);
  }

  const expiresInSeconds = 300;
  const { data: signed, error } = await admin.storage
    .from('certificates')
    .createSignedUrl(cert.pdf_path, expiresInSeconds);
  if (error || !signed?.signedUrl) {
    return json({ error: error?.message ?? 'Failed to sign URL' }, 500);
  }

  return json({
    data: {
      certificate_number: cert.certificate_number,
      certificate_type: cert.certificate_type,
      issued_at: cert.issued_at,
      signed_url: signed.signedUrl,
      expires_at: new Date(Date.now() + expiresInSeconds * 1000).toISOString(),
    },
  });
}
