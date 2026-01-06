/**
 * Check what senior project digest emails SHOULD have been sent on previous days
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

async function checkHistoricalDigests() {
  console.log('\n🔍 Checking what emails SHOULD have been sent on previous days\n');
  console.log('═'.repeat(70));
  
  // Check the last 7 days
  const daysToCheck = 7;
  
  for (let daysAgo = 0; daysAgo < daysToCheck; daysAgo++) {
    const checkDate = new Date();
    checkDate.setDate(checkDate.getDate() - daysAgo);
    checkDate.setHours(0, 0, 0, 0); // Start of day
    
    const nextDay = new Date(checkDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    console.log(`\n📅 ${checkDate.toLocaleDateString()} (${daysAgo === 0 ? 'Today' : daysAgo + ' days ago'})`);
    console.log(`   Time window: ${checkDate.toISOString()} to ${nextDay.toISOString()}`);
    
    // Get all projects
    const { data: projects } = await supabase
      .from('senior_projects')
      .select('id, title, user_id');
    
    if (!projects) continue;
    
    let emailCount = 0;
    let signupCount = 0;
    const projectsWithSignups = [];
    
    for (const project of projects) {
      // Get signups for this day
      const { data: signups } = await supabase
        .from('senior_project_signups')
        .select('name, email, created_at')
        .eq('project_id', project.id)
        .gte('created_at', checkDate.toISOString())
        .lt('created_at', nextDay.toISOString());
      
      if (signups && signups.length > 0) {
        emailCount++;
        signupCount += signups.length;
        projectsWithSignups.push({
          title: project.title,
          signups: signups.map(s => ({
            name: s.name,
            time: new Date(s.created_at).toLocaleTimeString()
          }))
        });
      }
    }
    
    if (emailCount > 0) {
      console.log(`   ✅ ${emailCount} email(s) should have been sent (${signupCount} signups)`);
      projectsWithSignups.forEach(p => {
        console.log(`      • "${p.title}": ${p.signups.length} signup(s)`);
        p.signups.forEach(s => {
          console.log(`        - ${s.name} at ${s.time}`);
        });
      });
    } else {
      console.log(`   ⚪ No emails should have been sent (no signups)`);
    }
  }
  
  console.log('\n' + '═'.repeat(70));
}

checkHistoricalDigests()
  .then(() => {
    console.log('\nAnalysis complete!\n');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

