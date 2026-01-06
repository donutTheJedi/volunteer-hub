import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';
import { sendEmail } from '@/lib/email';
import { createDailyDigestEmail } from '@/lib/email-templates';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    
    // Get all organizations that have a reach_out_email
    const { data: organizations, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, reach_out_email')
      .not('reach_out_email', 'is', null)
      .not('reach_out_email', 'eq', '');

    if (orgError) {
      console.error('Error fetching organizations:', orgError);
      return NextResponse.json({ success: false, error: 'Failed to fetch organizations' }, { status: 500 });
    }

    if (!organizations || organizations.length === 0) {
      return NextResponse.json({ success: true, message: 'No organizations with reach-out emails found' });
    }

    let emailsSent = 0;
    let emailsFailed = 0;

    // Process each organization
    for (const org of organizations) {
      try {
        // Get today's signups for this organization
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);

        // Get opportunities for this organization first
        const { data: opportunities, error: oppsError } = await supabase
          .from('opportunities')
          .select('id, title')
          .eq('org_id', org.id);

        if (oppsError || !opportunities || opportunities.length === 0) {
          console.log(`No opportunities found for org ${org.id}`);
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
          console.error(`Error fetching signups for org ${org.id}:`, signupsError);
          emailsFailed++;
          continue;
        }

        // Skip if no signups today
        if (!signups || signups.length === 0) {
          console.log(`No signups today for org ${org.id}`);
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

        // Create and send the daily digest email
        const emailHtml = createDailyDigestEmail({
          organizationName: org.name,
          organizationId: org.id,
          signups: formattedSignups,
          totalSignups: formattedSignups.length
        });

        await sendEmail({
          to: org.reach_out_email!,
          subject: `Volunteer Sign-ups - ${org.name}`,
          html: emailHtml
        });

        emailsSent++;
        console.log(`Daily digest sent to ${org.reach_out_email} for organization ${org.name} (${formattedSignups.length} signups)`);
      } catch (error) {
        console.error(`Failed to send daily digest for organization ${org.id}:`, error);
        emailsFailed++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Daily digest emails sent successfully. ${emailsSent} sent, ${emailsFailed} failed.`,
      emailsSent,
      emailsFailed
    });

  } catch (error) {
    console.error('Daily digest email error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
