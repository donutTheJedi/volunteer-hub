import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseServer';
import { isAdminEmail } from '@/lib/admin-config';

export async function POST(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    const newOwnerId = searchParams.get('newOwnerId');
    
    // Check if request body contains email-based transfer
    let newOwnerEmail: string | null = null;
    let bodyOrgId: string | null = null;
    
    try {
      const body = await req.json();
      newOwnerEmail = body.newOwnerEmail;
      bodyOrgId = body.orgId;
    } catch {
      // No body or invalid JSON, continue with query params
    }

    const finalOrgId = bodyOrgId || orgId;
    
    if (!finalOrgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    if (!newOwnerId && !newOwnerEmail) {
      return NextResponse.json({ error: 'Either new owner ID or new owner email is required' }, { status: 400 });
    }

    // Ensure only the admin can call this endpoint
    const requesterEmail = req.headers.get('x-requester-email') || '';
    if (!isAdminEmail(requesterEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    // Verify the organization exists
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, owner')
      .eq('id', finalOrgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    let finalOwnerId: string;
    let finalOwnerEmail: string;

    if (newOwnerEmail) {
      // Email-based transfer - check if user exists
      const { data: existingUser } = await supabase.auth.admin.listUsers();
      const userExists = existingUser?.users?.find(u => u.email?.toLowerCase() === newOwnerEmail.toLowerCase());
      
      if (userExists) {
        // User exists - transfer ownership directly
        finalOwnerId = userExists.id;
        finalOwnerEmail = userExists.email!;
        
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ owner: finalOwnerId, pending_owner_email: null })
          .eq('id', finalOrgId);
          
        if (updateError) {
          console.error('Error transferring ownership:', updateError);
          return NextResponse.json({ error: 'Failed to transfer ownership' }, { status: 500 });
        }
      } else {
        // User doesn't exist yet - store the email as pending owner
        finalOwnerId = org.owner; // Keep current owner for now
        finalOwnerEmail = newOwnerEmail;
        
        const { error: updateError } = await supabase
          .from('organizations')
          .update({ pending_owner_email: newOwnerEmail })
          .eq('id', finalOrgId);
          
        if (updateError) {
          console.error('Error setting pending owner:', updateError);
          return NextResponse.json({ error: 'Failed to set pending owner' }, { status: 500 });
        }
      }
    } else {
      // User ID-based transfer
      const { data: newOwnerData, error: newOwnerError } = await supabase.auth.admin.getUserById(newOwnerId!);
      if (newOwnerError || !newOwnerData?.user) {
        return NextResponse.json({ error: 'New owner not found' }, { status: 404 });
      }
      finalOwnerId = newOwnerId!;
      finalOwnerEmail = newOwnerData.user.email!;
      
      const { error: updateError } = await supabase
        .from('organizations')
        .update({ owner: finalOwnerId, pending_owner_email: null })
        .eq('id', finalOrgId);
        
      if (updateError) {
        console.error('Error transferring ownership:', updateError);
        return NextResponse.json({ error: 'Failed to transfer ownership' }, { status: 500 });
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Ownership of "${org.name}" transferred to ${finalOwnerEmail}`,
      newOwnerId: finalOwnerId,
      newOwner: {
        id: finalOwnerId,
        email: finalOwnerEmail
      }
    });

  } catch (error: any) {
    console.error('Transfer ownership error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
