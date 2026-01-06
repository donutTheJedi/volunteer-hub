
interface EmailTemplateData {
  name?: string;
  opportunityTitle?: string;
  startTime?: string;
  endTime?: string;
  location?: string;
  signupCount?: number;
  estimatedHours?: number;
  rollCallUrl?: string;
  organizationName?: string;
  verificationUrl?: string;
}

// Base email wrapper with consistent styling
export function createEmailWrapper(content: string, title?: string) {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${title || 'Voluna'}</title>
      <style>
        body { 
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; 
          line-height: 1.6; 
          color: #374151; 
          margin: 0; 
          padding: 0; 
          background-color: #f9fafb;
        }
        .email-container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: #ffffff; 
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header { 
          background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); 
          padding: 40px 30px; 
          text-align: center; 
          color: white;
        }
        .header h1 { 
          margin: 0; 
          font-size: 28px; 
          font-weight: 700; 
        }
        .header p { 
          margin: 10px 0 0 0; 
          opacity: 0.9; 
          font-size: 16px;
        }
        .content { 
          padding: 40px 30px; 
        }
        .highlight-box { 
          background-color: #f0fdf4; 
          border: 1px solid #bbf7d0; 
          border-radius: 12px; 
          padding: 24px; 
          margin: 24px 0; 
        }
        .warning-box { 
          background-color: #fef3c7; 
          border: 1px solid #fde68a; 
          border-radius: 12px; 
          padding: 24px; 
          margin: 24px 0; 
        }
        .info-box { 
          background-color: #eff6ff; 
          border: 1px solid #bfdbfe; 
          border-radius: 12px; 
          padding: 24px; 
          margin: 24px 0; 
        }
        .cta-button { 
          display: inline-block; 
          background: linear-gradient(135deg, #16a34a 0%, #22c55e 100%); 
          color: white; 
          padding: 16px 32px; 
          text-decoration: none; 
          border-radius: 8px; 
          font-weight: 600; 
          font-size: 16px; 
          margin: 20px 0; 
          box-shadow: 0 4px 6px rgba(22, 163, 74, 0.25);
          transition: all 0.2s ease;
        }
        .cta-button:hover { 
          transform: translateY(-2px); 
          box-shadow: 0 6px 12px rgba(22, 163, 74, 0.3);
        }
        .details-grid { 
          display: grid; 
          grid-template-columns: 1fr 1fr; 
          gap: 16px; 
          margin: 20px 0; 
        }
        .detail-item { 
          background-color: #f8fafc; 
          padding: 16px; 
          border-radius: 8px; 
          border-left: 4px solid #16a34a;
        }
        .detail-label { 
          font-weight: 600; 
          color: #374151; 
          font-size: 14px; 
          text-transform: uppercase; 
          letter-spacing: 0.5px;
        }
        .detail-value { 
          color: #1f2937; 
          font-size: 16px; 
          margin-top: 4px;
        }
        .footer { 
          background-color: #f8fafc; 
          padding: 30px; 
          text-align: center; 
          border-top: 1px solid #e5e7eb;
        }
        .footer p { 
          margin: 0; 
          color: #6b7280; 
          font-size: 14px;
        }
        .logo { 
          font-size: 32px; 
          margin-bottom: 16px;
        }
        @media (max-width: 600px) {
          .content { padding: 24px 20px; }
          .header { padding: 30px 20px; }
          .details-grid { grid-template-columns: 1fr; }
        }
      </style>
    </head>
    <body>
      <div class="email-container">
        <div class="header">
          <div class="logo">🌱</div>
          <h1>Voluna</h1>
          <p>Making volunteering simple and impactful</p>
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          <p>© 2024 Voluna. All rights reserved.</p>
          <p>This email was sent from a notification-only address that cannot accept incoming email.</p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Reminder email template
export function createReminderEmail(data: EmailTemplateData): string {
  const content = `
    <h2 style="color: #16a34a; margin-top: 0; font-size: 24px;">Hi ${data.name || 'there'}! 👋</h2>
    
    <div class="warning-box">
      <h3 style="color: #92400e; margin-top: 0; font-size: 20px;">⏰ Reminder: Your volunteer opportunity is tomorrow!</h3>
      <p style="color: #92400e; margin-bottom: 0; font-size: 16px;">
        Don't forget about <strong>${data.opportunityTitle}</strong> - it's happening tomorrow!
      </p>
    </div>

    <div class="highlight-box">
      <h3 style="color: #15803d; margin-top: 0;">Event Details:</h3>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">Event</div>
          <div class="detail-value">${data.opportunityTitle}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Date & Time</div>
          <div class="detail-value">${data.startTime}</div>
        </div>
        ${data.location ? `
        <div class="detail-item">
          <div class="detail-label">Location</div>
          <div class="detail-value">${data.location}</div>
        </div>
        ` : ''}
        ${data.estimatedHours ? `
        <div class="detail-item">
          <div class="detail-label">Duration</div>
          <div class="detail-value">${data.estimatedHours} hours</div>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="info-box">
      <h4 style="color: #1e40af; margin-top: 0;">What to bring:</h4>
      <ul style="color: #1e40af; padding-left: 20px;">
        <li>Comfortable clothing and shoes</li>
        <li>Water bottle</li>
        <li>Positive attitude and enthusiasm!</li>
      </ul>
    </div>

    <p style="font-size: 16px; color: #374151;">
      Thank you for volunteering your time to make a difference in our community. 
      We're excited to see you there!
    </p>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      If you need to cancel or have any questions, please contact the organization directly.
    </p>
  `;

  return createEmailWrapper(content, `Reminder: ${data.opportunityTitle}`);
}

// Roll call email template
export function createRollCallEmail(data: EmailTemplateData): string {
  const content = `
    <h2 style="color: #16a34a; margin-top: 0; font-size: 24px;">🕐 Roll Call Time!</h2>
    
    <div class="warning-box">
      <h3 style="color: #92400e; margin-top: 0; font-size: 20px;">
        <strong>${data.opportunityTitle}</strong> starts in 5 minutes!
      </h3>
      <p style="color: #92400e; margin-bottom: 0;">
        It's time to take roll call and track attendance for your volunteers.
      </p>
    </div>

    <div class="highlight-box">
      <h3 style="color: #15803d; margin-top: 0;">Opportunity Summary:</h3>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">Event</div>
          <div class="detail-value">${data.opportunityTitle}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Start Time</div>
          <div class="detail-value">${data.startTime}</div>
        </div>
        ${data.location ? `
        <div class="detail-item">
          <div class="detail-label">Location</div>
          <div class="detail-value">${data.location}</div>
        </div>
        ` : ''}
        <div class="detail-item">
          <div class="detail-label">Volunteers</div>
          <div class="detail-value">${data.signupCount} signed up</div>
        </div>
        ${data.estimatedHours ? `
        <div class="detail-item">
          <div class="detail-label">Duration</div>
          <div class="detail-value">${data.estimatedHours} hours</div>
        </div>
        ` : ''}
      </div>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.rollCallUrl}" class="cta-button">
        📋 Take Roll Call Now
      </a>
    </div>

    <div class="info-box">
      <h4 style="color: #1e40af; margin-top: 0;">How Roll Call Works:</h4>
      <ul style="color: #1e40af; padding-left: 20px;">
        <li>Click the button above to open the roll call page</li>
        <li>Mark who attended and who didn't show up</li>
        <li>Volunteer hours will be automatically awarded to attendees</li>
        <li>You can access roll call anytime during or after the event</li>
      </ul>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      This roll call link will remain active throughout and after the event.
    </p>
  `;

  return createEmailWrapper(content, `Roll Call: ${data.opportunityTitle}`);
}

// Signup confirmation email template
export function createSignupConfirmationEmail(data: EmailTemplateData): string {
  const content = `
    <h2 style="color: #16a34a; margin-top: 0; font-size: 24px;">Hi ${data.name || 'there'}! 🎉</h2>
    
    <div class="highlight-box">
      <h3 style="color: #15803d; margin-top: 0; font-size: 20px;">You're all signed up!</h3>
      <p style="color: #15803d; margin-bottom: 0; font-size: 16px;">
        Thank you for signing up to volunteer for <strong>${data.opportunityTitle}</strong>.
      </p>
    </div>

    <div class="highlight-box">
      <h3 style="color: #15803d; margin-top: 0;">Event Details:</h3>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">Event</div>
          <div class="detail-value">${data.opportunityTitle}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Date & Time</div>
          <div class="detail-value">${data.startTime}</div>
        </div>
        ${data.location ? `
        <div class="detail-item">
          <div class="detail-label">Location</div>
          <div class="detail-value">${data.location}</div>
        </div>
        ` : ''}
        ${data.estimatedHours ? `
        <div class="detail-item">
          <div class="detail-label">Duration</div>
          <div class="detail-value">${data.estimatedHours} hours</div>
        </div>
        ` : ''}
        ${data.organizationName ? `
        <div class="detail-item">
          <div class="detail-label">Organization</div>
          <div class="detail-value">${data.organizationName}</div>
        </div>
        ` : ''}
      </div>
    </div>

    <div class="info-box">
      <h4 style="color: #1e40af; margin-top: 0;">What happens next:</h4>
      <ul style="color: #1e40af; padding-left: 20px;">
        <li>You'll receive a reminder email 24 hours before the event</li>
        <li>Show up at the specified time and location</li>
        <li>Your volunteer hours will be automatically tracked</li>
        <li>You can view your volunteer history in your dashboard</li>
      </ul>
    </div>

    <p style="font-size: 16px; color: #374151;">
      We're excited to have you join us in making a difference! 
      If you have any questions, please don't hesitate to reach out.
    </p>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      If you need to cancel, please contact the organization as soon as possible.
    </p>
  `;

  return createEmailWrapper(content, `Confirmation: ${data.opportunityTitle}`);
}

// Email verification template
export function createVerificationEmail(data: EmailTemplateData): string {
  const content = `
    <h2 style="color: #16a34a; margin-top: 0; font-size: 24px;">Welcome to Voluna! 🌱</h2>
    
    <div class="highlight-box">
      <h3 style="color: #15803d; margin-top: 0; font-size: 20px;">Verify your email address</h3>
      <p style="color: #15803d; margin-bottom: 0; font-size: 16px;">
        Thanks for signing up! Please verify your email address to complete your registration.
      </p>
    </div>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${data.verificationUrl}" class="cta-button">
        ✅ Verify Email Address
      </a>
    </div>

    <div class="info-box">
      <h4 style="color: #1e40af; margin-top: 0;">What you can do after verification:</h4>
      <ul style="color: #1e40af; padding-left: 20px;">
        <li>Browse and sign up for volunteer opportunities</li>
        <li>Track your volunteer hours and impact</li>
        <li>Connect with organizations in your community</li>
        <li>Build your volunteer profile and history</li>
      </ul>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      If you didn't create an account with Voluna, you can safely ignore this email.
    </p>
  `;

  return createEmailWrapper(content, 'Verify your Voluna account');
}

// Hours awarded email template
export function createHoursAwardedEmail(data: EmailTemplateData): string {
  const content = `
    <h2 style="color: #16a34a; margin-top: 0; font-size: 24px;">Hi ${data.name || 'there'}! 🎉</h2>
    
    <div class="highlight-box">
      <h3 style="color: #15803d; margin-top: 0; font-size: 20px;">Volunteer hours awarded!</h3>
      <p style="color: #15803d; margin-bottom: 0; font-size: 16px;">
        Congratulations! You've been awarded volunteer hours for your participation.
      </p>
    </div>

    <div class="highlight-box">
      <h3 style="color: #15803d; margin-top: 0;">Activity Summary:</h3>
      <div class="details-grid">
        <div class="detail-item">
          <div class="detail-label">Event</div>
          <div class="detail-value">${data.opportunityTitle}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Hours Awarded</div>
          <div class="detail-value">${data.estimatedHours} hours</div>
        </div>
        ${data.organizationName ? `
        <div class="detail-item">
          <div class="detail-label">Organization</div>
          <div class="detail-value">${data.organizationName}</div>
        </div>
        ` : ''}
        <div class="detail-item">
          <div class="detail-label">Date</div>
          <div class="detail-value">${data.startTime}</div>
        </div>
      </div>
    </div>

    <div class="info-box">
      <h4 style="color: #1e40af; margin-top: 0;">Your impact:</h4>
      <p style="color: #1e40af; margin-bottom: 0;">
        Thank you for making a difference in your community! Your volunteer hours have been 
        automatically added to your profile and will help track your ongoing impact.
      </p>
    </div>

    <p style="font-size: 16px; color: #374151;">
      Keep up the great work! Every hour you volunteer makes a real difference in someone's life.
    </p>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      You can view your complete volunteer history and impact statistics in your dashboard.
    </p>
  `;

  return createEmailWrapper(content, `Hours Awarded: ${data.opportunityTitle}`);
}

// Daily digest email template for organizations
export function createDailyDigestEmail(data: EmailTemplateData & { 
  organizationId: string;
  signups: Array<{
    volunteerName: string;
    volunteerEmail: string;
    volunteerPhone: string;
    volunteerInstitution: string;
    opportunityTitle: string;
    signupDate: string;
  }>;
  totalSignups: number;
}): string {
  const content = `
    <h2 style="color: #16a34a; margin-top: 0; font-size: 24px;">Volunteer Sign-ups 📊</h2>
    
    <div class="highlight-box">
      <h3 style="color: #15803d; margin-top: 0;">${data.organizationName} - Today's Activity</h3>
      <p style="margin-bottom: 0; font-size: 18px;">
        <strong>${data.totalSignups}</strong> new volunteer sign-up${data.totalSignups !== 1 ? 's' : ''} today!
      </p>
    </div>

    ${data.totalSignups > 0 ? `
    <div class="content-section">
      <h3 style="color: #374151; margin-top: 0; font-size: 20px;">New Sign-ups:</h3>
      
      ${data.signups.map(signup => `
        <div class="signup-item" style="background-color: #f9fafb; border-left: 4px solid #16a34a; padding: 15px; margin: 10px 0; border-radius: 0 8px 8px 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
              <h4 style="margin: 0 0 5px 0; color: #374151; font-size: 16px;">${signup.volunteerName}</h4>
              <p style="margin: 0 0 3px 0; color: #6b7280; font-size: 14px;">📧 ${signup.volunteerEmail}</p>
              <p style="margin: 0 0 3px 0; color: #6b7280; font-size: 14px;">📞 ${signup.volunteerPhone}</p>
              <p style="margin: 0 0 5px 0; color: #6b7280; font-size: 14px;">🏫 ${signup.volunteerInstitution}</p>
              <p style="margin: 0; color: #16a34a; font-size: 14px; font-weight: 600;">🎯 ${signup.opportunityTitle}</p>
            </div>
            <div style="text-align: right; color: #6b7280; font-size: 12px;">
              ${signup.signupDate}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    ` : `
    <div class="content-section">
      <p style="color: #6b7280; font-style: italic;">No new sign-ups today. Check back tomorrow!</p>
    </div>
    `}

    <div class="content-section">
      <p style="color: #374151; font-size: 16px;">
        Thank you for using Voluna to connect with volunteers! 
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://voluna.com'}/dashboard/${data.organizationId}" style="color: #16a34a; text-decoration: none; font-weight: 600;">Visit your dashboard</a> to manage your opportunities.
      </p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      This is an automated daily digest. You can manage your notification preferences in your organization settings.
    </p>
  `;

  return createEmailWrapper(content, `Sign-ups: ${data.organizationName}`);
}

// Senior project daily digest email template
export function createSeniorProjectDailyDigestEmail(data: EmailTemplateData & { 
  projectTitle: string;
  signups: Array<{
    volunteerName: string;
    volunteerEmail: string;
    signupDate: string;
  }>;
  totalSignups: number;
}): string {
  const content = `
    <h2 style="color: #16a34a; margin-top: 0; font-size: 24px;">Senior Project Sign-ups 📊</h2>
    
    <div class="highlight-box">
      <h3 style="color: #15803d; margin-top: 0;">${data.projectTitle} - Today's Activity</h3>
      <p style="margin-bottom: 0; font-size: 18px;">
        <strong>${data.totalSignups}</strong> new volunteer sign-up${data.totalSignups !== 1 ? 's' : ''} today!
      </p>
    </div>

    ${data.totalSignups > 0 ? `
    <div class="content-section">
      <h3 style="color: #374151; margin-top: 0; font-size: 20px;">New Sign-ups:</h3>
      
      ${data.signups.map(signup => `
        <div class="signup-item" style="background-color: #f9fafb; border-left: 4px solid #16a34a; padding: 15px; margin: 10px 0; border-radius: 0 8px 8px 0;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap;">
            <div style="flex: 1; min-width: 200px;">
              <h4 style="margin: 0 0 5px 0; color: #374151; font-size: 16px;">${signup.volunteerName}</h4>
              <p style="margin: 0 0 3px 0; color: #6b7280; font-size: 14px;">📧 ${signup.volunteerEmail}</p>
            </div>
            <div style="text-align: right; color: #6b7280; font-size: 12px;">
              ${signup.signupDate}
            </div>
          </div>
        </div>
      `).join('')}
    </div>
    ` : `
    <div class="content-section">
      <p style="color: #6b7280; font-style: italic;">No new sign-ups today. Check back tomorrow!</p>
    </div>
    `}

    <div class="content-section">
      <p style="color: #374151; font-size: 16px;">
        Thank you for using Voluna for your senior project! 
        <a href="${process.env.NEXT_PUBLIC_SITE_URL || 'https://voluna.com'}/dashboard" style="color: #16a34a; text-decoration: none; font-weight: 600;">Visit your dashboard</a> to manage your project.
      </p>
    </div>

    <p style="font-size: 14px; color: #6b7280; margin-top: 30px;">
      This is an automated daily digest for your senior project.
    </p>
  `;

  return createEmailWrapper(content, `Sign-ups: ${data.projectTitle}`);
}