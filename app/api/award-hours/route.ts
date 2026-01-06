import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';

export async function POST(req: NextRequest) {
  try {
    const { opportunityId, hours, notes } = await req.json();
    
    if (!opportunityId || !hours || hours <= 0) {
      return NextResponse.json({ success: false, error: 'Opportunity ID and valid hours are required' }, { status: 400 });
    }

    const supabase = await createSupabaseServer();
    
    // Verify the user is logged in
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session?.user) {
      console.error('Session error:', sessionError);
      return NextResponse.json({ success: false, error: 'Unauthorized - Please log in again' }, { status: 401 });
    }
    
    const user = session.user;

    // Check if user owns the organization that owns this opportunity
    const { data: opportunity, error: oppError } = await supabase
      .from('opportunities')
      .select(`
        id,
        title,
        start_time,
        end_time,
        organizations!inner (
          owner
        )
      `)
      .eq('id', opportunityId)
      .single();
    
    if (oppError || !opportunity) {
      return NextResponse.json({ success: false, error: 'Opportunity not found' }, { status: 404 });
    }

    if (opportunity.organizations[0]?.owner !== user.id) {
      return NextResponse.json({ success: false, error: 'Only the organization owner can award hours' }, { status: 403 });
    }

    // Get all volunteers who attended this opportunity
    const { data: attendance, error: attendanceError } = await supabase
      .from('attendance')
      .select('user_id')
      .eq('opportunity_id', opportunityId)
      .eq('attended', true);

    if (attendanceError) {
      console.error('Error fetching attendance:', attendanceError);
      return NextResponse.json({ success: false, error: 'Failed to fetch attendance records' }, { status: 500 });
    }

    if (!attendance || attendance.length === 0) {
      return NextResponse.json({ success: true, message: 'No volunteers attended this opportunity' });
    }

    let hoursAwarded = 0;
    let hoursFailures = 0;

    // Award hours to all attendees
    for (const attendee of attendance) {
      try {
        const { error: hoursError } = await supabase
          .from('volunteer_hours')
          .upsert({
            user_id: attendee.user_id,
            opportunity_id: opportunityId,
            hours_awarded: hours,
            awarded_by: user.id,
            notes: notes || `Hours awarded for attending: ${opportunity.title}`
          });

        if (hoursError) {
          console.error('Error awarding hours to user:', attendee.user_id, hoursError);
          hoursFailures++;
        } else {
          hoursAwarded++;
        }
      } catch (error) {
        console.error('Failed to award hours to user:', attendee.user_id, error);
        hoursFailures++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      message: `Hours awarded successfully. ${hoursAwarded} awarded, ${hoursFailures} failed.`,
      hoursAwarded,
      hoursFailures,
      totalAttendees: attendance.length
    });

  } catch (error) {
    console.error('Award hours error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
} 