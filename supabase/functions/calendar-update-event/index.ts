import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateEventRequest {
  sessionId: string;
  googleEventId: string;
  title?: string;
  description?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { sessionId, googleEventId, title, description, location, startTime, endTime }: UpdateEventRequest = await req.json();

    if (!sessionId || !googleEventId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sessionId, googleEventId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Implement actual Google Calendar API call when connector is set up
    // For now, simulate a pending sync state
    
    console.log('Calendar update event called for session:', sessionId);
    console.log('Event ID:', googleEventId);
    console.log('Updates:', { title, description, location, startTime, endTime });

    // Update session with pending status
    const { error: updateError } = await supabase
      .from('practical_sessions')
      .update({
        calendar_sync_status: 'pending',
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to update session sync status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Calendar update pending - Google Calendar connection not yet configured',
        status: 'pending'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calendar-update-event:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
