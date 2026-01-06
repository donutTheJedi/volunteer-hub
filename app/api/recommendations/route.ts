import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';

export async function GET(request: NextRequest) {
  try {
    const supabase = await createSupabaseServer();
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    // Get user preferences
    const { data: preferences, error: prefError } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (prefError || !preferences) {
      return NextResponse.json({ error: 'No preferences found' }, { status: 404 });
    }

    // Get opportunities with basic filtering
    let query = supabase
      .from('opportunities')
      .select(`
        id, title, description, location, start_time, end_time, needed, closed, photos,
        cause_tags, skills_needed, is_remote, duration_hours, frequency,
        organizations(name)
      `)
      .gte('start_time', new Date().toISOString())
      // Treat null as open; include rows where closed is null or false
      .or('closed.is.null,closed.eq.false');

    // Apply preference-based filters
    if (preferences.interests && preferences.interests.length > 0) {
      query = query.overlaps('cause_tags', preferences.interests);
    }

    // Do not hard-filter by skills at the query level; use skills in scoring

    if (preferences.remote_ok === false) {
      query = query.eq('is_remote', false);
    }

    if (preferences.time_commitment && preferences.time_commitment !== 'flexible') {
      query = query.eq('frequency', preferences.time_commitment);
    }

    const { data: opportunities, error: opportunitiesError } = await query.order('start_time');

    if (opportunitiesError) {
      console.error('Error fetching opportunities:', opportunitiesError);
      return NextResponse.json({ error: 'Failed to fetch opportunities' }, { status: 500 });
    }

    // Calculate match scores and reasons for each opportunity
    const scoredOpportunities = opportunities?.map((opp: any) => {
      const { score, reasons } = calculateMatchScore(opp, preferences);
      return {
        ...opp,
        match_score: score,
        match_reasons: reasons
      };
    }) || [];

    // Sort by match score (highest first)
    scoredOpportunities.sort((a: any, b: any) => b.match_score - a.match_score);

    // Return top 10 recommendations
    return NextResponse.json({
      recommendations: scoredOpportunities.slice(0, 10),
      user_preferences: {
        interests: preferences.interests,
        skills: preferences.skills,
        remote_ok: preferences.remote_ok,
        time_commitment: preferences.time_commitment,
        location_preference: preferences.location_preference
      }
    });

  } catch (error) {
    console.error('Error in recommendations API:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function calculateMatchScore(opportunity: any, preferences: any): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  // Interest match (weight: 3)
  if (opportunity.cause_tags && preferences.interests) {
    const interestMatches = opportunity.cause_tags.filter((tag: string) => 
      preferences.interests.includes(tag)
    );
    if (interestMatches.length > 0) {
      score += interestMatches.length * 3;
      reasons.push(`Matches your interests: ${interestMatches.join(', ')}`);
    }
  }

  // Skill match (weight: 2)
  if (opportunity.skills_needed && preferences.skills) {
    const skillMatches = opportunity.skills_needed.filter((skill: string) => 
      preferences.skills.includes(skill)
    );
    if (skillMatches.length > 0) {
      score += skillMatches.length * 2;
      reasons.push(`Uses your skills: ${skillMatches.map((s: string) => s.replace('_', ' ')).join(', ')}`);
    }
  }

  // Remote preference match (weight: 2)
  if (preferences.remote_ok && opportunity.is_remote) {
    score += 2;
    reasons.push('Remote opportunity');
  } else if (!preferences.remote_ok && !opportunity.is_remote) {
    score += 2;
    reasons.push('In-person opportunity');
  }

  // Time commitment match (weight: 1)
  if (preferences.time_commitment && opportunity.frequency === preferences.time_commitment) {
    score += 1;
    reasons.push(`Matches your preferred commitment: ${preferences.time_commitment}`);
  }

  // Location match (weight: 1)
  if (preferences.location_preference && opportunity.location) {
    const oppLocation = opportunity.location.toLowerCase();
    const prefLocation = preferences.location_preference.toLowerCase();
    if (oppLocation.includes(prefLocation) || prefLocation.includes(oppLocation)) {
      score += 1;
      reasons.push('Near your preferred location');
    }
  }

  return { score, reasons };
} 