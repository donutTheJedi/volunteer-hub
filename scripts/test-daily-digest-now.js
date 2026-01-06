#!/usr/bin/env node

/**
 * Quick test script to manually trigger daily digest emails
 * This bypasses the cron schedule to test immediately
 */

require('dotenv').config({ path: '.env.local' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET || 'test-secret-for-dev';

async function testDailyDigestNow() {
  console.log('🧪 Testing Daily Digest Emails NOW...\n');
  console.log(`📍 Target URL: ${SITE_URL}/api/cron`);
  console.log('');

  try {
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

    const data = await response.json();
    
    console.log(`📊 Response Status: ${response.status} ${response.statusText}\n`);
    console.log('📧 Response Data:');
    console.log(JSON.stringify(data, null, 2));
    console.log('');

    if (response.ok && data.success) {
      console.log('✅ Daily digest test completed successfully!');
      console.log(`   Emails sent: ${data.emailsSent || 0}`);
      console.log(`   Emails failed: ${data.emailsFailed || 0}`);
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

testDailyDigestNow();

