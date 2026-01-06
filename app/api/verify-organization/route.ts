import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseServer';
import { sendEmail, sendOrganizationApprovedOrRejectedEmail } from '@/lib/email';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const token = searchParams.get('token');
    const action = searchParams.get('action'); // 'approve' or 'reject'
    
    if (!token || !action) {
      return NextResponse.json({ success: false, error: 'Missing token or action' }, { status: 400 });
    }

    if (!['approve', 'reject'].includes(action)) {
      return NextResponse.json({ success: false, error: 'Invalid action' }, { status: 400 });
    }

    const supabase = createSupabaseAdmin();
    
    console.log('Verification: Looking for organization with token:', token);
    
    // Find the organization by verification token
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*, owner')
      .eq('verification_token', token)
      .eq('verification_status', 'pending')
      .single();

    if (orgError) {
      console.error('Verification: Error finding organization:', orgError);
      return NextResponse.json({ success: false, error: 'Database error while finding organization' }, { status: 500 });
    }

    if (!org) {
      console.log('Verification: No organization found with token:', token);
      return NextResponse.json({ success: false, error: 'Invalid or expired verification token' }, { status: 404 });
    }

    console.log('Verification: Found organization:', org.name, 'with status:', org.verification_status);

    const newStatus = action === 'approve' ? 'approved' : 'rejected';
    
    console.log('Verification: Updating organization status to:', newStatus);
    
    // Update organization status
    const { error: updateError } = await supabase
      .from('organizations')
      .update({
        verification_status: newStatus,
        verified_at: new Date().toISOString(),
        verified_by: null // We could track who verified it if needed
      })
      .eq('id', org.id);

    if (updateError) {
      console.error('Verification: Error updating organization:', updateError);
      return NextResponse.json({ success: false, error: 'Failed to update organization status' }, { status: 500 });
    }

    console.log('Verification: Successfully updated organization status to:', newStatus);

    // Send notification email to organization owner (localized)
    try {
      await sendOrganizationApprovedOrRejectedEmail(org.owner, { name: '', organizationName: org.name }, action === 'approve');
    } catch (emailError) {
      console.error('Error sending notification email:', emailError);
      // Don't fail the whole request if email fails
    }

    // Return a user-friendly HTML response
    const statusText = action === 'approve' ? 'approved' : 'rejected';
    const message = action === 'approve' 
      ? `Organization "${org.name}" has been approved successfully! The organization owner will receive a notification email.`
      : `Organization "${org.name}" has been rejected. The organization owner will receive a notification email.`;
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Organization ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 40px 20px; }
          .success { color: #16a34a; }
          .warning { color: #dc2626; }
          .card { background: #f9fafb; border-radius: 8px; padding: 24px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <h1 class="${action === 'approve' ? 'success' : 'warning'}">
          Organization ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}
        </h1>
        <div class="card">
          <p>${message}</p>
          <p><strong>Organization:</strong> ${org.name}</p>
          <p><strong>Action:</strong> ${statusText.charAt(0).toUpperCase() + statusText.slice(1)}</p>
          <p><strong>Date:</strong> ${new Date().toLocaleString()}</p>
        </div>
        <p>You can close this tab now.</p>
      </body>
      </html>
    `;

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
      },
    });

  } catch (error) {
    console.error('Organization verification error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 