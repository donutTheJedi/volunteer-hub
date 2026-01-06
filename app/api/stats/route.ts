import { NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseServer';

export async function GET() {
  try {
    const supabase = createSupabaseAdmin();
    
    // Only fetch aggregate counts, no sensitive data
    const [
      { count: volunteers },
      { count: organizations },
      { data: hoursData }
    ] = await Promise.all([
      supabase
        .from('user_profiles')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('organizations')
        .select('id', { count: 'exact', head: true }),
      supabase
        .from('volunteer_hours')
        .select('hours_awarded')
    ]);

    const totalHours = hoursData?.reduce((sum, record) => sum + (record.hours_awarded || 0), 0) || 0;

    return NextResponse.json({
      volunteers: volunteers || 0,
      organizations: organizations || 0,
      hoursDonated: totalHours
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    return NextResponse.json({
      volunteers: 0,
      organizations: 0,
      hoursDonated: 0
    });
  }
}
