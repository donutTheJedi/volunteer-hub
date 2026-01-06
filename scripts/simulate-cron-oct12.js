/**
 * Simulate what the cron job would see on October 12 at 6:00 PM UTC
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

async function simulateCronRun() {
  // Simulate running on October 12, 2025 at 6:00 PM UTC (18:00)
  // This is when the cron job would have run for October 12
  const simulatedNow = new Date('2025-10-12T18:00:00.000Z');
  
  console.log('\n🕐 Simulating cron job run as if it were:');
  console.log(`   ${simulatedNow.toISOString()} (6:00 PM UTC on Oct 12)`);
  console.log(`   ${simulatedNow.toLocaleString()}`);
  console.log('');
  
  // This is what the code does (FROM THE ACTUAL CRON JOB CODE):
  const today = new Date(simulatedNow);
  today.setHours(0, 0, 0, 0);  // Set to midnight
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  console.log('📅 Time window the cron job would use:');
  console.log(`   From: ${today.toISOString()}`);
  console.log(`   To:   ${tomorrow.toISOString()}`);
  console.log('');
  
  // Now check what signups exist in this window
  const { data: projects } = await supabase
    .from('senior_projects')
    .select('id, title, user_id');
  
  if (!projects) {
    console.log('❌ No projects found');
    return;
  }
  
  console.log(`📋 Checking ${projects.length} projects...\n`);
  
  let totalEmailsFound = 0;
  let totalSignupsFound = 0;
  
  for (const project of projects) {
    const { data: signups } = await supabase
      .from('senior_project_signups')
      .select('name, email, created_at')
      .eq('project_id', project.id)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());
    
    if (signups && signups.length > 0) {
      console.log(`✅ "${project.title}": ${signups.length} signup(s)`);
      totalEmailsFound++;
      totalSignupsFound += signups.length;
      
      signups.forEach(s => {
        const signupDate = new Date(s.created_at);
        console.log(`   • ${s.name}`);
        console.log(`     Timestamp: ${signupDate.toISOString()}`);
        console.log(`     Local: ${signupDate.toLocaleString()}`);
      });
      console.log('');
    }
  }
  
  console.log('═'.repeat(70));
  console.log('📊 SIMULATION RESULT:');
  console.log(`   Emails that SHOULD have been sent: ${totalEmailsFound}`);
  console.log(`   Total signups found: ${totalSignupsFound}`);
  console.log('═'.repeat(70));
  
  if (totalEmailsFound === 0) {
    console.log('\n❌ PROBLEM IDENTIFIED!');
    console.log('   The cron job found 0 signups, which is why it said "successful"');
    console.log('   but sent no emails.');
    console.log('\n   This is likely due to:');
    console.log('   1. Timezone issue: setHours(0,0,0,0) uses LOCAL timezone');
    console.log('   2. In GitHub Actions (UTC), this works correctly');
    console.log('   3. But signups might be created with local timestamps');
  } else {
    console.log('\n✅ The cron job SHOULD have found signups!');
    console.log('   If GitHub Actions reported 0 emails, something is wrong.');
  }
  console.log('');
}

simulateCronRun()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

