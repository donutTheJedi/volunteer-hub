import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const {
      opportunityId,
      overrides
    } = await req.json();

    if (!opportunityId) {
      return NextResponse.json({ success: false, error: 'opportunityId is required' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();

    // Verify the user is logged in
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const user = session.user;

    // Load the opportunity with org ownership to validate permissions
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select(`
        id,
        org_id,
        title,
        description,
        location,
        start_time,
        end_time,
        needed,
        photos,
        cause_tags,
        skills_needed,
        is_remote,
        duration_hours,
        frequency,
        age_group,
        difficulty_level,
        organizations!inner(owner)
      `)
      .eq('id', opportunityId)
      .single();

    if (oppError || !opportunity) {
      return NextResponse.json({ success: false, error: 'Opportunity not found' }, { status: 404 });
    }

    if (opportunity.organizations?.[0]?.owner !== user.id) {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // Determine next occurrence - default to existing frequency unless overridden
    const frequency = overrides?.frequency || opportunity.frequency;
    const validFrequencies = ['daily', 'weekly', 'monthly'];
    if (!validFrequencies.includes(frequency)) {
      return NextResponse.json({ success: false, error: 'Only daily/weekly/monthly can be rolled forward' }, { status: 400 });
    }

    const currentStart = new Date(overrides?.start_time || opportunity.start_time);
    const currentEnd = new Date(overrides?.end_time || opportunity.end_time || 0);

    // Compute duration from end-start or duration_hours fallback (default 2h)
    const durationMs = Number.isFinite(currentEnd.getTime()) && currentEnd.getTime() > 0
      ? (currentEnd.getTime() - currentStart.getTime())
      : (overrides?.duration_hours ?? opportunity.duration_hours ?? 2) * 60 * 60 * 1000;

    const nextStart = new Date(currentStart);
    if (frequency === 'daily') {
      nextStart.setDate(nextStart.getDate() + 1);
    } else if (frequency === 'weekly') {
      nextStart.setDate(nextStart.getDate() + 7);
    } else if (frequency === 'monthly') {
      nextStart.setMonth(nextStart.getMonth() + 1);
    }

    const nextEnd = new Date(nextStart.getTime() + durationMs);

    // Insert the cloned next occurrence
    const newRow = {
      org_id: opportunity.org_id,
      title: overrides?.title ?? opportunity.title,
      description: overrides?.description ?? opportunity.description,
      location: overrides?.location ?? opportunity.location,
      start_time: nextStart.toISOString(),
      end_time: nextEnd.toISOString(),
      needed: overrides?.needed ?? opportunity.needed,
      photos: overrides?.photos ?? opportunity.photos ?? [],
      cause_tags: overrides?.cause_tags ?? opportunity.cause_tags ?? [],
      skills_needed: overrides?.skills_needed ?? opportunity.skills_needed ?? [],
      is_remote: overrides?.is_remote ?? opportunity.is_remote ?? false,
      duration_hours: overrides?.duration_hours ?? opportunity.duration_hours ?? (durationMs / (60 * 60 * 1000)),
      frequency: frequency,
      age_group: overrides?.age_group ?? opportunity.age_group ?? 'all',
      difficulty_level: overrides?.difficulty_level ?? opportunity.difficulty_level ?? 'beginner',
      rollcall_email_sent_at: null
    } as const;

    const { data: inserted, error: insertError } = await supabase
      .from('opportunities')
      .insert(newRow)
      .select()
      .single();

    if (insertError) {
      return NextResponse.json({ success: false, error: insertError.message }, { status: 500 });
    }

    // Close the current opportunity to ensure only one instance is active
    const { error: closeError } = await supabase
      .from('opportunities')
      .update({ closed: true })
      .eq('id', opportunityId);

    if (closeError) {
      // Not fatal to creation; report but return success with warning
      return NextResponse.json({ success: true, nextOpportunity: inserted, warning: 'Created next occurrence but failed to close current.' });
    }

    return NextResponse.json({ success: true, nextOpportunity: inserted });

  } catch (error) {
    console.error('[Roll Forward] Error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}


