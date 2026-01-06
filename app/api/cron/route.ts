import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';
import { createReminderEmail, createRollCallEmail, createDailyDigestEmail, createSeniorProjectDailyDigestEmail } from '@/lib/email-templates';

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

// Send reminder emails for opportunities starting in 24 hours
async function sendReminderEmails(supabase: ReturnType<typeof createSupabaseCronClient>) {
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
    return { success: false, error: oppError.message, emailsSent: 0 };
  }
  
  if (!opps || opps.length === 0) {
    console.log('[Cron] [Reminder] No upcoming opportunities in the next 24 hours.');
    return { success: true, message: 'No upcoming opportunities.', emailsSent: 0 };
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

  return { success: true, emailsSent, emailsFailed };
}

// Send roll call emails with jitter tolerance and idempotency
async function sendRollCallEmails(supabase: ReturnType<typeof createSupabaseCronClient>) {
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
    return { success: false, error: oppError.message, emailsSent: 0 };
  }

  if (!opps || opps.length === 0) {
    console.log('[Cron] [Roll Call] No opportunities starting in buffer window.');
    return { success: true, message: 'No opportunities starting soon.', emailsSent: 0 };
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
      .select('user_id, name, email')
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

  return { success: true, emailsSent, emailsFailed };
}

// Send daily digest emails to organizations with reach_out_email
async function sendDailyDigestEmails(supabase: ReturnType<typeof createSupabaseCronClient>) {
  console.log('[Cron] [Daily Digest] Starting daily digest email job');

  // Get all organizations that have a reach_out_email
  const { data: organizations, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, reach_out_email')
    .not('reach_out_email', 'is', null)
    .not('reach_out_email', 'eq', '');

  if (orgError) {
    console.error('[Cron] [Daily Digest] Error fetching organizations:', orgError);
    return { success: false, error: orgError.message, emailsSent: 0 };
  }

  if (!organizations || organizations.length === 0) {
    console.log('[Cron] [Daily Digest] No organizations with reach-out emails found');
    return { success: true, message: 'No organizations with reach-out emails found', emailsSent: 0 };
  }

  let emailsSent = 0;
  let emailsFailed = 0;

  // Process each organization
  for (const org of organizations) {
    try {
      // Get today's signups for this organization
      // Use UTC to ensure consistent behavior regardless of server timezone
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      // Get opportunities for this organization first
      const { data: opportunities, error: oppsError } = await supabase
        .from('opportunities')
        .select('id, title')
        .eq('org_id', org.id);

      if (oppsError || !opportunities || opportunities.length === 0) {
        console.log(`[Cron] [Daily Digest] No opportunities found for org ${org.id}`);
        continue;
      }

      const opportunityIds = opportunities.map(opp => opp.id);

      // Get signups for these opportunities from today
      const { data: signups, error: signupsError } = await supabase
        .from('signups')
        .select('name, email, phone, institute, opportunity_id, created_at')
        .in('opportunity_id', opportunityIds)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (signupsError) {
        console.error(`[Cron] [Daily Digest] Error fetching signups for org ${org.id}:`, signupsError);
        emailsFailed++;
        continue;
      }

      // Skip if no signups today
      if (!signups || signups.length === 0) {
        console.log(`[Cron] [Daily Digest] No signups today for org ${org.id}`);
        continue;
      }

      // Format signup data
      const opportunitiesMap = new Map(opportunities.map(opp => [opp.id, opp.title]));
      const formattedSignups = signups.map(signup => ({
        volunteerName: signup.name || 'Unknown',
        volunteerEmail: signup.email || 'No email provided',
        volunteerPhone: signup.phone || 'No phone provided',
        volunteerInstitution: signup.institute || 'No institution provided',
        opportunityTitle: opportunitiesMap.get(signup.opportunity_id) || 'Unknown opportunity',
        signupDate: new Date(signup.created_at).toLocaleDateString()
      }));

      console.log(`[Cron] [Daily Digest] Processing ${org.name}: ${formattedSignups.length} signups today`);

      // Create and send the daily digest email
      const emailHtml = createDailyDigestEmail({
        organizationName: org.name,
        organizationId: org.id,
        signups: formattedSignups,
        totalSignups: formattedSignups.length
      });

      console.log(`[Cron] [Daily Digest] Attempting to send email to: ${org.reach_out_email}`);
      console.log(`[Cron] [Daily Digest] Organization: ${org.name} (${org.id})`);
      console.log(`[Cron] [Daily Digest] Signups count: ${formattedSignups.length}`);
      
      const emailResult = await sendEmail({
        to: org.reach_out_email!,
        subject: `Volunteer Sign-ups - ${org.name}`,
        html: emailHtml
      });

      console.log(`[Cron] [Daily Digest] Email result:`, JSON.stringify(emailResult, null, 2));
      emailsSent++;
      console.log(`[Cron] [Daily Digest] Daily digest sent to ${org.reach_out_email} for organization ${org.name} (${formattedSignups.length} signups)`);
    } catch (error) {
      console.error(`[Cron] [Daily Digest] Failed to send daily digest for organization ${org.id}:`, error);
      emailsFailed++;
    }
  }

  return { success: true, emailsSent, emailsFailed };
}

// Send daily digest emails to senior project owners
async function sendSeniorProjectDailyDigestEmails(supabase: ReturnType<typeof createSupabaseCronClient>) {
  console.log('[Cron] [Senior Project Daily Digest] Starting senior project daily digest email job');

  // Get all senior projects with their owners
  const { data: projects, error: projectsError } = await supabase
    .from('senior_projects')
    .select(`
      id,
      title,
      user_id
    `);

  if (projectsError) {
    console.error('[Cron] [Senior Project Daily Digest] Error fetching projects:', projectsError);
    return { success: false, error: projectsError.message, emailsSent: 0 };
  }

  if (!projects || projects.length === 0) {
    console.log('[Cron] [Senior Project Daily Digest] No senior projects found');
    return { success: true, message: 'No senior projects found', emailsSent: 0 };
  }

  let emailsSent = 0;
  let emailsFailed = 0;

  // Process each project
  for (const project of projects) {
    try {
      // Get today's signups for this project
      // Use UTC to ensure consistent behavior regardless of server timezone
      const today = new Date();
      today.setUTCHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);

      const { data: signups, error: signupsError } = await supabase
        .from('senior_project_signups')
        .select('name, email, created_at')
        .eq('project_id', project.id)
        .gte('created_at', today.toISOString())
        .lt('created_at', tomorrow.toISOString());

      if (signupsError) {
        console.error(`[Cron] [Senior Project Daily Digest] Error fetching signups for project ${project.id}:`, signupsError);
        emailsFailed++;
        continue;
      }

      // Skip if no signups today
      if (!signups || signups.length === 0) {
        console.log(`[Cron] [Senior Project Daily Digest] No signups today for project: ${project.title}`);
        continue;
      }

      // Get the project owner's email
      const { data: ownerData, error: ownerError } = await supabase.auth.admin.getUserById(project.user_id);
      
      if (ownerError || !ownerData?.user?.email) {
        console.error(`[Cron] [Senior Project Daily Digest] Error fetching owner email for project ${project.id}:`, ownerError);
        emailsFailed++;
        continue;
      }

      const ownerEmail = ownerData.user.email;
      
      // Format signup data
      const formattedSignups = signups.map(signup => ({
        volunteerName: signup.name || 'Unknown',
        volunteerEmail: signup.email || 'No email provided',
        signupDate: new Date(signup.created_at).toLocaleDateString()
      }));

      console.log(`[Cron] [Senior Project Daily Digest] Processing ${project.title}: ${formattedSignups.length} signups today`);

      // Create and send the daily digest email
      const emailHtml = createSeniorProjectDailyDigestEmail({
        projectTitle: project.title,
        signups: formattedSignups,
        totalSignups: formattedSignups.length
      });

      await sendEmail({
        to: ownerEmail,
        subject: `Senior Project Sign-ups - ${project.title}`,
        html: emailHtml
      });

      emailsSent++;
      console.log(`[Cron] [Senior Project Daily Digest] Daily digest sent to ${ownerEmail} for project ${project.title} (${formattedSignups.length} signups)`);
    } catch (error) {
      console.error(`[Cron] [Senior Project Daily Digest] Failed to send daily digest for project ${project.id}:`, error);
      emailsFailed++;
    }
  }

  return { success: true, emailsSent, emailsFailed };
}

