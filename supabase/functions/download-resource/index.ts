import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface DownloadRequest {
  resource_id: string;
  course_id: string;
}

serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get auth token from header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create Supabase client with user's auth
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseUser = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseUser.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { resource_id, course_id }: DownloadRequest = await req.json();

    if (!resource_id || !course_id) {
      return new Response(
        JSON.stringify({ error: "Missing resource_id or course_id" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if user is authorized to download (enrolled, admin, or trainer)
    const isAdmin = await checkRole(supabaseAdmin, user.id, 'admin');
    const isTrainer = await checkRole(supabaseAdmin, user.id, 'trainer');

    let isEnrolled = false;
    if (!isAdmin) {
      const { data: enrollment } = await supabaseAdmin
        .from('enrollments')
        .select('id')
        .eq('user_id', user.id)
        .eq('course_id', course_id)
        .single();
      isEnrolled = !!enrollment;
    }

    let isAssignedTrainer = false;
    if (isTrainer && !isAdmin) {
      const { data: session } = await supabaseAdmin
        .from('practical_sessions')
        .select('id')
        .eq('trainer_id', user.id)
        .eq('course_id', course_id)
        .limit(1);
      isAssignedTrainer = !!(session && session.length > 0);
    }

    if (!isAdmin && !isEnrolled && !isAssignedTrainer) {
      return new Response(
        JSON.stringify({ error: "You must be enrolled in this course to download resources" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Get resource details
    const { data: resource, error: resourceError } = await supabaseAdmin
      .from('course_resources')
      .select('*')
      .eq('id', resource_id)
      .eq('course_id', course_id)
      .single();

    if (resourceError || !resource) {
      return new Response(
        JSON.stringify({ error: "Resource not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // If resource has a direct URL, return it
    if (resource.url) {
      return new Response(
        JSON.stringify({ url: resource.url, title: resource.title }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate file path based on resource
    const fileName = generateFileName(resource.title, resource.resource_type);
    const filePath = `${course_id}/${fileName}`;

    // Create signed URL with 5 minute expiry
    const { data: signedUrlData, error: signedUrlError } = await supabaseAdmin
      .storage
      .from('course-resources')
      .createSignedUrl(filePath, 300);

    if (signedUrlError) {
      console.log('Storage file not found:', filePath);
      // Return placeholder info - file will need to be uploaded
      return new Response(
        JSON.stringify({ 
          pending: true, 
          title: resource.title,
          message: "This resource file is being prepared. Please check back soon." 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ 
        url: signedUrlData.signedUrl, 
        title: resource.title,
        fileName: fileName 
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: unknown) {
    console.error("Error in download-resource:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});

async function checkRole(supabase: any, userId: string, role: string): Promise<boolean> {
  const { data } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', userId)
    .eq('role', role)
    .single();
  return !!data;
}

function generateFileName(title: string, resourceType: string): string {
  const sanitized = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  
  const extension = resourceType === 'pdf' ? 'pdf' : 
                   resourceType === 'spreadsheet' || resourceType === 'excel' ? 'xlsx' :
                   resourceType === 'image' ? 'png' : 'pdf';
  
  return `${sanitized}.${extension}`;
}
