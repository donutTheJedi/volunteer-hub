import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';
import { sendEmail } from '@/lib/email';
import { createEmailWrapper } from '@/lib/email-templates';

export async function POST(req: NextRequest) {
  try {
    const { opportunityId, subject, message } = await req.json();
    
    if (!opportunityId || !subject || !message) {
      return NextResponse.json({ success: false, error: 'Opportunity ID, subject, and message are required' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    
    // Verify the user is logged in
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ success: false, error: 'Unauthorized - Please log in again' }, { status: 401 });
    }
    
    const user = session.user;

    // Check if user owns the organization that owns this opportunity
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select(`
        id,
        title,
        organizations!inner (
          owner
        )
      `)
      .eq('id', opportunityId)
      .single();
    
    if (oppError || !opportunity) {
      return NextResponse.json({ success: false, error: 'Opportunity not found' }, { status: 404 });
    }

    if (opportunity.organizations[0]?.owner !== user.id) {
      return NextResponse.json({ success: false, error: 'Only the organization owner can send emails to volunteers' }, { status: 403 });
    }

    // Get all signups for this opportunity
    const { data: signups, error: signupsError } = await supabase
      .from('signups')
      .select('user_id, name')
      .eq('opportunity_id', opportunityId);

    if (signupsError) {
      console.error('Error fetching signups:', signupsError);
      return NextResponse.json({ success: false, error: 'Failed to fetch volunteer list' }, { status: 500 });
    }

    if (!signups || signups.length === 0) {
      return NextResponse.json({ success: true, message: 'No volunteers found for this opportunity' });
    }

    let emailsSent = 0;
    let emailsFailed = 0;

    // Send emails to all volunteers
    for (const signup of signups) {
      try {
        // Get user email from auth
        const { data, error: getUserError } = await supabase.auth.admin.getUserById(signup.user_id);
        const targetUser = data?.user;
        
        if (getUserError || !targetUser?.email) {
          console.error('Error fetching user or missing email:', getUserError, targetUser);
          emailsFailed++;
          continue;
        }

        const emailContent = `
          <h2 style="color: #16a34a; margin-top: 0; font-size: 24px;">Hi ${signup.name}! 👋</h2>
          
          <div class="highlight-box">
            <h3 style="color: #15803d; margin-top: 0; font-size: 20px;">Message about: ${opportunity.title}</h3>
            <div style="background-color: #f0fdf4; padding: 24px; border-radius: 12px; margin: 24px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            This email was sent to you because you signed up for the opportunity "${opportunity.title}".
          </p>
        `;
        
        const emailHtml = createEmailWrapper(emailContent, `Message: ${opportunity.title}`);
        
        await sendEmail({
          to: targetUser.email,
          subject: subject,
          html: emailHtml
        });
        
        emailsSent++;
        console.log(`Opportunity email sent to ${targetUser.email} for opportunity ${opportunity.title}`);
      } catch (error) {
        console.error('Failed to send email to volunteer:', signup.user_id, error);
        emailsFailed++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Emails sent successfully to volunteers. ${emailsSent} sent, ${emailsFailed} failed.`,
      emailsSent,
      emailsFailed
    });

  } catch (error) {
    console.error('Opportunity email error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 