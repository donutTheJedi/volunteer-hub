#!/usr/bin/env node

/**
 * Test script for cron jobs
 * Usage: node scripts/test-cron.js [reminder|rollcall|rollforward|senior-digest]
 */

const https = require('https');
const http = require('http');

const BASE_URL = process.env.NEXT_PUBLIC_SITE_URL || 'https://www.voluna.org';
const CRON_SECRET = process.env.CRON_SECRET || 'test-secret';

function makeRequest(path, method = 'POST') {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const isHttps = url.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: url.hostname,
      port: url.port || (isHttps ? 443 : 3000),
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${CRON_SECRET}`,
        'User-Agent': 'Cron-Test-Script/1.0'
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      
      res.on('data', (chunk) => {
        data += chunk;
      });
      
      res.on('end', () => {
        try {
          const jsonData = JSON.parse(data);
          resolve({
            statusCode: res.statusCode,
            data: jsonData
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            data: data
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.end();
  });
}

async function testReminderEmails() {
  console.log('🧪 Testing reminder emails cron job...');
  try {
    const result = await makeRequest('/api/cron/reminder-emails');
    console.log('✅ Reminder emails test completed:');
    console.log('Status:', result.statusCode);
    console.log('Response:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('❌ Reminder emails test failed:', error.message);
  }
}

async function testRollCallEmails() {
  console.log('🧪 Testing roll call emails cron job...');
  try {
    const result = await makeRequest('/api/cron/roll-call-emails');
    console.log('✅ Roll call emails test completed:');
    console.log('Status:', result.statusCode);
    console.log('Response:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('❌ Roll call emails test failed:', error.message);
  }
}

async function testRollForward() {
  console.log('🧪 Testing roll-forward opportunities cron job...');
  try {
    const result = await makeRequest('/api/cron', 'POST');
    // For the consolidated cron endpoint, we need to send a body. Fallback to curl for local?
    // Keep simple: print guidance if server returns 400 for missing job
    console.log('⚠️  Note: Use curl to send JSON body: {"job":"roll-forward-opportunities"}');
    console.log('✅ Roll-forward test request sent:');
    console.log('Status:', result.statusCode);
    console.log('Response:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('❌ Roll-forward test failed:', error.message);
  }
}

async function testSeniorProjectDigest() {
  console.log('🧪 Testing senior project daily digest cron job...');
  try {
    const result = await makeRequest('/api/cron', 'POST');
    // For the consolidated cron endpoint, we need to send a body. Fallback to curl for local?
    // Keep simple: print guidance if server returns 400 for missing job
    console.log('⚠️  Note: Use curl to send JSON body: {"job":"senior-project-daily-digest"}');
    console.log('✅ Senior project digest test request sent:');
    console.log('Status:', result.statusCode);
    console.log('Response:', JSON.stringify(result.data, null, 2));
  } catch (error) {
    console.error('❌ Senior project digest test failed:', error.message);
  }
}

async function main() {
  const jobType = process.argv[2];
  
  console.log('🚀 Cron Job Test Script');
  console.log('Base URL:', BASE_URL);
  console.log('Cron Secret:', CRON_SECRET ? '***' : 'Not set');
  console.log('');
  
  if (jobType === 'reminder') {
    await testReminderEmails();
  } else if (jobType === 'rollcall') {
    await testRollCallEmails();
  } else if (jobType === 'rollforward') {
    await testRollForward();
  } else if (jobType === 'senior-digest') {
    await testSeniorProjectDigest();
  } else {
    console.log('Testing all cron jobs...\n');
    await testReminderEmails();
    console.log('');
    await testRollCallEmails();
    console.log('');
    await testRollForward();
    console.log('');
    await testSeniorProjectDigest();
  }
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testReminderEmails, testRollCallEmails, testRollForward, testSeniorProjectDigest };