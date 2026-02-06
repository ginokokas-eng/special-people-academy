import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateEventRequest {
  sessionId: string;
  title: string;
  description?: string;
  location?: string;
  startTime: string;
  endTime: string;
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
    throw new Error('Microsoft Graph credentials not configured. Please set MS_TENANT_ID, MS_CLIENT_ID, and MS_CLIENT_SECRET.');
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const calendarOwner = Deno.env.get('OUTLOOK_CALENDAR_OWNER_EMAIL');
    
    const { sessionId, title, description, location, startTime, endTime }: CreateEventRequest = await req.json();

    if (!sessionId || !title || !startTime || !endTime) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sessionId, title, startTime, endTime' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Outlook create event called for session:', sessionId);
    console.log('Event details:', { title, description, location, startTime, endTime, calendarOwner });

    // Check if Microsoft credentials are configured
    const tenantId = Deno.env.get('MS_TENANT_ID');
    const clientId = Deno.env.get('MS_CLIENT_ID');
    const clientSecret = Deno.env.get('MS_CLIENT_SECRET');

    if (!tenantId || !clientId || !clientSecret || !calendarOwner) {
      // Credentials not configured - mark as pending
      const { error: updateError } = await supabase
        .from('practical_sessions')
        .update({
          calendar_sync_status: 'pending',
          outlook_calendar_owner: calendarOwner || null,
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
          message: 'Calendar sync pending - Microsoft Graph credentials not yet configured',
          status: 'pending'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get access token
    const accessToken = await getGraphAccessToken();

    // Create event in Microsoft Graph
    const eventPayload = {
      subject: title,
      body: {
        contentType: 'HTML',
        content: description || `Training session: ${title}`,
      },
      start: {
        dateTime: startTime,
        timeZone: 'Europe/London',
      },
      end: {
        dateTime: endTime,
        timeZone: 'Europe/London',
      },
      location: location ? { displayName: location } : undefined,
      isOnlineMeeting: false,
    };

    const graphUrl = `https://graph.microsoft.com/v1.0/users/${calendarOwner}/events`;
    
    const graphResponse = await fetch(graphUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventPayload),
    });

    if (!graphResponse.ok) {
      const errorText = await graphResponse.text();
      console.error('Graph API error:', errorText);
      
      // Mark as failed
      await supabase
        .from('practical_sessions')
        .update({
          calendar_sync_status: 'failed',
          outlook_calendar_owner: calendarOwner,
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

    const eventData = await graphResponse.json();
    console.log('Event created successfully:', eventData.id);

    // Update session with event ID
    const { error: updateError } = await supabase
      .from('practical_sessions')
      .update({
        outlook_event_id: eventData.id,
        outlook_calendar_owner: calendarOwner,
        calendar_sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
      return new Response(
        JSON.stringify({ error: 'Event created but failed to update session record' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        eventId: eventData.id,
        webLink: eventData.webLink,
        status: 'synced'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in outlook-create-event:', error);
    return new Response(
      JSON.stringify({ error: error.message, status: 'failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
