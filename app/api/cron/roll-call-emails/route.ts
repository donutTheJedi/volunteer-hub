import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { createRollCallEmail } from '@/lib/email-templates';

// Create Supabase client with service role for cron jobs
function createSupabaseCronClient(opts?: { url?: string | null; key?: string | null }) {
  const url = (opts?.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL) || '';
  const key = (opts?.key ?? process.env.SUPABASE_SERVICE_ROLE_KEY) || '';
  if (!url) throw new Error('supabaseUrl is required.');
  if (!key) throw new Error('supabaseKey is required.');
  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Verify the request is from a legitimate cron service
function verifyCronRequest(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET;
  
  if (!cronSecret) {
    console.warn('[Cron] CRON_SECRET not set, allowing all requests');
    return true;
  }
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    console.error('[Cron] Missing or invalid authorization header');
    return false;
  }
  
  const token = authHeader.substring(7);
  return token === cronSecret;
}

export async function POST(request: NextRequest) {
  // Verify the request is legitimate
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Allow passing supabase URL and key via headers as a fallback
    const headerUrl = request.headers.get('x-supabase-url');
    const headerKey = request.headers.get('x-supabase-service-role-key');
    const supabase = createSupabaseCronClient({ url: headerUrl, key: headerKey });

    const now = new Date();

    // Buffer for scheduler jitter: look 2–12 minutes ahead
    const bufferStart = new Date(now.getTime() + 2 * 60 * 1000);
    const bufferEnd = new Date(now.getTime() + 12 * 60 * 1000);

    console.log('[Cron] [Roll Call] Looking for opportunities starting between', bufferStart.toISOString(), 'and', bufferEnd.toISOString());

    // Get opportunities starting soon and not already processed
    const { data: opps, error: oppError } = await supabase
      .from('opportunities')
      .select(`
        id,
        title,
        start_time,
        end_time,
        location,
        org_id,
        rollcall_email_sent_at,
        closed
      `)
      .gte('start_time', bufferStart.toISOString())
      .lte('start_time', bufferEnd.toISOString())
      .or('closed.is.null,closed.eq.false')
      .is('rollcall_email_sent_at', null);

    if (oppError) {
      console.error('[Cron] [Roll Call] Error fetching opportunities:', oppError);
      return NextResponse.json({ success: false, error: oppError.message, emailsSent: 0 }, { status: 500 });
    }

    if (!opps || opps.length === 0) {
      console.log('[Cron] [Roll Call] No opportunities starting in buffer window.');
      return NextResponse.json({ success: true, message: 'No opportunities starting soon.', emailsSent: 0 });
    }

    let emailsSent = 0;
    let emailsFailed = 0;

    // Only send when 2–9 mins away to approximate "~5 minutes before" without missing
    const minLeadMs = 2 * 60 * 1000;
    const maxLeadMs = 9 * 60 * 1000;

    for (const opp of opps) {
      const startTime = new Date(opp.start_time);
      const leadMs = startTime.getTime() - now.getTime();

      // Skip if not within send window (it will be picked up in a later run)
      if (leadMs < minLeadMs || leadMs > maxLeadMs) {
        console.log(
          `[Cron] [Roll Call] Skipping ${opp.title} (${opp.id}) leadMs=${leadMs}ms not within [${minLeadMs}, ${maxLeadMs}]`
        );
        continue;
      }

      console.log(`[Cron] [Roll Call] Processing opportunity: ${opp.title} (${opp.id})`);
      
      // Get the number of signups for this opportunity
      const { data: signups, error: signupError } = await supabase
        .from('signups')
        .select('user_id, name')
        .eq('opportunity_id', opp.id);

      if (signupError) {
        console.error('[Cron] [Roll Call] Error fetching signups:', signupError);
        emailsFailed++;
        continue;
      }

      const signupCount = signups?.length || 0;
      
      // Get organization details
      const { data: orgData, error: orgError } = await supabase
        .from('organizations')
        .select('name, owner, contact_email')
        .eq('id', opp.org_id)
        .single();
      
      if (orgError || !orgData) {
        console.error('[Cron] [Roll Call] Error fetching organization:', orgError, orgData);
        emailsFailed++;
        continue;
      }
      
      // Get the organizer's email from the organization's contact_email field
      if (!orgData.contact_email) {
        console.error('[Cron] [Roll Call] No contact email found for organization:', orgData.name);
        emailsFailed++;
        continue;
      }
      
      const organizerEmail = orgData.contact_email;
      console.log(`[Cron] [Roll Call] Using organizer email: ${organizerEmail} for opportunity ${opp.title}`);

      // Calculate estimated hours (difference between start and end time)
      let estimatedHours = 0;
      if (opp.start_time && opp.end_time) {
        const startTime = new Date(opp.start_time);
        const endTime = new Date(opp.end_time);
        estimatedHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // Convert to hours
      }

      try {
        // Create roll call URL
        const rollCallUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.voluna.org'}/roll-call/${opp.id}`;
        
        console.log(`[Cron] [Roll Call] Sending roll call email to ${organizerEmail} for ${opp.title}`);
        
        // Send the actual roll call email
        const emailHtml = createRollCallEmail({
          opportunityTitle: opp.title,
          startTime: new Date(opp.start_time).toLocaleString(),
          location: opp.location,
          signupCount: signupCount,
          estimatedHours: Math.round(estimatedHours * 10) / 10,
          rollCallUrl: rollCallUrl
        });
        
        await sendEmail({
          to: organizerEmail,
          subject: `🕐 Roll Call Ready: ${opp.title} starts soon!`,
          html: emailHtml
        });
        
        // Mark as sent to avoid duplicates
        const { error: updateError } = await supabase
          .from('opportunities')
          .update({ rollcall_email_sent_at: new Date().toISOString() })
          .eq('id', opp.id);
        if (updateError) {
          console.error('[Cron] [Roll Call] Failed to mark roll-call as sent:', updateError);
        }
        
        emailsSent++;
        console.log(`[Cron] [Roll Call] Roll call email sent to ${organizerEmail} for opportunity ${opp.title}`);
      } catch (error) {
        console.error('[Cron] [Roll Call] Failed to process roll call for organizer:', orgData.owner, error);
        emailsFailed++;
      }
    }

    const result = { success: true, emailsSent, emailsFailed };
    console.log('[Cron] [Roll Call] Job completed:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[Cron] [Roll Call] Error processing job:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 