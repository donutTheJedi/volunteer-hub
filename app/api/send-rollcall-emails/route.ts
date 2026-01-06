import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { sendEmail } from '@/lib/email';

export async function POST() {
  const now = new Date();
  const in5min = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
  const in6min = new Date(now.getTime() + 6 * 60 * 1000); // 6 minutes from now (1 minute window)

  console.log('[Roll Call] Looking for opportunities starting between', in5min.toISOString(), 'and', in6min.toISOString());

  // Get opportunities starting in 5-6 minutes
  const { data: opps, error: oppError } = await supabase
    .from('opportunities')
    .select(`
      id, 
      title, 
      start_time, 
      end_time,
      location,
      org_id
    `)
    .gte('start_time', in5min.toISOString())
    .lte('start_time', in6min.toISOString())
    .eq('closed', false);

  if (oppError) {
    console.error('[Roll Call] Error fetching opportunities:', oppError);
    return NextResponse.json({ success: false, error: oppError.message }, { status: 500 });
  }

  if (!opps || opps.length === 0) {
    console.log('[Roll Call] No opportunities starting in 5-6 minutes.');
    return NextResponse.json({ success: true, message: 'No opportunities starting soon.' });
  }

  let emailsSent = 0;
  let emailsFailed = 0;

  for (const opp of opps) {
    console.log(`[Roll Call] Processing opportunity: ${opp.title} (${opp.id})`);
    
    // Get the number of signups for this opportunity
    const { data: signups, error: signupError } = await supabase
      .from('signups')
      .select('user_id, name')
      .eq('opportunity_id', opp.id);

    if (signupError) {
      console.error('[Roll Call] Error fetching signups:', signupError);
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
      console.error('[Roll Call] Error fetching organization:', orgError, orgData);
      emailsFailed++;
      continue;
    }
    
    // Get the organizer's email from the organization's contact_email field
    if (!orgData.contact_email) {
      console.error('[Roll Call] No contact email found for organization:', orgData.name);
      emailsFailed++;
      continue;
    }
    
    const organizerEmail = orgData.contact_email;
    
    console.log(`[Roll Call] Using organizer email: ${organizerEmail} for opportunity ${opp.title}`);

    // Calculate estimated hours (difference between start and end time)
    let estimatedHours = 0;
    if (opp.start_time && opp.end_time) {
      const startTime = new Date(opp.start_time);
      const endTime = new Date(opp.end_time);
      estimatedHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // Convert to hours
    }

    try {
      // Create roll call URL - we'll create this page next
      const rollCallUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.voluna.org'}/roll-call/${opp.id}`;
      
      console.log(`[Roll Call] Would send roll call email to ${organizerEmail} for ${opp.title}`);
      console.log(`[Roll Call] Roll call URL: ${rollCallUrl}`);
      console.log(`[Roll Call] Opportunity details:`, {
        title: opp.title,
        startTime: opp.start_time,
        location: opp.location,
        signupCount,
        estimatedHours,
        organizerEmail: organizerEmail
      });
      
      // Send the actual roll call email
      await sendEmail({
        to: organizerEmail,
        subject: `🕐 Roll Call Ready: ${opp.title} starts in 5 minutes!`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #f9fafb; padding: 20px;">
            <div style="background-color: white; padding: 30px; border-radius: 12px; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);">
              <h1 style="color: #16a34a; margin-bottom: 20px; font-size: 24px;">🕐 Roll Call Time!</h1>
              
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 6px;">
                <p style="margin: 0; color: #92400e; font-weight: 600;">
                  <strong>${opp.title}</strong> starts in 5 minutes!
                </p>
              </div>

              <div style="background-color: #f0fdf4; padding: 20px; border-radius: 8px; margin: 20px 0;">
                <h3 style="color: #15803d; margin-top: 0;">Opportunity Details:</h3>
                <p style="margin: 5px 0;"><strong>Event:</strong> ${opp.title}</p>
                <p style="margin: 5px 0;"><strong>Start Time:</strong> ${new Date(opp.start_time).toLocaleString()}</p>
                ${opp.location ? `<p style="margin: 5px 0;"><strong>Location:</strong> ${opp.location}</p>` : ''}
                <p style="margin: 5px 0;"><strong>Volunteers Signed Up:</strong> ${signupCount}</p>
                ${estimatedHours > 0 ? `<p style="margin: 5px 0;"><strong>Estimated Hours:</strong> ${estimatedHours.toFixed(1)} hours</p>` : ''}
              </div>

              <div style="text-align: center; margin: 30px 0;">
                <a href="${rollCallUrl}" 
                   style="background-color: #16a34a; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px; display: inline-block;">
                  📋 Take Roll Call
                </a>
              </div>

              <div style="background-color: #eff6ff; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #1e40af; margin-top: 0;">How Roll Call Works:</h4>
                <ul style="color: #1e40af; padding-left: 20px;">
                  <li>Click the button above to open the roll call page</li>
                  <li>Mark who attended and who didn't show up</li>
                  <li>Volunteer hours will be automatically awarded to attendees</li>
                  <li>You can access roll call anytime during or after the event</li>
                </ul>
              </div>

              <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
                This email was sent because your opportunity "${opp.title}" is starting soon and you need to take roll call.
              </p>
            </div>
          </div>
        `
      });
      
      emailsSent++;
      console.log(`[Roll Call] Roll call email would be sent to ${organizerEmail} for opportunity ${opp.title}`);
    } catch (error) {
      console.error('[Roll Call] Failed to process roll call for organizer:', orgData.owner, error);
      emailsFailed++;
    }
  }

  return NextResponse.json({ 
    success: true, 
    message: `Roll call emails processed. ${emailsSent} sent, ${emailsFailed} failed.`,
    emailsSent,
    emailsFailed
  });
} 