import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServer } from '@/lib/supabaseServer';
import { sendEmail } from '@/lib/email';

export async function POST() {
  const supabase = await createSupabaseServer();
  const now = new Date();
  const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const in23h = new Date(now.getTime() + 23 * 60 * 60 * 1000);

  console.log('[Reminder] Looking for opportunities between', in23h.toISOString(), 'and', in24h.toISOString());

  const { data: opps, error: oppError } = await supabase
    .from('opportunities')
    .select('id, title, start_time')
    .gte('start_time', in23h.toISOString())
    .lte('start_time', in24h.toISOString());

  if (oppError) {
    console.error('[Reminder] Error fetching opportunities:', oppError);
    return NextResponse.json({ success: false, error: oppError.message }, { status: 500 });
  }
  if (!opps || opps.length === 0) {
    console.log('[Reminder] No upcoming opportunities in the next 24 hours.');
    return NextResponse.json({ success: true, message: 'No upcoming opportunities.' });
  }

  for (const opp of opps) {
    console.log(`[Reminder] Processing opportunity: ${opp.title} (${opp.id})`);
    const { data: signups, error: signupError } = await supabase
      .from('signups')
      .select('user_id, name')
      .eq('opportunity_id', opp.id);

    if (signupError) {
      console.error('[Reminder] Error fetching signups:', signupError);
      continue;
    }

    for (const signup of signups) {
      // Get user email
      const { data, error: userError } = await supabase.auth.admin.getUserById(signup.user_id);
      const user = data?.user;
      if (userError || !user?.email) {
        console.error('[Reminder] Error fetching user or missing email:', userError, user);
        continue;
      }
      console.log(`[Reminder] Sending reminder to ${user.email} for ${opp.title}`);
      await sendEmail({
        to: user.email,
        subject: `Reminder: ${opp.title} is tomorrow!`,
        html: `<h1>Hi ${signup.name},</h1>\n<p>This is a reminder that <b>${opp.title}</b> starts at ${new Date(opp.start_time).toLocaleString()}.</p>\n<p>See you there!</p>`
      });
    }
  }

  return NextResponse.json({ success: true });
} 