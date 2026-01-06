/**
 * One-time script to send missed senior project digest emails
 * for October 9 and October 12, 2025
 */

const { createClient } = require('@supabase/supabase-js');
const https = require('https');
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

// Email sending function
async function sendEmail({ to, subject, html }) {
  const RESEND_API_KEY = process.env.RESEND_API_KEY;
  
  if (!RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not set');
  }

  const postData = JSON.stringify({
    from: 'Voluna <noreply@voluna.org>',
    to: [to],
    subject: subject,
    html: html
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.resend.com',
      port: 443,
      path: '/emails',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData),
        'Authorization': `Bearer ${RESEND_API_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`Failed to send email: ${res.statusCode} ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

// Create email HTML (simplified version of the template)
function createSeniorProjectDigestEmail({ projectTitle, signups, totalSignups, date }) {
  const signupsHtml = signups.map(signup => `
    <div style="background-color: #f9fafb; border-left: 4px solid #16a34a; padding: 15px; margin: 10px 0; border-radius: 0 8px 8px 0;">
      <h4 style="margin: 0 0 5px 0; color: #374151; font-size: 16px;">${signup.volunteerName}</h4>
      <p style="margin: 0 0 3px 0; color: #6b7280; font-size: 14px;">📧 ${signup.volunteerEmail}</p>
    </div>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Senior Project Sign-ups</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #374151; margin: 0; padding: 0; background-color: #f9fafb;">
      <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <div style="background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); padding: 40px 30px; text-align: center; color: white;">
          <div style="font-size: 32px; margin-bottom: 16px;">🌱</div>
          <h1 style="margin: 0; font-size: 28px; font-weight: 700;">Voluna</h1>
          <p style="margin: 10px 0 0 0; opacity: 0.9; font-size: 16px;">Making volunteering simple and impactful</p>
        </div>
        <div style="padding: 40px 30px;">
          <h2 style="color: #16a34a; margin-top: 0; font-size: 24px;">Senior Project Sign-ups 📊</h2>
          
          <div style="background-color: #fef3c7; border: 1px solid #fde68a; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <p style="margin: 0; color: #92400e; font-weight: 600;">⏰ Late Notification</p>
            <p style="margin: 5px 0 0 0; color: #92400e; font-size: 14px;">
              Due to a technical issue, this notification was delayed. These sign-ups occurred on ${date}.
            </p>
          </div>
          
          <div style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <h3 style="color: #15803d; margin-top: 0;">${projectTitle} - Sign-ups from ${date}</h3>
            <p style="margin-bottom: 0; font-size: 18px;">
              <strong>${totalSignups}</strong> volunteer sign-up${totalSignups !== 1 ? 's' : ''}
            </p>
          </div>

          <h3 style="color: #374151; margin-top: 0; font-size: 20px;">Sign-ups:</h3>
          ${signupsHtml}

          <div style="margin-top: 30px; padding: 20px; background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 12px;">
            <p style="color: #374151; font-size: 16px; margin: 0;">
              Thank you for using Voluna for your senior project! 
              <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://voluna.org'}/dashboard" style="color: #16a34a; text-decoration: none; font-weight: 600;">Visit your dashboard</a> to manage your project.
            </p>
          </div>

          <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
            This is a late notification for your senior project. We apologize for the delay!
          </p>
        </div>
        <div style="background-color: #f8fafc; padding: 30px; text-align: center; border-top: 1px solid #e5e7eb;">
          <p style="margin: 0; color: #6b7280; font-size: 14px;">© 2024 Voluna. All rights reserved.</p>
          <p style="margin: 5px 0 0 0; color: #6b7280; font-size: 14px;">This email was sent from a notification-only address that cannot accept incoming email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

async function sendMissedEmails() {
  console.log('\n📧 Sending Missed Senior Project Digest Emails\n');
  console.log('═'.repeat(70));
  
  const datesToProcess = [
    {
      date: '2025-10-09',
      displayDate: 'October 9, 2025',
      start: '2025-10-09T00:00:00.000Z',
      end: '2025-10-10T00:00:00.000Z'
    },
    {
      date: '2025-10-12',
      displayDate: 'October 12, 2025',
      start: '2025-10-12T00:00:00.000Z',
      end: '2025-10-13T00:00:00.000Z'
    }
  ];

  let totalEmailsSent = 0;
  let totalEmailsFailed = 0;

  for (const dateInfo of datesToProcess) {
    console.log(`\n📅 Processing ${dateInfo.displayDate}...`);
    console.log(`   Time window: ${dateInfo.start} to ${dateInfo.end}`);
    
    // Get all projects
    const { data: projects, error: projectsError } = await supabase
      .from('senior_projects')
      .select('id, title, user_id');

    if (projectsError) {
      console.error('   ❌ Error fetching projects:', projectsError);
      continue;
    }

    if (!projects || projects.length === 0) {
      console.log('   ⚠️  No projects found');
      continue;
    }

    let emailsForThisDate = 0;

    for (const project of projects) {
      // Get signups for this date
      const { data: signups, error: signupsError } = await supabase
        .from('senior_project_signups')
        .select('name, email, created_at')
        .eq('project_id', project.id)
        .gte('created_at', dateInfo.start)
        .lt('created_at', dateInfo.end);

      if (signupsError) {
        console.error(`   ❌ Error fetching signups for project ${project.id}:`, signupsError);
        totalEmailsFailed++;
        continue;
      }

      if (!signups || signups.length === 0) {
        continue; // No signups for this project on this date
      }

      // Get owner email
      const { data: ownerData, error: ownerError } = await supabase.auth.admin.getUserById(project.user_id);

      if (ownerError || !ownerData?.user?.email) {
        console.error(`   ❌ Could not get owner email for project ${project.id}:`, ownerError);
        totalEmailsFailed++;
        continue;
      }

      const ownerEmail = ownerData.user.email;

      // Format signups
      const formattedSignups = signups.map(signup => ({
        volunteerName: signup.name || 'Unknown',
        volunteerEmail: signup.email || 'No email provided'
      }));

      console.log(`\n   📬 Sending to: ${ownerEmail}`);
      console.log(`      Project: "${project.title}"`);
      console.log(`      Signups: ${formattedSignups.length}`);

      try {
        // Create email
        const emailHtml = createSeniorProjectDigestEmail({
          projectTitle: project.title,
          signups: formattedSignups,
          totalSignups: formattedSignups.length,
          date: dateInfo.displayDate
        });

        // Send email
        await sendEmail({
          to: ownerEmail,
          subject: `Senior Project Sign-ups - ${project.title} (from ${dateInfo.displayDate})`,
          html: emailHtml
        });

        console.log(`      ✅ Email sent successfully!`);
        totalEmailsSent++;
        emailsForThisDate++;

        // Rate limit: Wait 100ms between emails to avoid hitting API limits
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        console.error(`      ❌ Failed to send email:`, error.message);
        totalEmailsFailed++;
      }
    }

    if (emailsForThisDate === 0) {
      console.log(`   ⚪ No emails needed for this date`);
    } else {
      console.log(`   ✅ Sent ${emailsForThisDate} email(s) for ${dateInfo.displayDate}`);
    }
  }

  console.log('\n' + '═'.repeat(70));
  console.log('📊 FINAL SUMMARY');
  console.log('═'.repeat(70));
  console.log(`Total emails sent: ${totalEmailsSent}`);
  console.log(`Total emails failed: ${totalEmailsFailed}`);
  
  if (totalEmailsSent > 0) {
    console.log('\n✅ Missed emails have been sent!');
  }
  
  if (totalEmailsFailed > 0) {
    console.log('\n⚠️  Some emails failed. Check the errors above.');
  }
  
  console.log('');
}

// Confirmation prompt
console.log('\n⚠️  IMPORTANT: This script will send emails for missed notifications.');
console.log('   It will send emails for:');
console.log('   - October 9, 2025 (3 emails expected)');
console.log('   - October 12, 2025 (4 emails expected)');
console.log('');
console.log('   These emails will be marked as "late notifications".');
console.log('');

// Check if --confirm flag is passed
if (!process.argv.includes('--confirm')) {
  console.log('❌ Please run with --confirm flag to proceed:');
  console.log('   node scripts/send-missed-senior-digest-emails.js --confirm');
  console.log('');
  process.exit(0);
}

sendMissedEmails()
  .then(() => {
    console.log('Script complete!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });

