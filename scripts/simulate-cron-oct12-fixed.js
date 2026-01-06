/**
 * Simulate what the cron job would see on October 12 at 6:00 PM UTC
 * Using the FIXED code with setUTCHours
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
  const simulatedNow = new Date('2025-10-12T18:00:00.000Z');
  
  console.log('\n🕐 Simulating FIXED cron job run as if it were:');
  console.log(`   ${simulatedNow.toISOString()} (6:00 PM UTC on Oct 12)`);
  console.log('');
  
  // FIXED CODE - using setUTCHours instead of setHours
  const today = new Date(simulatedNow);
  today.setUTCHours(0, 0, 0, 0);  // Use UTC!
  const tomorrow = new Date(today);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);  // Use UTC!
  
  console.log('📅 Time window (FIXED - now using UTC):');
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
  console.log('📊 RESULT WITH FIX:');
  console.log(`   Emails that would be sent: ${totalEmailsFound}`);
  console.log(`   Total signups found: ${totalSignupsFound}`);
  console.log('═'.repeat(70));
  
  if (totalEmailsFound > 0) {
    console.log('\n✅ FIX WORKS! The cron job now correctly finds signups!');
    console.log('   The issue was using setHours() instead of setUTCHours()');
  } else {
    console.log('\n⚠️  Still no signups found - may need further investigation');
  }
  console.log('');
}

simulateCronRun()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

