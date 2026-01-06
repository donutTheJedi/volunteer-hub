# GitHub Secrets Setup Guide

Follow these steps to set up the required secrets in your GitHub repository:

## Step 1: Go to Repository Settings

1. Navigate to your GitHub repository
2. Click on the "Settings" tab
3. In the left sidebar, click on "Secrets and variables" → "Actions"

## Step 2: Add Required Secrets

Click "New repository secret" and add each of these secrets:

### Required Secrets

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `CRON_SECRET` | A secure random string for cron job authentication | `my-super-secret-cron-key-123` |
| `NEXT_PUBLIC_SITE_URL` | Your deployed site URL | `https://your-app.vercel.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL | `https://your-project.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anonymous key | `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...` |
| `RESEND_API_KEY` | Your Resend API key | `re_1234567890abcdef...` |

## Step 3: Generate a Secure CRON_SECRET

You can generate a secure random string using:

```bash
# On macOS/Linux
openssl rand -base64 32

# Or use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"

# Or use an online generator
# https://generate-secret.vercel.app/32
```

## Step 4: Verify Your Secrets

After adding all secrets, you should see them listed in the "Repository secrets" section. They will be masked (showing only `••••••••••••••••`).

## Step 5: Test the Setup

1. Go to the "Actions" tab in your repository
2. Click on "Cron Jobs" workflow
3. Click "Run workflow" to manually trigger a test
4. Check the logs to ensure everything is working

## Important Notes

- **Never commit secrets to your code** - they should only be in GitHub secrets
- **Secrets are encrypted** and only visible to repository administrators
- **Secrets are automatically available** to GitHub Actions workflows
- **You can update secrets** at any time without redeploying

## Troubleshooting

If the cron jobs fail:

1. **Check the logs** in the GitHub Actions tab
2. **Verify all secrets are set** correctly
3. **Test locally** using the test scripts
4. **Check your API keys** are valid and have proper permissions

## Security Best Practices

1. **Use strong, random secrets** for `CRON_SECRET`
2. **Rotate secrets regularly** (especially API keys)
3. **Limit access** to repository settings
4. **Monitor GitHub Actions logs** for any suspicious activity 