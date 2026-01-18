import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// PDF generation using basic text/template approach
function generateCertificatePDF(data: {
  learnerName: string;
  courseTitle: string;
  completionDate: string;
  certificateNumber: string;
  instructorName: string;
}): string {
  const { learnerName, courseTitle, completionDate, certificateNumber, instructorName } = data;
  
  // Generate SVG certificate that can be embedded in HTML
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 842 595" width="842" height="595">
  <defs>
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#f5f3ff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#ecfdf5;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
  </defs>
  
  <!-- Background -->
  <rect width="842" height="595" fill="url(#bgGradient)"/>
  
  <!-- Border -->
  <rect x="20" y="20" width="802" height="555" fill="none" stroke="#7c3aed" stroke-width="3" rx="8"/>
  <rect x="30" y="30" width="782" height="535" fill="none" stroke="#10b981" stroke-width="1" rx="6"/>
  
  <!-- Top decorative bar -->
  <rect x="20" y="20" width="802" height="60" fill="url(#purpleGradient)" rx="8"/>
  <rect x="20" y="60" width="802" height="20" fill="url(#purpleGradient)"/>
  
  <!-- Logo/Brand -->
  <text x="421" y="55" font-family="Georgia, serif" font-size="24" fill="white" text-anchor="middle" font-weight="bold">Special People Academy</text>
  
  <!-- Certificate of Completion -->
  <text x="421" y="130" font-family="Georgia, serif" font-size="14" fill="#6b7280" text-anchor="middle" letter-spacing="4">CERTIFICATE OF COMPLETION</text>
  
  <!-- Decorative line -->
  <line x1="271" y1="150" x2="571" y2="150" stroke="#10b981" stroke-width="2"/>
  
  <!-- This certifies that -->
  <text x="421" y="190" font-family="Arial, sans-serif" font-size="14" fill="#4b5563" text-anchor="middle">This is to certify that</text>
  
  <!-- Learner Name -->
  <text x="421" y="240" font-family="Georgia, serif" font-size="36" fill="#1f2937" text-anchor="middle" font-weight="bold">${escapeXml(learnerName)}</text>
  
  <!-- Decorative underline for name -->
  <line x1="171" y1="255" x2="671" y2="255" stroke="#7c3aed" stroke-width="1"/>
  
  <!-- has successfully completed -->
  <text x="421" y="290" font-family="Arial, sans-serif" font-size="14" fill="#4b5563" text-anchor="middle">has successfully completed the course</text>
  
  <!-- Course Title -->
  <text x="421" y="340" font-family="Georgia, serif" font-size="24" fill="#7c3aed" text-anchor="middle" font-weight="bold">${escapeXml(courseTitle)}</text>
  
  <!-- Date -->
  <text x="421" y="390" font-family="Arial, sans-serif" font-size="14" fill="#4b5563" text-anchor="middle">Completed on ${escapeXml(completionDate)}</text>
  
  <!-- Instructor section -->
  <text x="200" y="470" font-family="Georgia, serif" font-size="18" fill="#1f2937" text-anchor="middle" font-style="italic">${escapeXml(instructorName)}</text>
  <line x1="100" y1="480" x2="300" y2="480" stroke="#4b5563" stroke-width="1"/>
  <text x="200" y="500" font-family="Arial, sans-serif" font-size="12" fill="#6b7280" text-anchor="middle">Course Instructor</text>
  
  <!-- Certificate ID -->
  <text x="642" y="470" font-family="monospace" font-size="12" fill="#6b7280" text-anchor="middle">${escapeXml(certificateNumber)}</text>
  <line x1="542" y1="480" x2="742" y2="480" stroke="#4b5563" stroke-width="1"/>
  <text x="642" y="500" font-family="Arial, sans-serif" font-size="12" fill="#6b7280" text-anchor="middle">Certificate ID</text>
  
  <!-- Footer -->
  <rect x="20" y="535" width="802" height="40" fill="url(#purpleGradient)"/>
  <rect x="20" y="535" width="802" height="5" fill="#10b981"/>
  <text x="421" y="560" font-family="Arial, sans-serif" font-size="10" fill="white" text-anchor="middle">Special People Academy • Excellence in Professional Training</text>
  
  <!-- Decorative elements -->
  <circle cx="70" cy="100" r="20" fill="#10b981" opacity="0.2"/>
  <circle cx="772" cy="100" r="20" fill="#7c3aed" opacity="0.2"/>
</svg>`;

  return svgContent;
}

function escapeXml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Create admin client for storage operations
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create user client to verify auth
    const supabaseAnon = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await supabaseAnon.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { certificate_id } = await req.json();
    
    if (!certificate_id) {
      return new Response(JSON.stringify({ error: 'certificate_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating certificate PDF for certificate_id: ${certificate_id}`);

    // Fetch certificate with course details
    const { data: certificate, error: certError } = await supabaseAdmin
      .from('certificates')
      .select(`
        id,
        certificate_number,
        issued_at,
        user_id,
        pdf_path,
        course:courses(
          id,
          title,
          instructor:instructors(full_name)
        )
      `)
      .eq('id', certificate_id)
      .single();

    if (certError || !certificate) {
      console.error('Certificate fetch error:', certError);
      return new Response(JSON.stringify({ error: 'Certificate not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if user owns this certificate or is admin
    const { data: userRoles } = await supabaseAdmin
      .from('user_roles')
      .select('role')
      .eq('user_id', user.id);
    
    const isAdmin = userRoles?.some(r => r.role === 'admin');
    
    if (certificate.user_id !== user.id && !isAdmin) {
      return new Response(JSON.stringify({ error: 'Access denied' }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // If PDF already exists, return signed URL
    if (certificate.pdf_path) {
      console.log(`PDF already exists at: ${certificate.pdf_path}`);
      const { data: signedUrl, error: signError } = await supabaseAdmin
        .storage
        .from('certificates')
        .createSignedUrl(certificate.pdf_path, 3600); // 1 hour expiry

      if (!signError && signedUrl) {
        return new Response(JSON.stringify({ url: signedUrl.signedUrl }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
    }

    // Get learner profile
    const { data: profile } = await supabaseAdmin
      .from('profiles')
      .select('full_name')
      .eq('user_id', certificate.user_id)
      .single();

    const learnerName = profile?.full_name || 'Learner';
    const courseTitle = (certificate.course as any)?.title || 'Course';
    const instructorName = (certificate.course as any)?.instructor?.full_name || 'Elisa Bianco';
    const completionDate = new Date(certificate.issued_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    console.log(`Generating PDF for: ${learnerName}, ${courseTitle}`);

    // Generate SVG certificate
    const svgContent = generateCertificatePDF({
      learnerName,
      courseTitle,
      completionDate,
      certificateNumber: certificate.certificate_number,
      instructorName,
    });

    // Store SVG as a file (can be viewed/printed as PDF)
    const pdfPath = `${certificate.user_id}/${certificate.id}.svg`;
    
    const { error: uploadError } = await supabaseAdmin
      .storage
      .from('certificates')
      .upload(pdfPath, svgContent, {
        contentType: 'image/svg+xml',
        upsert: true,
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      return new Response(JSON.stringify({ error: 'Failed to upload certificate' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Update certificate with pdf_path
    await supabaseAdmin
      .from('certificates')
      .update({ pdf_path: pdfPath })
      .eq('id', certificate_id);

    // Get signed URL
    const { data: signedUrl, error: signError } = await supabaseAdmin
      .storage
      .from('certificates')
      .createSignedUrl(pdfPath, 3600);

    if (signError) {
      console.error('Sign URL error:', signError);
      return new Response(JSON.stringify({ error: 'Failed to generate download URL' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Certificate generated successfully: ${pdfPath}`);

    return new Response(JSON.stringify({ 
      url: signedUrl.signedUrl,
      path: pdfPath,
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating certificate:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
