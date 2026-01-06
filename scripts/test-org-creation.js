#!/usr/bin/env node

/**
 * Test script for organization creation with reach_out_email
 * This script tests the new organization creation functionality
 */

// Using built-in fetch (Node.js 18+)

const API_BASE = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

async function testOrgCreationWithReachOutEmail() {
  console.log('🧪 Testing Organization Creation with Reach Out Email...\n');

  try {
    // Test creating an organization with reach_out_email but no owner_email
    const testOrg = {
      name: 'Test Organization with Reach Out',
      description: 'This is a test organization created to test the reach out email functionality',
      city: 'Test City',
      contactEmail: 'contact@testorg.com',
      reachOutEmail: 'reachout@testorg.com',
      photos: [],
      logo: null
    };

    const response = await fetch(`${API_BASE}/api/admin/create-organization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-requester-email': 'baron@giggy.com', // Admin email
      },
      body: JSON.stringify(testOrg),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Organization creation with reach_out_email test passed!');
      console.log('📊 Created organization:', result.organization);
      console.log('📧 Reach out email:', result.organization.reach_out_email);
      console.log('👤 Owner:', result.organization.owner);
    } else {
      console.log('❌ Organization creation test failed!');
      console.log('📊 Error:', result);
    }
  } catch (error) {
    console.log('❌ Organization creation test failed with error:', error.message);
  }
}

async function testOrgCreationWithBothEmails() {
  console.log('\n🧪 Testing Organization Creation with Both Emails...\n');

  try {
    // Test creating an organization with both owner_email and reach_out_email
    const testOrg = {
      name: 'Test Organization with Both Emails',
      description: 'This is a test organization with both owner and reach out emails',
      city: 'Test City',
      contactEmail: 'contact@testorg2.com',
      ownerEmail: 'owner@testorg2.com',
      reachOutEmail: 'reachout@testorg2.com',
      photos: [],
      logo: null
    };

    const response = await fetch(`${API_BASE}/api/admin/create-organization`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-requester-email': 'baron@giggy.com', // Admin email
      },
      body: JSON.stringify(testOrg),
    });

    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Organization creation with both emails test passed!');
      console.log('📊 Created organization:', result.organization);
      console.log('📧 Reach out email:', result.organization.reach_out_email);
      console.log('👤 Owner:', result.organization.owner);
    } else {
      console.log('❌ Organization creation with both emails test failed!');
      console.log('📊 Error:', result);
    }
  } catch (error) {
    console.log('❌ Organization creation with both emails test failed with error:', error.message);
  }
}

async function main() {
  console.log('🚀 Starting Organization Creation Tests\n');
  console.log('API Base URL:', API_BASE);
  console.log('');

  await testOrgCreationWithReachOutEmail();
  await testOrgCreationWithBothEmails();

  console.log('\n✨ Tests completed!');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { testOrgCreationWithReachOutEmail, testOrgCreationWithBothEmails };
