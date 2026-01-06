#!/usr/bin/env node

/**
 * Debug test script for daily digest emails with verbose logging
 */

require('dotenv').config({ path: '.env.local' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'test-secret-for-dev';

console.log('🔍 Environment Check:');
console.log(`  SITE_URL: ${SITE_URL}`);
console.log(`  CRON_SECRET: ${CRON_SECRET ? '✅ Set' : '❌ Not set'}`);
console.log(`  RESEND_API_KEY: ${process.env.RESEND_API_KEY ? '✅ Set (' + process.env.RESEND_API_KEY.substring(0, 10) + '...)' : '❌ Not set'}`);
console.log(`  SUPABASE_URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL ? '✅ Set' : '❌ Not set'}`);
console.log(`  SUPABASE_KEY: ${process.env.SUPABASE_SERVICE_ROLE_KEY ? '✅ Set' : '❌ Not set'}`);
console.log('');

async function testDailyDigestDebug() {
  console.log('🧪 Testing Daily Digest Emails (Debug Mode)...\n');

  try {
    console.log('📡 Sending request...');
    const response = await fetch(`${SITE_URL}/api/cron`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${CRON_SECRET}`,
        'Content-Type': 'application/json',
        'x-supabase-url': process.env.NEXT_PUBLIC_SUPABASE_URL || '',
        'x-supabase-service-role-key': process.env.SUPABASE_SERVICE_ROLE_KEY || ''
      },
      body: JSON.stringify({ job: 'daily-digest-emails' })
    });

    console.log(`📊 Response Status: ${response.status} ${response.statusText}`);
    
    const responseText = await response.text();
    console.log('\n📄 Raw Response:');
    console.log(responseText);
    console.log('');
    
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (e) {
      console.error('❌ Failed to parse response as JSON');
      process.exit(1);
    }
    
    console.log('📧 Parsed Response Data:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    if (response.ok && data.success) {
      console.log('✅ Daily digest test completed successfully!');
      console.log(`   Emails sent: ${data.emailsSent || 0}`);
      console.log(`   Emails failed: ${data.emailsFailed || 0}`);
      console.log('\n⚠️  If you did not receive an email, check:');
      console.log('   1. Spam/junk folder');
      console.log('   2. Resend dashboard: https://resend.com/emails');
      console.log('   3. Check server logs for email sending errors');
    } else {
      console.log('❌ Daily digest test failed!');
      console.log(`   Error: ${data.error || 'Unknown error'}`);
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Error testing daily digest:');
    console.error(error);
    process.exit(1);
  }
}

testDailyDigestDebug();

