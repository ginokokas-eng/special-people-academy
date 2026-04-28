import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CancelEventRequest {
  sessionId: string;
}

interface GraphTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

async function getGraphAccessToken(): Promise<string> {
  const tenantId = Deno.env.get('MS_TENANT_ID');
  const clientId = Deno.env.get('MS_CLIENT_ID');
  const clientSecret = Deno.env.get('MS_CLIENT_SECRET');

  if (!tenantId || !clientId || !clientSecret) {
    throw new Error('Microsoft Graph credentials not configured');
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: 'https://graph.microsoft.com/.default',
    grant_type: 'client_credentials',
  });

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Token request failed:', errorText);
    throw new Error(`Failed to obtain Microsoft Graph token: ${response.status}`);
  }

  const data: GraphTokenResponse = await response.json();
  return data.access_token;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { sessionId }: CancelEventRequest = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: sessionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Outlook cancel event called for session:', sessionId);

    // Fetch session
    const { data: session, error: sessionError } = await supabase
      .from('practical_sessions')
      .select('id, outlook_event_id, outlook_calendar_owner')
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Session not found:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If no event exists, nothing to cancel
    if (!session.outlook_event_id) {
      console.log('No event to cancel');
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'No calendar event to cancel',
          status: 'ok'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const calendarOwner = session.outlook_calendar_owner || Deno.env.get('OUTLOOK_CALENDAR_OWNER_EMAIL') || 'training@specialpeople.org.uk';

    // Check if Microsoft credentials are configured
    const tenantId = Deno.env.get('MS_TENANT_ID');
    const clientId = Deno.env.get('MS_CLIENT_ID');
    const clientSecret = Deno.env.get('MS_CLIENT_SECRET');

    if (!tenantId || !clientId || !clientSecret) {
      // Credentials not configured - just clear the sync fields
      await supabase
        .from('practical_sessions')
        .update({
          outlook_event_id: null,
          calendar_sync_status: 'not_configured',
          last_synced_at: null,
          calendar_last_error: 'Microsoft Graph credentials not configured - event not deleted from Outlook',
        })
        .eq('id', sessionId);

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Calendar sync cleared (Graph not configured)',
          status: 'not_configured'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get access token
    const accessToken = await getGraphAccessToken();

    const graphUrl = `https://graph.microsoft.com/v1.0/users/${calendarOwner}/events/${session.outlook_event_id}`;
    
    const graphResponse = await fetch(graphUrl, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    // 204 No Content means success, 404 means already deleted
    if (!graphResponse.ok && graphResponse.status !== 404) {
      const errorText = await graphResponse.text();
      console.error('Graph API error:', errorText);
      
      await supabase
        .from('practical_sessions')
        .update({
          calendar_sync_status: 'failed',
          calendar_last_error: `Failed to delete event: ${graphResponse.status} - ${errorText.slice(0, 500)}`,
        })
        .eq('id', sessionId);

      return new Response(
        JSON.stringify({ 
          error: `Microsoft Graph API error: ${graphResponse.status}`,
          details: errorText,
          status: 'failed'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Event deleted successfully');

    // Clear sync fields from session
    const { error: updateError } = await supabase
      .from('practical_sessions')
      .update({
        outlook_event_id: null,
        calendar_sync_status: 'ok',
        last_synced_at: new Date().toISOString(),
        calendar_last_error: null,
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return new Response(
        JSON.stringify({ error: 'Event deleted but failed to update session record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Event cancelled successfully',
        status: 'ok'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in outlook-cancel-event:', error);
    
    try {
      const { sessionId } = await req.clone().json();
      if (sessionId) {
        await supabase
          .from('practical_sessions')
          .update({
            calendar_sync_status: 'failed',
            calendar_last_error: error.message,
          })
          .eq('id', sessionId);
      }
    } catch (e) {
      // Ignore parse errors
    }

    return new Response(
      JSON.stringify({ error: 'Calendar cancellation failed', status: 'failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
