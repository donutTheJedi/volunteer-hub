import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

export async function GET() {
  const now = new Date();
  const in5min = new Date(now.getTime() + 5 * 60 * 1000); // 5 minutes from now
  const in6min = new Date(now.getTime() + 6 * 60 * 1000); // 6 minutes from now (1 minute window)

  console.log('[Test Roll Call] Looking for opportunities starting between', in5min.toISOString(), 'and', in6min.toISOString());

  // Get opportunities starting in 5-6 minutes
  const { data: opps, error: oppError } = await supabase
    .from('opportunities')
    .select(`
      id, 
      title, 
      start_time, 
      end_time,
      location,
      org_id
    `)
    .gte('start_time', in5min.toISOString())
    .lte('start_time', in6min.toISOString())
    .eq('closed', false);

  if (oppError) {
    console.error('[Test Roll Call] Error fetching opportunities:', oppError);
    return NextResponse.json({ success: false, error: oppError.message }, { status: 500 });
  }

  if (!opps || opps.length === 0) {
    console.log('[Test Roll Call] No opportunities starting in 5-6 minutes.');
    return NextResponse.json({ 
      success: true, 
      message: 'No opportunities starting soon.',
      currentTime: now.toISOString(),
      searchWindow: {
        from: in5min.toISOString(),
        to: in6min.toISOString()
      }
    });
  }

  const results = [];

  for (const opp of opps) {
    console.log(`[Test Roll Call] Processing opportunity: ${opp.title} (${opp.id})`);
    
    // Get the number of signups for this opportunity
    const { data: signups, error: signupError } = await supabase
      .from('signups')
      .select('user_id, name')
      .eq('opportunity_id', opp.id);

    if (signupError) {
      console.error('[Test Roll Call] Error fetching signups:', signupError);
      continue;
    }

    const signupCount = signups?.length || 0;
    
    // Get organization details
    const { data: orgData, error: orgError } = await supabase
      .from('organizations')
      .select('name, owner, contact_email')
      .eq('id', opp.org_id)
      .single();
    
    if (orgError || !orgData) {
      console.error('[Test Roll Call] Error fetching organization:', orgError, orgData);
      continue;
    }
    
    // For testing, we'll use a hardcoded email
    // Get the organizer's email from the organization's contact_email field
    if (!orgData.contact_email) {
      console.error('[Test Roll Call] No contact email found for organization:', orgData.name);
      continue;
    }
    
    const organizerEmail = orgData.contact_email;
    
    console.log(`[Test Roll Call] Using organizer email: ${organizerEmail} for opportunity ${opp.title}`);

    // Calculate estimated hours (difference between start and end time)
    let estimatedHours = 0;
    if (opp.start_time && opp.end_time) {
      const startTime = new Date(opp.start_time);
      const endTime = new Date(opp.end_time);
      estimatedHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60); // Convert to hours
    }

    const rollCallUrl = `${process.env.NEXT_PUBLIC_SITE_URL || 'https://www.voluna.org'}/roll-call/${opp.id}`;
    
    results.push({
      opportunity: {
        id: opp.id,
        title: opp.title,
        startTime: opp.start_time,
        endTime: opp.end_time,
        location: opp.location
      },
      organizer: {
        email: organizerEmail,
        id: orgData.owner
      },
      signupCount,
      estimatedHours,
      rollCallUrl
    });
  }

  return NextResponse.json({ 
    success: true, 
    message: `Found ${results.length} opportunities starting soon.`,
    currentTime: now.toISOString(),
    searchWindow: {
      from: in5min.toISOString(),
      to: in6min.toISOString()
    },
    opportunities: results
  });
} 