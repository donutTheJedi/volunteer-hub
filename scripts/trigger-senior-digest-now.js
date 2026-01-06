/**
 * Manually trigger the senior project daily digest email job
 * This can be used to test or manually send missed emails
 */

const https = require('https');
const http = require('http');
require('dotenv').config({ path: '.env.local' });

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';
const CRON_SECRET = process.env.CRON_SECRET;

if (!CRON_SECRET) {
  console.error('❌ CRON_SECRET environment variable is not set!');
  console.log('   This is required to authenticate the cron job.');
  process.exit(1);
}

console.log('\n🚀 Triggering Senior Project Daily Digest...\n');
console.log(`   Target URL: ${SITE_URL}/api/cron`);
console.log(`   Job type: senior-project-daily-digest`);
console.log('');

const url = new URL(`${SITE_URL}/api/cron`);
const isHttps = url.protocol === 'https:';
const lib = isHttps ? https : http;

const postData = JSON.stringify({ job: 'senior-project-daily-digest' });

const options = {
  hostname: url.hostname,
  port: url.port || (isHttps ? 443 : 80),
  path: url.pathname,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData),
    'Authorization': `Bearer ${CRON_SECRET}`,
    'x-supabase-url': process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    'x-supabase-service-role-key': process.env.SUPABASE_SERVICE_ROLE_KEY || ''
  },
  timeout: 30000
};

const req = lib.request(options, (res) => {
  let data = '';
  
  console.log(`📡 Response status: ${res.statusCode}\n`);
  
  res.on('data', (chunk) => {
    data += chunk;
  });
  
  res.on('end', () => {
    try {
      const result = JSON.parse(data);
      console.log('📬 Result:');
      console.log(JSON.stringify(result, null, 2));
      console.log('');
      
      if (result.success) {
        console.log(`✅ Success! ${result.emailsSent || 0} email(s) sent`);
        if (result.emailsFailed) {
          console.log(`⚠️  ${result.emailsFailed} email(s) failed`);
        }
        if (result.message) {
          console.log(`ℹ️  ${result.message}`);
        }
      } else {
        console.log('❌ Job failed:', result.error || 'Unknown error');
      }
    } catch (e) {
      console.log('Raw response:', data);
      console.error('❌ Failed to parse response:', e.message);
    }
    console.log('');
  });
});

req.on('error', (e) => {
  console.error('❌ Request failed:', e.message);
  console.log('');
  process.exit(1);
});

req.on('timeout', () => {
  console.error('❌ Request timed out after 30 seconds');
  req.destroy();
  process.exit(1);
});

req.write(postData);
req.end();

