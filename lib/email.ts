import { Resend } from 'resend';
import { createSupabaseAdmin } from './supabaseServer';
import { getUserLanguage } from './user-language';
import { 
  createSignupConfirmationEmail, 
  createReminderEmail, 
  createRollCallEmail, 
  createVerificationEmail, 
  createHoursAwardedEmail,
  createOrganizationVerificationEmail,
  createOrganizationPendingVerificationEmail,
  createOrganizationApprovedEmail,
  createOrganizationRejectedEmail,
  getEmailSubject,
  type EmailTemplateData 
} from './email-templates-multilingual';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail({
  to,
  subject,
  html,
  replyTo,
}: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}) {
  try {
    const data = await resend.emails.send({
      from: 'Voluna <notifications@voluna.org>',
      to,
      subject,
      html,
      replyTo: replyTo || 'support@voluna.org',
      headers: {
        'X-Entity-Ref-ID': `${Date.now()}-${Math.random().toString(36).substring(7)}`,
      },
    });
    return data;
  } catch (error) {
    console.error('Email send error:', error);
    throw error;
  }
}

// Helper function to get user's email and language preference
async function getUserEmailAndLanguage(userId: string): Promise<{ email: string; language: 'en' | 'es' | 'pt' }> {
  const admin = createSupabaseAdmin();
  const { data: { user }, error: userError } = await admin.auth.admin.getUserById(userId);
  if (userError || !user?.email) {
    throw new Error('Could not fetch user email');
  }

  const language = await getUserLanguage(userId);
  return { email: user.email, language };
}

// Multi-language email sending functions
export async function sendSignupConfirmationEmail(userId: string, data: EmailTemplateData) {
  const { email, language } = await getUserEmailAndLanguage(userId);
  const html = createSignupConfirmationEmail(data, language);
  const subject = getEmailSubject('signupConfirmation', data, language);
  
  return sendEmail({ to: email, subject, html });
}

export async function sendReminderEmail(userId: string, data: EmailTemplateData) {
  const { email, language } = await getUserEmailAndLanguage(userId);
  const html = createReminderEmail(data, language);
  const subject = getEmailSubject('reminder', data, language);
  
  return sendEmail({ to: email, subject, html });
}

export async function sendRollCallEmail(userId: string, data: EmailTemplateData) {
  const { email, language } = await getUserEmailAndLanguage(userId);
  const html = createRollCallEmail(data, language);
  const subject = getEmailSubject('rollCall', data, language);
  
  return sendEmail({ to: email, subject, html });
}

export async function sendVerificationEmail(userId: string, data: EmailTemplateData) {
  const { email, language } = await getUserEmailAndLanguage(userId);
  const html = createVerificationEmail(data, language);
  const subject = getEmailSubject('verification', data, language);
  
  return sendEmail({ to: email, subject, html });
}

export async function sendHoursAwardedEmail(userId: string, data: EmailTemplateData) {
  const { email, language } = await getUserEmailAndLanguage(userId);
  const html = createHoursAwardedEmail(data, language);
  const subject = getEmailSubject('hoursAwarded', data, language);
  
  return sendEmail({ to: email, subject, html });
}

export async function sendOrganizationPendingEmail(userId: string, data: EmailTemplateData, userEmail?: string) {
  let email: string;
  let language: 'en' | 'es' | 'pt';
  
  if (userEmail) {
    // Use provided email and get language preference
    email = userEmail;
    language = await getUserLanguage(userId);
  } else {
    // Fallback to fetching email and language
    const result = await getUserEmailAndLanguage(userId);
    email = result.email;
    language = result.language;
  }
  
  const html = createOrganizationPendingVerificationEmail(data, language);
  const subject = getEmailSubject('organizationPending', data, language);
  
  return sendEmail({ to: email, subject, html });
}

export async function sendOrganizationVerificationToAdmin(data: EmailTemplateData) {
  // Send to configured admin inbox (default fallback)
  const adminRecipient = process.env.ORG_ADMIN_EMAIL || process.env.ADMIN_EMAIL || 'baron@giggy.com';
  const html = createOrganizationVerificationEmail(data, 'es');
  const subject = getEmailSubject('organizationAdminNotification', data, 'es');
  
  return sendEmail({ to: adminRecipient, subject, html });
}

export async function sendOrganizationApprovedOrRejectedEmail(ownerUserId: string, data: EmailTemplateData, approved: boolean) {
  const { email, language } = await getUserEmailAndLanguage(ownerUserId);
  if (approved) {
    const html = createOrganizationApprovedEmail(data, language);
    const subject = getEmailSubject('organizationApproved', data, language);
    return sendEmail({ to: email, subject, html });
  } else {
    const html = createOrganizationRejectedEmail(data, language);
    const subject = getEmailSubject('organizationRejected', data, language);
    return sendEmail({ to: email, subject, html });
  }
}
