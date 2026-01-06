import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer, createSupabaseAdmin } from '@/lib/supabaseServer';

export async function DELETE(request: NextRequest) {
  try {
    // Get the current user
    const supabase = await createSupabaseServer();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Parse request body to get confirmation data
    const body = await request.json();
    const { confirmText, password } = body;

    // Verify the confirmation text matches
    if (confirmText !== 'DELETE MY ACCOUNT') {
      return NextResponse.json({ 
        error: 'Confirmation text does not match' 
      }, { status: 400 });
    }

    // Verify password if provided (optional for some auth providers)
    if (password) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: user.email!,
        password: password
      });
      
      if (signInError) {
        return NextResponse.json({ 
          error: 'Invalid password' 
        }, { status: 400 });
      }
    }

    // Delete user data from all related tables
    const userId = user.id;
    
    // Delete from user_profiles
    await supabase
      .from('user_profiles')
      .delete()
      .eq('user_id', userId);

    // Delete from user_preferences
    await supabase
      .from('user_preferences')
      .delete()
      .eq('user_id', userId);

    // Delete from senior_projects (if user has any)
    await supabase
      .from('senior_projects')
      .delete()
      .eq('user_id', userId);

    // Delete from awarded_hours (if user has any)
    await supabase
      .from('awarded_hours')
      .delete()
      .eq('user_id', userId);

    // Delete from organizations where user is admin (this might need special handling)
    // For now, we'll just remove the user as admin but keep the organization
    await supabase
      .from('organizations')
      .update({ admin_user_id: null })
      .eq('admin_user_id', userId);

    // Finally, delete the user from Supabase Auth using admin client
    const adminClient = createSupabaseAdmin();
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(userId);
    
    if (deleteError) {
      console.error('Error deleting user:', deleteError);
      return NextResponse.json({ 
        error: 'Failed to delete account' 
      }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true,
      message: 'Account deleted successfully' 
    });

  } catch (error) {
    console.error('Account deletion error:', error);
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 });
  }
}
