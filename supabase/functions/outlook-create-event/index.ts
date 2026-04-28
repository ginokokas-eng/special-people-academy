import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CreateEventRequest {
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

function escapeHtml(unsafe: string): string {
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function buildEventBody(session: any, course: any, trainerName: string | null, bookedCount: number): string {
  const safeTitle = escapeHtml(course?.title || 'Training');
  const safeDeliveryType = escapeHtml(course?.delivery_type || 'In-person Practical');
  const safeTrainer = escapeHtml(trainerName || 'TBC');
  const safeLocation = escapeHtml(session?.location || 'TBC');
  const safeNotes = session?.notes ? escapeHtml(session.notes) : '';
  const safeMax = Number(session?.max_attendees) || 20;
  const safeBooked = Number(bookedCount) || 0;

  return `
    <h2>${safeTitle} — Practical Session</h2>
    <table style="border-collapse: collapse; margin: 10px 0;">
      <tr><td style="padding: 5px 10px 5px 0; font-weight: bold;">Course:</td><td>${safeTitle}</td></tr>
      <tr><td style="padding: 5px 10px 5px 0; font-weight: bold;">Delivery Type:</td><td>${safeDeliveryType}</td></tr>
      <tr><td style="padding: 5px 10px 5px 0; font-weight: bold;">Trainer:</td><td>${safeTrainer}</td></tr>
      <tr><td style="padding: 5px 10px 5px 0; font-weight: bold;">Capacity:</td><td>Booked: ${safeBooked}/${safeMax}</td></tr>
      <tr><td style="padding: 5px 10px 5px 0; font-weight: bold;">Location:</td><td>${safeLocation}</td></tr>
    </table>
    ${safeNotes ? `<p><strong>Notes:</strong> ${safeNotes}</p>` : ''}
    <hr style="margin: 15px 0; border: none; border-top: 1px solid #ccc;" />
    <p style="font-size: 12px; color: #666;">
      This is an internal admin calendar event. Do not share externally.<br/>
      <em>Managed by SPA Training Platform</em>
    </p>
  `.trim();
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    const { sessionId }: CreateEventRequest = await req.json();

    if (!sessionId) {
      return new Response(
        JSON.stringify({ error: 'Missing required field: sessionId' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Outlook create event called for session:', sessionId);

    // Fetch session with course details
    const { data: session, error: sessionError } = await supabase
      .from('practical_sessions')
      .select(`
        id,
        course_id,
        session_date,
        location,
        max_attendees,
        notes,
        trainer_id,
        outlook_event_id,
        outlook_calendar_owner,
        courses(id, title, delivery_type)
      `)
      .eq('id', sessionId)
      .single();

    if (sessionError || !session) {
      console.error('Session not found:', sessionError);
      return new Response(
        JSON.stringify({ error: 'Session not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // If event already exists, redirect to update (idempotent)
    if (session.outlook_event_id) {
      console.log('Event already exists, redirecting to update');
      // Forward to update function internally
      const updateResponse = await fetch(`${supabaseUrl}/functions/v1/outlook-update-event`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': req.headers.get('Authorization') || '',
        },
        body: JSON.stringify({ sessionId }),
      });
      const updateData = await updateResponse.json();
      return new Response(JSON.stringify(updateData), {
        status: updateResponse.status,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const calendarOwner = Deno.env.get('OUTLOOK_CALENDAR_OWNER_EMAIL') || 'training@specialpeople.org.uk';
    const course = session.courses as any;

    // Check if Microsoft credentials are configured
    const tenantId = Deno.env.get('MS_TENANT_ID');
    const clientId = Deno.env.get('MS_CLIENT_ID');
    const clientSecret = Deno.env.get('MS_CLIENT_SECRET');

    if (!tenantId || !clientId || !clientSecret) {
      // Credentials not configured
      await supabase
        .from('practical_sessions')
        .update({
          calendar_sync_status: 'not_configured',
          outlook_calendar_owner: calendarOwner,
          calendar_last_error: 'Microsoft Graph credentials not configured',
        })
        .eq('id', sessionId);

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: 'Microsoft Graph credentials not configured',
          status: 'not_configured'
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get trainer name
    let trainerName = null;
    if (session.trainer_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('user_id', session.trainer_id)
        .maybeSingle();
      trainerName = profile?.full_name || null;
    }

    // Get booked count
    const { count: bookedCount } = await supabase
      .from('practical_attendance')
      .select('*', { count: 'exact', head: true })
      .eq('session_id', sessionId);

    // Get access token
    const accessToken = await getGraphAccessToken();

    // Calculate end time (3 hours after start)
    const startDate = new Date(session.session_date);
    const endDate = new Date(startDate.getTime() + 3 * 60 * 60 * 1000);

    // Create event payload
    const eventPayload = {
      subject: `${course?.title || 'Training'} — Practical Session`,
      body: {
        contentType: 'HTML',
        content: buildEventBody(session, course || { title: 'Training', delivery_type: 'In-person' }, trainerName, bookedCount || 0),
      },
      start: {
        dateTime: startDate.toISOString().slice(0, -1), // Remove Z for timezone-aware format
        timeZone: 'Europe/London',
      },
      end: {
        dateTime: endDate.toISOString().slice(0, -1),
        timeZone: 'Europe/London',
      },
      location: session.location ? { displayName: session.location } : undefined,
      isOnlineMeeting: false,
      showAs: 'busy',
      categories: ['Training Session'],
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
      
      await supabase
        .from('practical_sessions')
        .update({
          calendar_sync_status: 'failed',
          outlook_calendar_owner: calendarOwner,
          calendar_last_error: `Microsoft Graph API error: ${graphResponse.status} - ${errorText.slice(0, 500)}`,
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
        calendar_sync_status: 'ok',
        last_synced_at: new Date().toISOString(),
        calendar_last_error: null,
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
        status: 'ok'
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in outlook-create-event:', error);
    
    // Try to update session with error
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
      JSON.stringify({ error: 'Calendar sync failed', status: 'failed' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
