import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseAdmin } from '@/lib/supabaseServer';
import { isAdminEmail } from '@/lib/admin-config';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orgId,
      title,
      description,
      location,
      startTime,
      endTime,
      needed,
      photos,
      causeTags,
      skillsNeeded,
      isRemote,
      durationHours,
      frequency,
      ageGroup,
      difficultyLevel,
    } = body || {};

    if (!orgId || !title || !description || !location || !startTime || !endTime) {
      return NextResponse.json({ success: false, error: 'Missing required fields' }, { status: 400 });
    }

    // Ensure only the site owner can call this endpoint
    const requesterEmail = req.headers.get('x-requester-email') || '';
    if (!isAdminEmail(requesterEmail)) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createSupabaseAdmin();

    // Verify the organization exists and has a reach_out_email
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id, name, reach_out_email')
      .eq('id', orgId)
      .not('reach_out_email', 'is', null)
      .not('reach_out_email', 'eq', '')
      .single();

    if (orgError || !org) {
      return NextResponse.json({ success: false, error: 'Organization not found or not admin-managed' }, { status: 404 });
    }

    // Create the opportunity
    const { data: newOpportunity, error: insertError } = await supabase.from('opportunities').insert({
      org_id: orgId,
      title,
      description,
      location,
      start_time: startTime,
      end_time: endTime,
      needed: needed || 1,
      photos: photos || [],
      cause_tags: causeTags || [],
      skills_needed: skillsNeeded || [],
      is_remote: isRemote || false,
      duration_hours: durationHours || 2,
      frequency: frequency || 'one-off',
      age_group: ageGroup || 'all',
      difficulty_level: difficultyLevel || 'beginner',
    }).select().single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    return NextResponse.json({ 
      success: true, 
      opportunity: newOpportunity,
      organization: org
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error?.message || 'Unknown error' }, { status: 500 });
  }
}
