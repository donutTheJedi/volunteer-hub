import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseServer';
import { isAdminEmail } from '@/lib/admin-config';

export async function GET(req: NextRequest) {
  try {
    // Ensure only the admin can call this endpoint
    const requesterEmail = req.headers.get('x-requester-email') || '';
    if (!isAdminEmail(requesterEmail)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    // Get all users from auth
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    // Format users for the dropdown
    const formattedUsers = users.map(user => ({
      id: user.id,
      email: user.email || 'No email',
      name: user.user_metadata?.name || user.user_metadata?.full_name || null
    })).sort((a, b) => a.email.localeCompare(b.email));

    return NextResponse.json({ 
      success: true, 
      users: formattedUsers
    });

  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
