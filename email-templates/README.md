# Voluna Email Templates

This directory contains custom email templates for Voluna that match your app's branding and design.

## Files

- `voluna-verification.html` - HTML version of the signup confirmation email
- `voluna-verification-text.txt` - Plain text version of the signup confirmation email

## How to Configure in Supabase

### Method 1: Using the Dashboard

1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **Email Templates**
3. Select **Confirm signup** template
4. Replace the content with the HTML from `voluna-verification.html`
5. Save the changes

### Method 2: Using the Management API

```bash
# Get your access token from https://supabase.com/dashboard/account/tokens
export SUPABASE_ACCESS_TOKEN="your-access-token"
export PROJECT_REF="your-project-ref"

# Update the email template
curl -X PATCH "https://api.supabase.com/v1/projects/$PROJECT_REF/config/auth" \
  -H "Authorization: Bearer $SUPABASE_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "mailer_subjects_confirmation": "Confirm your Voluna account",
    "mailer_templates_confirmation_content": "'"$(cat voluna-verification.html | sed 's/"/\\"/g' | tr -d '\n')"'"
  }'
```

## Template Variables

The template uses these Supabase variables:
- `{{ .ConfirmationURL }}` - The confirmation link
- `{{ .SiteURL }}` - Your app's URL
- `{{ .Token }}` - 6-digit OTP code (alternative method)

## Customization

To customize the template further:
1. Edit the HTML/CSS in `voluna-verification.html`
2. Update colors to match your brand (currently uses green theme)
3. Modify the messaging to match your tone
4. Add your logo or additional branding elements

## Testing

After updating the template:
1. Try signing up with a test email
2. Check that the email renders correctly
3. Verify the confirmation link works
4. Test on both light and dark mode email clients

## Notes

- The template includes dark mode support via CSS media queries
- It's mobile-responsive and works across email clients
- Includes security messaging and alternative confirmation methods
- Uses your existing green color scheme (#10b981, #059669)
