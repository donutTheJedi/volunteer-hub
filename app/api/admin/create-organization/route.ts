import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseServer';
import { isAdminEmail } from '@/lib/admin-config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      name,
      description,
      city,
      contactEmail,
      ownerEmail,
      reachOutEmail,
      photos,
      logo,
      locale,
    } = body || {};

    if (!name || !description || !city || !contactEmail || !Array.isArray(photos)) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure only the site owner can call this endpoint
    // We cannot read the requester session directly here with the service client,
    // so we require a header "x-requester-email" that the client sends from the logged-in session.
    const requesterEmail = req.headers.get('x-requester-email') || '';
    if (!isAdminEmail(requesterEmail)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    // Try to find or create the owner user by email (only if ownerEmail is provided)
    let ownerUserId: string | null = null;

    if (ownerEmail) {
      try {
        // List users and find by email (best-effort lookup)
        const { data: listData, error: listError } = await supabase.auth.admin.listUsers();
        if (listError) {
          // Continue; we will try invite pathway
          // eslint-disable-next-line no-console
          console.warn('List users error, continuing with invite:', listError);
        } else {
          const match = listData.users.find((u: any) => u.email?.toLowerCase() === String(ownerEmail).toLowerCase());
          if (match) {
            ownerUserId = match.id;
          }
        }
      } catch (err) {
        // ignore and proceed to invite
      }

      if (!ownerUserId) {
        // Invite the user by email; this creates a user record if not existing
        // Include a redirect URL so the invite link lands on our auth callback
        const origin = req.headers.get('origin') || process.env.NEXT_PUBLIC_SITE_URL || '';
        const resolvedLocale = typeof locale === 'string' && locale.trim() ? locale.trim() : 'en';
        const redirectTo = origin ? `${origin}/${resolvedLocale}/auth/callback` : undefined;
        const { data: inviteData, error: inviteError } = await supabase.auth.admin.inviteUserByEmail(ownerEmail, { redirectTo });
        if (inviteError) {
          // If invite failed (e.g., user already exists), try again to locate user via list
          const { data: listData2 } = await supabase.auth.admin.listUsers();
          const match2 = listData2?.users?.find((u: any) => u.email?.toLowerCase() === String(ownerEmail).toLowerCase());
          if (!match2) {
            return NextResponse.json({ success: false, error: 'Unable to create or find owner user' }, { status: 500 });
          }
          ownerUserId = match2.id;
        } else {
          ownerUserId = inviteData.user?.id || null;
          if (!ownerUserId) {
            return NextResponse.json({ success: false, error: 'Invite did not return user id' }, { status: 500 });
          }
        }
      }
    }

    // Insert organization with resolved owner id
    const verificationToken = (globalThis.crypto as any)?.randomUUID?.() || `token-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
    
    // Admin-created organizations should be automatically approved
    const verificationStatus = ownerUserId ? 'pending' : 'approved';
    
    const { data: newOrg, error: insertError } = await supabase.from('organizations').insert({
      name,
      description,
      owner: ownerUserId,
      photos,
      logo,
      city,
      contact_email: contactEmail,
      reach_out_email: reachOutEmail,
      verification_status: verificationStatus,
      verification_token: verificationToken,
    }).select().single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      organization: newOrg,
      shouldSendVerificationEmails: !!ownerUserId // Only send verification emails if there's an owner
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}


