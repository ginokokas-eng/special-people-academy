import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  return typeof uuid === 'string' && uuidRegex.test(uuid);
}

function generateCertificateNumber(): string {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `SPA-COMP-${timestamp}-${random}`;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify caller is an authorized assessor
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
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

    const callerId = claimsData.claims.sub as string;

    // Verify caller has sign-off permission
    const { data: callerStaff } = await supabaseAdmin
      .from('staff_profiles')
      .select('id, can_sign_off_competency')
      .eq('user_id', callerId)
      .maybeSingle();

    if (!callerStaff?.can_sign_off_competency) {
      return new Response(JSON.stringify({ error: 'Not authorized to issue competency certificates' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Parse request body
    let body: { user_id?: unknown; course_id?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { user_id, course_id } = body;

    if (!user_id || typeof user_id !== 'string' || !isValidUUID(user_id)) {
      return new Response(JSON.stringify({ error: 'Invalid user_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!course_id || typeof course_id !== 'string' || !isValidUUID(course_id)) {
      return new Response(JSON.stringify({ error: 'Invalid course_id' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Issuing competency certificate for user ${user_id} on course ${course_id}`);

    // Check if competency sign-off exists and is marked as competent
    const { data: signoff } = await supabaseAdmin
      .from('competency_signoffs')
      .select('*')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .eq('outcome', 'competent')
      .maybeSingle();

    if (!signoff) {
      return new Response(JSON.stringify({ 
        error: 'No competency sign-off found. Learner must be marked as competent first.' 
      }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if competency certificate already exists
    const { data: existingCert } = await supabaseAdmin
      .from('certificates')
      .select('id, certificate_number')
      .eq('user_id', user_id)
      .eq('course_id', course_id)
      .eq('certificate_type', 'competency')
      .maybeSingle();

    if (existingCert) {
      console.log('Competency certificate already exists');
      return new Response(JSON.stringify({ 
        success: true,
        certificate_id: existingCert.id,
        certificate_number: existingCert.certificate_number,
        message: 'Competency certificate already issued' 
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create competency certificate
    const certificateNumber = generateCertificateNumber();
    
    const { data: newCert, error: certError } = await supabaseAdmin
      .from('certificates')
      .insert({
        user_id: user_id,
        course_id: course_id,
        certificate_number: certificateNumber,
        certificate_type: 'competency',
        competency_signed_by: signoff.assessor_id,
        competency_signed_at: signoff.signed_off_at,
      })
      .select('id')
      .single();

    if (certError) {
      console.error('Error creating competency certificate:', certError);
      return new Response(JSON.stringify({ error: 'Failed to create certificate' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Competency certificate created: ${certificateNumber}`);

    return new Response(JSON.stringify({ 
      success: true,
      certificate_id: newCert.id,
      certificate_number: certificateNumber,
      message: 'Competency Sign-off Certificate issued successfully.'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error issuing competency certificate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
