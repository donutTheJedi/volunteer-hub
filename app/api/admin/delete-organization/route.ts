import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabaseServer';
import { isAdminEmail } from '@/lib/admin-config';

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orgId = searchParams.get('orgId');
    
    if (!orgId) {
      return NextResponse.json({ error: 'Organization ID is required' }, { status: 400 });
    }

    // Ensure only the site owner can call this endpoint
    // We cannot read the requester session directly here with the service client,
    // so we require a header "x-requester-email" that the client sends from the logged-in session.
    const requesterEmail = req.headers.get('x-requester-email') || '';
    if (!isAdminEmail(requesterEmail)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Use admin client to verify the organization exists and is admin-managed
    const adminSupabase = createSupabaseAdmin();
    const { data: org, error: orgError } = await adminSupabase
      .from('organizations')
      .select('id, name, reach_out_email, owner')
      .eq('id', orgId)
      .single();

    if (orgError || !org) {
      return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
    }

    // Only allow deletion of admin-managed organizations (those with reach_out_email)
    if (!org.reach_out_email) {
      return NextResponse.json({ error: 'Only admin-managed organizations can be deleted via this endpoint' }, { status: 403 });
    }

    // Use admin client to delete the organization
    const { error: deleteError } = await adminSupabase
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (deleteError) {
      console.error('Error deleting organization:', deleteError);
      return NextResponse.json({ error: 'Failed to delete organization' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: `Organization "${org.name}" deleted successfully` }, { status: 200 });

  } catch (error) {
    console.error('Admin delete organization error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