// Roll forward recurring opportunities so only one instance exists at a time
async function rollForwardOpportunities(supabase: ReturnType<typeof createSupabaseCronClient>) {
  const now = new Date();

  // Fetch recurring opportunities that have ended
  const { data: opps, error: oppError } = await supabase
    .from('opportunities')
    .select('id, start_time, end_time, duration_hours, frequency')
    .or('closed.is.null,closed.eq.false')
    .in('frequency', ['daily', 'weekly', 'monthly'])
    .lte('end_time', now.toISOString());

  if (oppError) {
    console.error('[Cron] [Roll Forward] Error fetching opportunities:', oppError);
    return { success: false, error: oppError.message, updated: 0 };
  }

  if (!opps || opps.length === 0) {
    console.log('[Cron] [Roll Forward] No recurring opportunities to roll forward.');
    return { success: true, updated: 0 };
  }

  let updated = 0;

  for (const opp of opps) {
    try {
      const currentStart = new Date(opp.start_time);
      const currentEnd = opp.end_time ? new Date(opp.end_time) : null;
      const durationMs = currentEnd && currentStart ? (currentEnd.getTime() - currentStart.getTime())
        : (opp.duration_hours ? opp.duration_hours * 60 * 60 * 1000 : 2 * 60 * 60 * 1000);

      let nextStart = new Date(currentStart);
      let nextEnd = new Date(currentStart.getTime() + durationMs);

      const advance = (date: Date) => {
        if (opp.frequency === 'daily') {
          date.setDate(date.getDate() + 1);
        } else if (opp.frequency === 'weekly') {
          date.setDate(date.getDate() + 7);
        } else if (opp.frequency === 'monthly') {
          date.setMonth(date.getMonth() + 1);
        }
      };

      // Ensure we advance until the end is in the future (handles missed runs)
      do {
        advance(nextStart);
        advance(nextEnd);
      } while (nextEnd.getTime() <= now.getTime());

      const { error: updateError } = await supabase
        .from('opportunities')
        .update({
          start_time: nextStart.toISOString(),
          end_time: nextEnd.toISOString(),
          // Reset roll-call email marker for the new occurrence
          rollcall_email_sent_at: null
        })
        .eq('id', opp.id);

      if (updateError) {
        console.error('[Cron] [Roll Forward] Failed to update opportunity', opp.id, updateError);
        continue;
      }

      updated++;
    } catch (e) {
      console.error('[Cron] [Roll Forward] Unexpected error processing opportunity', opp.id, e);
    }
  }

  console.log(`[Cron] [Roll Forward] Updated ${updated} opportunities`);
  return { success: true, updated };
}

