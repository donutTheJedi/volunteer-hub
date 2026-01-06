// Test script for multi-language emails
import { config } from 'dotenv';
import { resolve } from 'path';

// Load environment variables from .env.local
config({ path: resolve(__dirname, '../.env.local') });

import { Resend } from 'resend';
import { 
  createSignupConfirmationEmail, 
  createReminderEmail, 
  createRollCallEmail, 
  createVerificationEmail, 
  createHoursAwardedEmail,
  getEmailSubject,
  type EmailTemplateData 
} from '../lib/email-templates-multilingual';

const resend = new Resend(process.env.RESEND_API_KEY);

// Test data
const testData: EmailTemplateData = {
  name: "Baron Giggy",
  opportunityTitle: "Beach Cleanup Volunteer",
  startTime: "2024-08-15 09:00 AM",
  endTime: "2024-08-15 12:00 PM",
  location: "Santa Monica Beach, CA",
  estimatedHours: 3,
  organizationName: "Ocean Conservation Society",
  rollCallUrl: "https://voluna.org/roll-call/test-123",
  verificationUrl: "https://voluna.org/verify/test-token"
};

const testEmail = "twitchemail6975@gmail.com";

async function sendTestEmail(type: string, data: EmailTemplateData, language: 'en' | 'es' | 'pt', subject: string) {
  try {
    let html: string;
    let emailSubject: string;
    
    switch (type) {
      case 'signup':
        html = createSignupConfirmationEmail(data, language);
        emailSubject = getEmailSubject('signupConfirmation', data, language);
        break;
      case 'reminder':
        html = createReminderEmail(data, language);
        emailSubject = getEmailSubject('reminder', data, language);
        break;
      case 'rollcall':
        html = createRollCallEmail(data, language);
        emailSubject = getEmailSubject('rollCall', data, language);
        break;
      case 'verification':
        html = createVerificationEmail(data, language);
        emailSubject = getEmailSubject('verification', data, language);
        break;
      case 'hours':
        html = createHoursAwardedEmail(data, language);
        emailSubject = getEmailSubject('hoursAwarded', data, language);
        break;
      default:
        throw new Error(`Unknown email type: ${type}`);
    }

    const result = await resend.emails.send({
      from: 'no-reply@voluna.org',
      to: testEmail,
      subject: `[TEST] ${emailSubject}`,
      html: html,
    });

    console.log(`✅ ${type} email sent in ${language.toUpperCase()}:`, result.data?.id || 'sent');
    return result;
  } catch (error) {
    console.error(`❌ Failed to send ${type} email in ${language.toUpperCase()}:`, error);
    throw error;
  }
}

async function sendAllTestEmails() {
  console.log('🚀 Starting multi-language email test...\n');
  
  const languages: ('en' | 'es' | 'pt')[] = ['en', 'es', 'pt'];
  const emailTypes = [
    { type: 'signup', name: 'Signup Confirmation' },
    { type: 'reminder', name: 'Reminder' },
    { type: 'rollcall', name: 'Roll Call' },
    { type: 'verification', name: 'Verification' },
    { type: 'hours', name: 'Hours Awarded' }
  ];

  for (const emailType of emailTypes) {
    console.log(`📧 Testing ${emailType.name} emails...`);
    
    for (const language of languages) {
      try {
        await sendTestEmail(emailType.type, testData, language, emailType.name);
        // Small delay between emails to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 1000));
      } catch (error) {
        console.error(`Failed to send ${emailType.name} in ${language}:`, error);
      }
    }
    
    console.log(`✅ Completed ${emailType.name} emails\n`);
  }

  console.log('🎉 Multi-language email test completed!');
  console.log(`📬 Check your email: ${testEmail}`);
  console.log('📊 You should receive 15 emails total (5 types × 3 languages)');
}

// Run the test
sendAllTestEmails().catch(console.error); 