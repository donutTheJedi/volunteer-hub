# Cron Jobs Setup Guide (GitHub Actions)

This guide explains how to set up and use the automated email cron jobs for the Volunteer Hub application using GitHub Actions.

## Overview

The application has these automated jobs:

1. **Reminder Emails** - Sent 24 hours before opportunities start
2. **Roll Call Emails** - Sent ~5 minutes before opportunities start
3. **Daily Digest Emails** - Sent daily to organizations with volunteer signup summaries
4. **Senior Project Daily Digest** - Sent daily to senior project owners with signup summaries
5. **Roll-Forward Opportunities** - Automatically advances ended recurring opportunities (daily/weekly/monthly)

## Files Created

- `app/api/cron/reminder-emails/route.ts` - Handles reminder emails
- `app/api/cron/roll-call-emails/route.ts` - Handles roll call emails
- `app/api/cron/route.ts` - Consolidated cron handler for multiple job types
- `app/api/send-daily-digest-emails/route.ts` - Standalone daily digest route
- `.github/workflows/reminders.yml` - Reminder emails workflow
- `.github/workflows/roll-call.yml` - Roll call emails workflow
- `.github/workflows/daily-digest.yml` - Daily digest emails workflow
- `.github/workflows/senior-project-daily-digest.yml` - Senior project digest workflow
- `.github/workflows/roll-forward.yml` - Roll-forward opportunities workflow
- `scripts/test-cron.js` - Local testing script

## Environment Variables

Add these to your GitHub repository secrets:

```bash
# Required for cron job security
CRON_SECRET=your-secure-random-string-here

# Your site URL (for roll call links)
NEXT_PUBLIC_SITE_URL=https://your-domain.com

# Supabase configuration
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-supabase-service-role-key

# Email service
RESEND_API_KEY=your-resend-api-key
```

## GitHub Actions Configuration

The cron jobs are configured in `.github/workflows/cron-jobs.yml`:

```yaml
on:
  schedule:
    # Reminder emails - daily at 9:00 AM UTC
    - cron: '0 9 * * *'
    # Roll call emails - every 5 minutes
    - cron: '*/5 * * * *'
  workflow_dispatch:  # Allow manual triggering
```

### Schedule Explanation

- **Reminder Emails**: `0 9 * * *` - Runs daily at 9:00 AM UTC
- **Roll Call Emails**: `*/5 * * * *` - Runs every 5 minutes (limited to avoid rate limits)
- **Daily Digest Emails**: `0 18 * * *` - Runs daily at 6:00 PM UTC
- **Senior Project Daily Digest**: `0 18 * * *` - Runs daily at 6:00 PM UTC
- **Roll-Forward Opportunities**: Run every 30–60 minutes, e.g. `0 * * * *` (hourly). This job moves any ended recurring opportunities forward to the next occurrence.

## Local Testing

### 1. Test Both Jobs
```bash
npm run test-cron
```

### 2. Test Reminder Emails Only
```bash
npm run test-cron:reminder
```

### 3. Test Roll Call Emails Only
```bash
npm run test-cron:rollcall
```

### 4. Manual Testing with curl
```bash
# Test reminder emails (legacy direct route)
curl -X POST https://your-domain.com/api/cron/reminder-emails \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"

# Test roll call emails (direct route)
curl -X POST https://your-domain.com/api/cron/roll-call-emails \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json"

# Test roll-forward opportunities (via consolidated cron router)
curl -X POST https://your-domain.com/api/cron \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json" \
  -d '{"job":"roll-forward-opportunities"}'

# Test daily digest emails (via consolidated cron router)
curl -X POST https://your-domain.com/api/cron \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json" \
  -d '{"job":"daily-digest-emails"}'

# Test senior project daily digest (via consolidated cron router)
curl -X POST https://your-domain.com/api/cron \
  -H "Authorization: Bearer your-cron-secret" \
  -H "Content-Type: application/json" \
  -d '{"job":"senior-project-daily-digest"}'
```

## How It Works

### Reminder Emails
- Runs daily at 9:00 AM UTC
- Finds opportunities starting in the next 23-24 hours
- Sends reminder emails to all signed-up volunteers
- Email includes opportunity details and start time

### Roll Call Emails
- Runs every 5 minutes
- Finds opportunities starting in the next 5-6 minutes
- Sends roll call emails to organization owners
- Email includes roll call link and opportunity details

### Daily Digest Emails
- Runs daily at 6:00 PM UTC
- Sends summary emails to organizations with volunteer signup activity from that day
- Includes volunteer contact information (name, email, phone, institution) and opportunity details
- Only sends to organizations with `reach_out_email` configured
- Skips organizations with no new signups that day (no email sent)

### Senior Project Daily Digest
- Runs daily at 6:00 PM UTC
- Sends summary emails to senior project owners with new signups
- Only sends emails when there are new signups for that day
- Includes volunteer names and email addresses
- Skips projects with no signups (no email sent)

### Roll-Forward Opportunities
- Recommended schedule: hourly
- Finds recurring opportunities (`frequency` in `daily`, `weekly`, `monthly`) whose `end_time` is in the past
- Advances `start_time`/`end_time` forward by the recurrence until the new `end_time` is in the future
- Resets `rollcall_email_sent_at` to allow notifications for the new occurrence
- Ensures only one active instance by updating the same row (in-place)

## Security

The cron jobs are protected by:
1. **Authorization Header** - Must include `Bearer <CRON_SECRET>`
2. **GitHub Secrets** - All sensitive data stored as GitHub secrets
3. **GitHub Actions** - Only GitHub's scheduled actions can trigger these endpoints

## Monitoring

### GitHub Actions Logs
Check GitHub Actions logs to monitor cron job execution:
1. Go to your repository on GitHub
2. Click on "Actions" tab
3. Click on "Cron Jobs" workflow
4. View the latest runs and their logs

### Response Format
Cron endpoints return JSON responses like:
```json
{
  "success": true,
  "emailsSent": 5,
  "emailsFailed": 0
}
```

## Testing Locally

You can debug and test the senior project digest locally:

```bash
# Debug what signups exist and what emails would be sent
npm run debug-senior-digest

# Manually trigger the senior project digest (requires dev server running)
npm run test-cron:senior-digest
```

## Troubleshooting

### Common Issues

1. **"Unauthorized" Error**
   - Check that `CRON_SECRET` is set in GitHub secrets
   - Verify the authorization header is correct

2. **No Emails Sent (GitHub Actions says "successful" but 0 emails)**
   - **FIXED (Oct 2025)**: Timezone bug - the code was using `setHours()` instead of `setUTCHours()`, causing it to look for signups in the wrong time window
   - Check if there are actually signups/opportunities in the correct time windows using `npm run debug-senior-digest`
   - Verify email service (Resend) is configured correctly
   - Check GitHub Actions logs for errors
   - Check that server timezone is set correctly (the fix now uses UTC explicitly)

3. **Roll Call Emails Not Working**
   - Check that organizations have a valid contact_email set
   - Verify the contact email addresses in the organizations table are correct

4. **Daily Digest Timezone Issues**
   - The system now uses UTC for all date calculations (`setUTCHours()` instead of `setHours()`)
   - Signups are stored in UTC in the database
   - The daily digest runs at 6:00 PM UTC and looks for signups from midnight UTC to midnight UTC

### Debug Mode

To enable debug logging, add this to your environment:
```bash
DEBUG_CRON=true
```

## Production Considerations

1. **Email Configuration**: Organizer emails are collected when creating organizations - no additional configuration needed
2. **Error Handling**: Add retry logic for failed email sends
3. **Rate Limiting**: Consider rate limiting for high-volume scenarios
4. **Monitoring**: Set up alerts for failed cron jobs
5. **Time Zones**: Ensure proper timezone handling for your region

## Manual Triggering

You can manually trigger the cron jobs from GitHub:
1. Go to your repository on GitHub
2. Click on "Actions" tab
3. Click on "Cron Jobs" workflow
4. Click "Run workflow" button
5. Choose which job to run (reminder or roll call)

## Alternative Cron Services

If not using GitHub Actions, you can use other cron services:

### External Services
- **Cron-job.org** - Free cron service
- **EasyCron** - Paid service with good features
- **AWS EventBridge** - For AWS deployments
- **Vercel Cron** - For Vercel deployments (Pro plan required)

## Support

For issues or questions:
1. Check GitHub Actions logs
2. Test locally with the provided scripts
3. Verify environment variables are set correctly
4. Ensure your email service (Resend) is working 