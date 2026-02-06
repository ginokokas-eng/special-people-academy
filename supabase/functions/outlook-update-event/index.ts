import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface UpdateEventRequest {
  sessionId: string;
  outlookEventId: string;
  title?: string;
  description?: string;
  location?: string;
  startTime?: string;
  endTime?: string;
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

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const calendarOwner = Deno.env.get('OUTLOOK_CALENDAR_OWNER_EMAIL');

    const { sessionId, outlookEventId, title, description, location, startTime, endTime }: UpdateEventRequest = await req.json();

    if (!sessionId || !outlookEventId) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: sessionId, outlookEventId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Outlook update event called for session:', sessionId);
    console.log('Event ID:', outlookEventId);
    console.log('Updates:', { title, description, location, startTime, endTime });

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
        })
        .eq('id', sessionId);

      if (updateError) {
        console.error('Error updating session:', updateError);
      }

      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Calendar update pending - Microsoft Graph credentials not yet configured',
          status: 'pending'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get access token
    const accessToken = await getGraphAccessToken();

    // Build update payload (only include fields that are provided)
    const eventPayload: Record<string, unknown> = {};
    
    if (title) {
      eventPayload.subject = title;
    }
    
    if (description !== undefined) {
      eventPayload.body = {
        contentType: 'HTML',
        content: description || '',
      };
    }
    
    if (startTime) {
      eventPayload.start = {
        dateTime: startTime,
        timeZone: 'Europe/London',
      };
    }
    
    if (endTime) {
      eventPayload.end = {
        dateTime: endTime,
        timeZone: 'Europe/London',
      };
    }
    
    if (location !== undefined) {
      eventPayload.location = location ? { displayName: location } : null;
    }

    const graphUrl = `https://graph.microsoft.com/v1.0/users/${calendarOwner}/events/${outlookEventId}`;
    
    const graphResponse = await fetch(graphUrl, {
      method: 'PATCH',
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
    console.log('Event updated successfully');

    // Update session sync status
    const { error: updateError } = await supabase
      .from('practical_sessions')
      .update({
        calendar_sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
      })
      .eq('id', sessionId);

    if (updateError) {
      console.error('Error updating session:', updateError);
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
    console.error('Error in outlook-update-event:', error);
    return new Response(
      JSON.stringify({ error: error.message, status: 'failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
