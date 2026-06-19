import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// UUID validation to prevent database errors and information leakage
function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof uuid === 'string' && uuidRegex.test(uuid);
}

// Generate a unique certificate number
function generateCertificateNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SPA-${timestamp}-${random}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabaseAnon.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userId = claimsData.claims.sub as string;

    // Parse and validate request body
    let body: { course_id?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { course_id } = body;
    
    if (!course_id || typeof course_id !== 'string') {
      return new Response(JSON.stringify({ error: 'course_id is required and must be a string' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isValidUUID(course_id)) {
      return new Response(JSON.stringify({ error: 'Invalid course_id format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Checking completion for user ${userId} on course ${course_id}`);

    // Check if already has certificate
    const { data: existingCert } = await supabaseAdmin
      .from('certificates')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', course_id)
      .maybeSingle();

    if (existingCert) {
      console.log('Certificate already exists');
      return new Response(JSON.stringify({ 
        completed: true, 
        certificate_id: existingCert.id,
        message: 'Certificate already issued' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get course details
    const { data: course, error: courseError } = await supabaseAdmin
      .from('courses')
      .select('id, title, has_certificate, requires_practical_signoff, delivery_type')
      .eq('id', course_id)
      .single();

    if (courseError || !course) {
      return new Response(JSON.stringify({ error: 'Course not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check enrollment
    const { data: enrollment } = await supabaseAdmin
      .from('enrollments')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', course_id)
      .maybeSingle();

    if (!enrollment) {
      return new Response(JSON.stringify({ 
        completed: false, 
        reason: 'Not enrolled in this course' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get all lessons for the course
    const { data: lessons } = await supabaseAdmin
      .from('lessons')
      .select('id, lesson_type')
      .eq('course_id', course_id);

    const totalLessons = lessons?.length || 0;

    // Get lesson progress
    const { data: progress } = await supabaseAdmin
      .from('lesson_progress')
      .select('lesson_id, completed')
      .eq('user_id', userId)
      .in('lesson_id', lessons?.map(l => l.id) || []);

    const completedLessons = progress?.filter(p => p.completed).length || 0;

    console.log(`Lessons: ${completedLessons}/${totalLessons}`);

    if (completedLessons < totalLessons) {
      return new Response(JSON.stringify({ 
        completed: false, 
        reason: 'Not all lessons completed',
        progress: { lessons: { completed: completedLessons, total: totalLessons } }
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check quiz lessons - ensure all quiz lessons have passing attempts
    const quizLessons = lessons?.filter(l => l.lesson_type === 'quiz') || [];
    
    if (quizLessons.length > 0) {
      // Get quizzes for these lessons
      const { data: quizzes } = await supabaseAdmin
        .from('quizzes')
        .select('id, lesson_id')
        .in('lesson_id', quizLessons.map(l => l.id));

      // Only graded quizzes (those that actually have authored questions) gate
      // completion. Empty "knowledge check" quizzes are informational and are
      // completed via lesson_progress instead.
      let gradedQuizzes = quizzes || [];
      if (gradedQuizzes.length > 0) {
        const { data: qCounts } = await supabaseAdmin
          .from('quiz_questions')
          .select('quiz_id')
          .in('quiz_id', gradedQuizzes.map(q => q.id));
        const quizzesWithQuestions = new Set((qCounts || []).map(q => q.quiz_id));
        gradedQuizzes = gradedQuizzes.filter(q => quizzesWithQuestions.has(q.id));
      }

      if (gradedQuizzes.length > 0) {
        // Check for passing attempts on all graded quizzes
        const { data: attempts } = await supabaseAdmin
          .from('quiz_attempts')
          .select('quiz_id, passed')
          .eq('user_id', userId)
          .in('quiz_id', gradedQuizzes.map(q => q.id))
          .eq('passed', true);

        const passedQuizIds = new Set(attempts?.map(a => a.quiz_id) || []);
        const allQuizzesPassed = gradedQuizzes.every(q => passedQuizIds.has(q.id));

        console.log(`Quizzes passed: ${passedQuizIds.size}/${gradedQuizzes.length}`);


        if (!allQuizzesPassed) {
          return new Response(JSON.stringify({ 
            completed: false, 
            reason: 'Not all quizzes passed',
            progress: { quizzes: { passed: passedQuizIds.size, total: gradedQuizzes.length } }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // Check practical sign-off if required
    if (course.requires_practical_signoff || course.delivery_type === 'blended') {
      // Get practical sessions for this course
      const { data: sessions } = await supabaseAdmin
        .from('practical_sessions')
        .select('id')
        .eq('course_id', course_id);

      if (sessions && sessions.length > 0) {
        // Check for attendance with 'pass' competency
        const { data: attendance } = await supabaseAdmin
          .from('practical_attendance')
          .select('id, competency_outcome')
          .eq('user_id', userId)
          .in('session_id', sessions.map(s => s.id))
          .eq('attended', true)
          .eq('competency_outcome', 'pass');

        console.log(`Practical attendance with pass: ${attendance?.length || 0}`);

        if (!attendance || attendance.length === 0) {
          return new Response(JSON.stringify({ 
            completed: false, 
            reason: 'Practical assessment not yet passed',
            progress: { practical: { completed: false } }
          }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          });
        }
      }
    }

    // All requirements met - create certificate
    console.log('All requirements met, creating certificate');

    const certificateNumber = generateCertificateNumber();
    
    const { data: newCert, error: certError } = await supabaseAdmin
      .from('certificates')
      .insert({
        user_id: userId,
        course_id: course_id,
        certificate_number: certificateNumber,
      })
      .select('id')
      .single();

    if (certError) {
      console.error('Error creating certificate:', certError);
      return new Response(JSON.stringify({ error: 'Failed to create certificate' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update enrollment completed_at
    await supabaseAdmin
      .from('enrollments')
      .update({ completed_at: new Date().toISOString() })
      .eq('user_id', userId)
      .eq('course_id', course_id);

    console.log(`Certificate created: ${certificateNumber}`);

    return new Response(JSON.stringify({ 
      completed: true, 
      certificate_id: newCert.id,
      certificate_number: certificateNumber,
      message: 'Congratulations! Certificate issued successfully.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error checking completion:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
