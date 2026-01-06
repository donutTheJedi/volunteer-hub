/**
 * Debug script for senior project daily digest emails
 * Tests the logic and shows what data is being found
 */

const { createClient } = require('@supabase/supabase-js');

// Load environment variables
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

async function debugSeniorProjectDigest() {
  console.log('\n🔍 DEBUG: Senior Project Daily Digest\n');
  console.log('═'.repeat(60));
  
  // Check current time
  const now = new Date();
  console.log(`\n⏰ Current time: ${now.toISOString()}`);
  console.log(`   Local time: ${now.toLocaleString()}`);
  
  // Calculate today's time window
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  console.log(`\n📅 Time window for "today":`);
  console.log(`   From: ${today.toISOString()}`);
  console.log(`   To:   ${tomorrow.toISOString()}`);
  
  // Get all senior projects
  console.log('\n\n1️⃣ Fetching all senior projects...');
  const { data: projects, error: projectsError } = await supabase
    .from('senior_projects')
    .select(`
      id,
      title,
      user_id,
      created_at
    `);
  
  if (projectsError) {
    console.error('❌ Error fetching projects:', projectsError);
    return;
  }
  
  if (!projects || projects.length === 0) {
    console.log('⚠️  No senior projects found in database');
    return;
  }
  
  console.log(`✅ Found ${projects.length} senior project(s):\n`);
  projects.forEach((p, i) => {
    console.log(`   ${i + 1}. "${p.title}" (ID: ${p.id})`);
    console.log(`      Owner ID: ${p.user_id}`);
    console.log(`      Created: ${new Date(p.created_at).toLocaleString()}`);
  });
  
  // Check each project for signups
  console.log('\n\n2️⃣ Checking signups for each project...\n');
  
  let totalEmailsThatWouldBeSent = 0;
  let totalSignupsFound = 0;
  
  for (const project of projects) {
    console.log(`\n${'─'.repeat(60)}`);
    console.log(`📋 Project: "${project.title}"`);
    console.log(`${'─'.repeat(60)}`);
    
    // Get ALL signups (no date filter) to see what exists
    const { data: allSignups, error: allSignupsError } = await supabase
      .from('senior_project_signups')
      .select('name, email, created_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false });
    
    if (allSignupsError) {
      console.error(`   ❌ Error fetching all signups:`, allSignupsError);
      continue;
    }
    
    console.log(`\n   📊 Total signups (all time): ${allSignups?.length || 0}`);
    
    if (allSignups && allSignups.length > 0) {
      console.log(`\n   Recent signups (last 10):`);
      allSignups.slice(0, 10).forEach((signup, i) => {
        const signupDate = new Date(signup.created_at);
        const isToday = signupDate >= today && signupDate < tomorrow;
        console.log(`   ${i + 1}. ${signup.name} - ${signupDate.toLocaleString()} ${isToday ? '✨ (TODAY)' : ''}`);
      });
    }
    
    // Get today's signups (with date filter - what the cron job uses)
    const { data: todaySignups, error: todaySignupsError } = await supabase
      .from('senior_project_signups')
      .select('name, email, created_at')
      .eq('project_id', project.id)
      .gte('created_at', today.toISOString())
      .lt('created_at', tomorrow.toISOString());
    
    if (todaySignupsError) {
      console.error(`   ❌ Error fetching today's signups:`, todaySignupsError);
      continue;
    }
    
    console.log(`\n   📬 Signups from TODAY (${today.toLocaleDateString()}):`);
    console.log(`      Count: ${todaySignups?.length || 0}`);
    
    if (!todaySignups || todaySignups.length === 0) {
      console.log(`      ⚠️  No signups today - EMAIL WOULD NOT BE SENT`);
      continue;
    }
    
    totalSignupsFound += todaySignups.length;
    
    console.log(`      ✅ Would send email! Here's what it would include:`);
    todaySignups.forEach((signup, i) => {
      console.log(`      ${i + 1}. ${signup.name} (${signup.email})`);
      console.log(`         Signed up: ${new Date(signup.created_at).toLocaleString()}`);
    });
    
    // Get owner email
    const { data: ownerData, error: ownerError } = await supabase.auth.admin.getUserById(project.user_id);
    
    if (ownerError || !ownerData?.user?.email) {
      console.log(`      ❌ Could not fetch owner email:`, ownerError);
      continue;
    }
    
    console.log(`\n      📧 Email would be sent to: ${ownerData.user.email}`);
    totalEmailsThatWouldBeSent++;
  }
  
  // Summary
  console.log('\n\n' + '═'.repeat(60));
  console.log('📊 SUMMARY');
  console.log('═'.repeat(60));
  console.log(`Total projects: ${projects.length}`);
  console.log(`Projects with signups today: ${totalEmailsThatWouldBeSent}`);
  console.log(`Total signups today: ${totalSignupsFound}`);
  console.log(`Emails that would be sent: ${totalEmailsThatWouldBeSent}`);
  
  if (totalEmailsThatWouldBeSent === 0) {
    console.log('\n⚠️  NO EMAILS WOULD BE SENT');
    console.log('\nPossible reasons:');
    console.log('1. No senior projects exist');
    console.log('2. No signups were made today (since midnight UTC)');
    console.log('3. Signups exist but are from previous days');
    console.log('\n💡 Tip: Check if signups are being created with the correct timezone');
  } else {
    console.log('\n✅ Emails WOULD be sent successfully!');
  }
  
  console.log('\n');
}

debugSeniorProjectDigest()
  .then(() => {
    console.log('Debug complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