export async function POST(request: NextRequest) {
  // Verify the request is legitimate
  if (!verifyCronRequest(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { job } = await request.json();
    
    if (!job) {
      return NextResponse.json({ error: 'Job type is required' }, { status: 400 });
    }

    // Allow passing supabase URL and key via headers as a fallback
    const headerUrl = request.headers.get('x-supabase-url');
    const headerKey = request.headers.get('x-supabase-service-role-key');
    const supabase = createSupabaseCronClient({ url: headerUrl, key: headerKey });

    console.log(`[Cron] Starting job: ${job}`);

    let result;
    switch (job) {
      case 'reminder-emails':
        result = await sendReminderEmails(supabase);
        break;
      case 'roll-call-emails':
        result = await sendRollCallEmails(supabase);
        break;
      case 'daily-digest-emails':
        result = await sendDailyDigestEmails(supabase);
        break;
      case 'senior-project-daily-digest':
        result = await sendSeniorProjectDailyDigestEmails(supabase);
        break;
      case 'roll-forward-opportunities':
        result = await rollForwardOpportunities(supabase);
        break;
      default:
        return NextResponse.json({ error: 'Invalid job type' }, { status: 400 });
    }

    console.log(`[Cron] Job ${job} completed:`, result);
    return NextResponse.json(result);

  } catch (error) {
    console.error('[Cron] Error processing job:', error);
    return NextResponse.json({ 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
} 