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

// PDF generation using SVG template with Special People Academy branding
function generateCertificatePDF(data: {
  learnerName: string;
  courseTitle: string;
  completionDate: string;
  certificateNumber: string;
  instructorName: string;
  cpdHours?: number;
}): string {
  const { learnerName, courseTitle, completionDate, certificateNumber, instructorName, cpdHours } = data;
  
  // Generate SVG certificate with purple-led and green accent branding
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 842 595" width="842" height="595">
  <defs>
    <!-- Background gradient - subtle purple to white -->
    <linearGradient id="bgGradient" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#faf5ff;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f0fdf4;stop-opacity:1" />
    </linearGradient>
    
    <!-- Primary purple gradient -->
    <linearGradient id="purpleGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#7c3aed;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#8b5cf6;stop-opacity:1" />
    </linearGradient>
    
    <!-- Accent green gradient -->
    <linearGradient id="greenGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#10b981;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#34d399;stop-opacity:1" />
    </linearGradient>
    
    <!-- Corner decorative pattern -->
    <pattern id="cornerPattern" patternUnits="userSpaceOnUse" width="40" height="40">
      <circle cx="20" cy="20" r="2" fill="#7c3aed" opacity="0.1"/>
    </pattern>
  </defs>
  
  <!-- Main background -->
  <rect width="842" height="595" fill="url(#bgGradient)"/>
  
  <!-- Decorative corner patterns -->
  <rect x="0" y="0" width="150" height="150" fill="url(#cornerPattern)"/>
  <rect x="692" y="0" width="150" height="150" fill="url(#cornerPattern)"/>
  <rect x="0" y="445" width="150" height="150" fill="url(#cornerPattern)"/>
  <rect x="692" y="445" width="150" height="150" fill="url(#cornerPattern)"/>
  
  <!-- Outer border frame -->
  <rect x="25" y="25" width="792" height="545" fill="none" stroke="#7c3aed" stroke-width="3" rx="12"/>
  
  <!-- Inner accent border -->
  <rect x="35" y="35" width="772" height="525" fill="none" stroke="#10b981" stroke-width="1.5" rx="10"/>
  
  <!-- Top header bar with gradient -->
  <rect x="25" y="25" width="792" height="75" fill="url(#purpleGradient)" rx="12"/>
  <rect x="25" y="85" width="792" height="15" fill="url(#purpleGradient)"/>
  
  <!-- Green accent line below header -->
  <rect x="25" y="100" width="792" height="4" fill="url(#greenGradient)"/>
  
  <!-- Academy Logo/Name in header -->
  <text x="421" y="55" font-family="Georgia, 'Times New Roman', serif" font-size="26" fill="white" text-anchor="middle" font-weight="bold" letter-spacing="1">Special People Academy</text>
  <text x="421" y="80" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="rgba(255,255,255,0.9)" text-anchor="middle" letter-spacing="2">EXCELLENCE IN PROFESSIONAL TRAINING</text>
  
  <!-- Certificate Title -->
  <text x="421" y="150" font-family="Georgia, 'Times New Roman', serif" font-size="13" fill="#6b7280" text-anchor="middle" letter-spacing="6" font-weight="500">CERTIFICATE OF COMPLETION</text>
  
  <!-- Decorative divider -->
  <line x1="300" y1="170" x2="542" y2="170" stroke="url(#greenGradient)" stroke-width="2"/>
  <circle cx="421" cy="170" r="4" fill="#10b981"/>
  
  <!-- "This is to certify that" -->
  <text x="421" y="210" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">This is to certify that</text>
  
  <!-- Learner Name (main focus) -->
  <text x="421" y="265" font-family="Georgia, 'Times New Roman', serif" font-size="38" fill="#1f2937" text-anchor="middle" font-weight="bold">${escapeXml(learnerName)}</text>
  
  <!-- Decorative line under name -->
  <line x1="150" y1="285" x2="692" y2="285" stroke="#7c3aed" stroke-width="1" opacity="0.5"/>
  
  <!-- "has successfully completed" -->
  <text x="421" y="320" font-family="Arial, Helvetica, sans-serif" font-size="14" fill="#6b7280" text-anchor="middle">has successfully completed the course</text>
  
  <!-- Course Title -->
  <text x="421" y="365" font-family="Georgia, 'Times New Roman', serif" font-size="22" fill="#7c3aed" text-anchor="middle" font-weight="bold">${escapeXml(courseTitle)}</text>
  
  <!-- Completion Date -->
  <text x="421" y="405" font-family="Arial, Helvetica, sans-serif" font-size="13" fill="#6b7280" text-anchor="middle">Completed on ${escapeXml(completionDate)}</text>
  
  <!-- CPD Hours badge (if applicable) -->
  ${cpdHours ? `
  <rect x="370" y="420" width="102" height="28" rx="14" fill="#10b981" opacity="0.1"/>
  <rect x="370" y="420" width="102" height="28" rx="14" fill="none" stroke="#10b981" stroke-width="1"/>
  <text x="421" y="439" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#10b981" text-anchor="middle" font-weight="600">${cpdHours} CPD Hours</text>
  ` : ''}
  
  <!-- Bottom section with signatures -->
  <!-- Instructor signature area -->
  <text x="200" y="485" font-family="Georgia, 'Times New Roman', serif" font-size="18" fill="#1f2937" text-anchor="middle" font-style="italic">${escapeXml(instructorName)}</text>
  <line x1="90" y1="495" x2="310" y2="495" stroke="#6b7280" stroke-width="1"/>
  <text x="200" y="515" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#6b7280" text-anchor="middle">Course Instructor</text>
  
  <!-- Certificate ID area -->
  <text x="642" y="485" font-family="'Courier New', monospace" font-size="11" fill="#7c3aed" text-anchor="middle" font-weight="bold">${escapeXml(certificateNumber)}</text>
  <line x1="532" y1="495" x2="752" y2="495" stroke="#6b7280" stroke-width="1"/>
  <text x="642" y="515" font-family="Arial, Helvetica, sans-serif" font-size="11" fill="#6b7280" text-anchor="middle">Certificate ID</text>
  
  <!-- Footer bar -->
  <rect x="25" y="545" width="792" height="25" fill="url(#purpleGradient)" rx="0"/>
  <rect x="25" y="540" width="792" height="5" fill="url(#greenGradient)"/>
  <text x="421" y="562" font-family="Arial, Helvetica, sans-serif" font-size="9" fill="white" text-anchor="middle" letter-spacing="1">Special People Academy • Professional Training & Development • www.specialpeopleacademy.com</text>
  
  <!-- Bottom corners rounding fix -->
  <rect x="25" y="545" width="12" height="25" fill="url(#purpleGradient)"/>
  <rect x="805" y="545" width="12" height="25" fill="url(#purpleGradient)"/>
  
  <!-- Decorative seal/badge -->
  <circle cx="421" cy="440" r="0" fill="none" stroke="#7c3aed" stroke-width="0"/>
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
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing or invalid authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Create user client to verify auth
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
    let body: { certificate_id?: unknown };
    try {
      body = await req.json();
    } catch {
      return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { certificate_id } = body;
    
    if (!certificate_id || typeof certificate_id !== 'string') {
      return new Response(JSON.stringify({ error: 'certificate_id is required and must be a string' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!isValidUUID(certificate_id)) {
      return new Response(JSON.stringify({ error: 'Invalid certificate_id format' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Generating certificate PDF for certificate_id: ${certificate_id}`);

    // Fetch certificate with course details including CPD hours
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
          cpd_hours,
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
      .eq('user_id', userId);
    
    const isAdmin = userRoles?.some(r => r.role === 'admin');
    
    if (certificate.user_id !== userId && !isAdmin) {
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
    const course = certificate.course as any;
    const courseTitle = course?.title || 'Course';
    const instructorName = course?.instructor?.full_name || 'Tamar Bartaia';
    const cpdHours = course?.cpd_hours || undefined;
    const completionDate = new Date(certificate.issued_at).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    console.log(`Generating PDF for: ${learnerName}, ${courseTitle}, Instructor: ${instructorName}`);

    // Generate SVG certificate
    const svgContent = generateCertificatePDF({
      learnerName,
      courseTitle,
      completionDate,
      certificateNumber: certificate.certificate_number,
      instructorName,
      cpdHours,
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
