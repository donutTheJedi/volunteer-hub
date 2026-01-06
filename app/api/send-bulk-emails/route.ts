import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';
import { sendEmail } from '@/lib/email';
import { createEmailWrapper } from '@/lib/email-templates';

export async function POST(req: NextRequest) {
  try {
    const { subject, message } = await req.json();
    
    if (!subject || !message) {
      return NextResponse.json({ success: false, error: 'Subject and message are required' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    
    // Verify the user is logged in and is an organization owner
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ success: false, error: 'Unauthorized - Please log in again' }, { status: 401 });
    }
    
    const user = session.user;

    // Check if user is an organization owner
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .eq('owner', user.id)
      .single();
    
    if (orgError || !org) {
      return NextResponse.json({ success: false, error: 'Only organization owners can send bulk emails' }, { status: 403 });
    }

    // Get all unique user IDs from signups
    const { data: signups, error: signupsError } = await supabase
      .from('signups')
      .select('user_id');
    
    if (signupsError) {
      console.error('Error fetching signups:', signupsError);
      return NextResponse.json({ success: false, error: 'Failed to fetch user list' }, { status: 500 });
    }

    // Get unique user IDs
    const uniqueUserIds = [...new Set((signups || []).map(s => s.user_id))];

    if (uniqueUserIds.length === 0) {
      return NextResponse.json({ success: true, message: 'No users found to email' });
    }

    let emailsSent = 0;
    let emailsFailed = 0;

    // Send emails to all unique users
    for (const userId of uniqueUserIds) {
      try {
        // Get user email from auth
        const { data, error: getUserError } = await supabase.auth.admin.getUserById(userId);
        const targetUser = data?.user;
        
        if (getUserError || !targetUser?.email) {
          console.error('Error fetching user or missing email:', getUserError, targetUser);
          emailsFailed++;
          continue;
        }

        const emailContent = `
          <h2 style="color: #16a34a; margin-top: 0; font-size: 24px;">Message from Voluna</h2>
          
          <div class="highlight-box">
            <div style="background-color: #f0fdf4; padding: 24px; border-radius: 12px; margin: 24px 0;">
              ${message.replace(/\n/g, '<br>')}
            </div>
          </div>
          
          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            This email was sent to you because you have signed up for volunteer opportunities through Voluna.
          </p>
        `;
        
        const emailHtml = createEmailWrapper(emailContent, 'Message from Voluna');
        
        await sendEmail({
          to: targetUser.email,
          subject: subject,
          html: emailHtml
        });
        
        emailsSent++;
        console.log(`Bulk email sent to ${targetUser.email}`);
      } catch (error) {
        console.error('Failed to send email to user:', userId, error);
        emailsFailed++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Emails sent successfully. ${emailsSent} sent, ${emailsFailed} failed.`,
      emailsSent,
      emailsFailed
    });

  } catch (error) {
    console.error('Bulk email error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 