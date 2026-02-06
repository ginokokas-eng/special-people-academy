import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancelEventRequest {
  sessionId: string;
  googleEventId: string;
  googleCalendarId?: string;
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

    const { sessionId, googleEventId, googleCalendarId }: CancelEventRequest = await req.json();

    if (!sessionId || !googleEventId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sessionId, googleEventId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // TODO: Implement actual Google Calendar API call when connector is set up
    // For now, just clear the sync fields
    
    console.log('Calendar cancel event called for session:', sessionId);
    console.log('Event ID to cancel:', googleEventId);
    console.log('Calendar ID:', googleCalendarId);

    // Clear the Google Calendar fields from the session
    const { error: updateError } = await supabase
      .from('practical_sessions')
      .update({
        google_event_id: null,
        google_calendar_id: null,
        calendar_sync_status: 'not_synced',
        last_synced_at: null,
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to clear session sync status' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Calendar event cancellation pending - Google Calendar connection not yet configured',
        status: 'not_synced'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in calendar-cancel-event:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
