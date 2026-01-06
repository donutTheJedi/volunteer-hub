import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { createReminderEmail } from '@/lib/email-templates';

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
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);

    console.log('[Cron] [Reminder] Looking for opportunities between', in23h.toISOString(), 'and', in24h.toISOString());

    const { data: opps, error: oppError } = await supabase
      .from('opportunities')
      .select('id, title, start_time, end_time, location')
      .gte('start_time', in23h.toISOString())
      .lte('start_time', in24h.toISOString());

    if (oppError) {
      console.error('[Cron] [Reminder] Error fetching opportunities:', oppError);
      return NextResponse.json({ success: false, error: oppError.message, emailsSent: 0 }, { status: 500 });
    }
    
    if (!opps || opps.length === 0) {
      console.log('[Cron] [Reminder] No upcoming opportunities in the next 24 hours.');
      return NextResponse.json({ success: true, message: 'No upcoming opportunities.', emailsSent: 0 });
    }

    let emailsSent = 0;
    let emailsFailed = 0;

    for (const opp of opps) {
      console.log(`[Cron] [Reminder] Processing opportunity: ${opp.title} (${opp.id})`);
      const { data: signups, error: signupError } = await supabase
        .from('signups')
        .select('user_id, name, email')
        .eq('opportunity_id', opp.id);

      if (signupError) {
        console.error('[Cron] [Reminder] Error fetching signups:', signupError);
        continue;
      }

      for (const signup of signups) {
        try {
          // Get user email from signups table
          if (!signup.email) {
            console.error('[Cron] [Reminder] Missing email for signup:', signup);
            emailsFailed++;
            continue;
          }
          
          console.log(`[Cron] [Reminder] Sending reminder to ${signup.email} for ${opp.title}`);
          
          // Calculate estimated hours
          let estimatedHours = 0;
          if (opp.start_time) {
            const startTime = new Date(opp.start_time);
            const endTime = opp.end_time ? new Date(opp.end_time) : new Date(startTime.getTime() + 2 * 60 * 60 * 1000); // Default 2 hours
            estimatedHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
          }
          
          const emailHtml = createReminderEmail({
            name: signup.name,
            opportunityTitle: opp.title,
            startTime: new Date(opp.start_time).toLocaleString(),
            location: opp.location,
            estimatedHours: Math.round(estimatedHours * 10) / 10
          });
          
          await sendEmail({
            to: signup.email,
            subject: `Reminder: ${opp.title} is tomorrow!`,
            html: emailHtml
          });
          emailsSent++;
        } catch (error) {
          console.error('[Cron] [Reminder] Failed to send email:', error);
          emailsFailed++;
        }
      }
    }

    const result = { success: true, emailsSent, emailsFailed };
    console.log('[Cron] [Reminder] Job completed:', result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[Cron] [Reminder] Error processing job:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 