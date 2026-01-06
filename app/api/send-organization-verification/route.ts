import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseServer';
import { sendOrganizationPendingEmail, sendOrganizationVerificationToAdmin } from '@/lib/email';

export async function POST(req: NextRequest) {
  try {
    const { organizationId } = await req.json();
    
    if (!organizationId) {
      console.error('Organization verification: Missing organizationId');
      return NextResponse.json({ success: false, error: 'Organization ID is required' }, { status: 400 });
    }

    console.log('Organization verification: Processing organizationId:', organizationId);

    const supabase = createSupabaseAdmin();
    
    // Get the organization details
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', organizationId)
      .single();

    if (orgError || !org) {
      console.error('Organization verification: Organization not found', orgError);
      return NextResponse.json({ success: false, error: 'Organization not found' }, { status: 404 });
    }

    console.log('Organization verification: Found organization:', org.name);

    // Get user profile for the owner name
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('full_name')
      .eq('user_id', org.owner)
      .single();

    // Get owner's email from auth
    const { data: userData, error: userError } = await supabase.auth.admin.getUserById(org.owner);
    const ownerEmail = userData?.user?.email || '';

    console.log('Organization verification: Owner email:', ownerEmail);

    const ownerName = profile?.full_name || 'Organization Owner';

    // Check if RESEND_API_KEY is set
    if (!process.env.RESEND_API_KEY) {
      console.error('Organization verification: RESEND_API_KEY not set');
      return NextResponse.json({ success: false, error: 'Email service not configured' }, { status: 500 });
    }

    try {
      // Send pending email to organization owner
      console.log('Organization verification: Sending pending email to owner');
      await sendOrganizationPendingEmail(org.owner, {
        name: ownerName,
        organizationName: org.name,
        organizationDescription: org.description,
        organizationCity: org.city,
        contactEmail: org.contact_email
      }, ownerEmail);
      console.log('Organization verification: Pending email sent successfully');
    } catch (pendingEmailError) {
      console.error('Organization verification: Failed to send pending email:', pendingEmailError);
    }

    try {
      // Send verification request to admin
      console.log('Organization verification: Sending verification email to admin');
      const baseVerificationUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'}/api/verify-organization?token=${org.verification_token}`;
      await sendOrganizationVerificationToAdmin({
        organizationName: org.name,
        organizationDescription: org.description,
        organizationCity: org.city,
        contactEmail: org.contact_email,
        ownerName: ownerName,
        ownerEmail: ownerEmail,
        verificationUrl: baseVerificationUrl
      });
      console.log('Organization verification: Admin email sent successfully');
    } catch (adminEmailError) {
      console.error('Organization verification: Failed to send admin email:', adminEmailError);
    }

    return NextResponse.json({ success: true, message: 'Verification emails sent successfully' });

  } catch (error) {
    console.error('Organization verification email error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 