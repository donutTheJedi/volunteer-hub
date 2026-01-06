# Bug Fix: Senior Project Daily Digest Emails Not Sending

## Problem Summary

Senior project daily digest emails were not being sent even though:
- The GitHub Actions workflow ran successfully
- There were signups that should have triggered emails
- The workflow reported "0 emails sent" with status "successful"

### Affected Dates
- **October 9, 2025**: 6 signups across 3 projects (3 emails should have been sent) ❌
- **October 12, 2025**: 4 signups across 4 projects (4 emails should have been sent) ❌

## Root Cause

**Timezone Bug**: The code used `setHours(0, 0, 0, 0)` which operates in the **server's local timezone**, not UTC.

### The Issue:
```javascript
// OLD CODE (BUGGY)
const today = new Date();
today.setHours(0, 0, 0, 0);  // Sets to midnight in server's timezone!
```

When running on your deployment server (Vercel), if the server timezone was not UTC, this would create the wrong time window. For example:
- Server in UTC-6: Would look for signups from 06:00 UTC to 06:00 UTC next day
- But signups happened throughout the day in UTC time
- Result: Wrong time window = no signups found = no emails sent

### The Fix:
```javascript
// NEW CODE (FIXED)
const today = new Date();
today.setUTCHours(0, 0, 0, 0);  // Always uses UTC!
const tomorrow = new Date(today);
tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);  // Always uses UTC!
```

Now it correctly looks for signups from midnight UTC to midnight UTC the next day, regardless of server timezone.

## What Was Fixed

### Files Modified:
1. **`app/api/cron/route.ts`**:
   - Fixed `sendSeniorProjectDailyDigestEmails()` function (lines 407-410)
   - Fixed `sendDailyDigestEmails()` function (lines 296-299)
   - Both now use `setUTCHours()` and `setUTCDate()` instead of local timezone methods

### Files Created:
1. **`scripts/test-senior-project-digest-debug.js`** - Debug tool to see what signups exist
2. **`scripts/test-senior-project-historical.js`** - Check what emails should have been sent on past days
3. **`scripts/simulate-cron-oct12.js`** - Simulate the buggy behavior
4. **`scripts/simulate-cron-oct12-fixed.js`** - Verify the fix works
5. **`scripts/trigger-senior-digest-now.js`** - Manually trigger the digest

### Documentation Updated:
1. **`CRON_SETUP.md`** - Added troubleshooting notes about the timezone fix
2. **`package.json`** - Added npm scripts:
   - `npm run debug-senior-digest` - Debug what emails would be sent
   - `npm run test-cron:senior-digest` - Manually trigger the digest

## Verification

### Before Fix (Buggy):
```
Time window: 2025-10-12T06:00:00.000Z to 2025-10-13T06:00:00.000Z
❌ Wrong! Should start at 00:00 UTC, not 06:00 UTC
```

### After Fix:
```
Time window: 2025-10-12T00:00:00.000Z to 2025-10-13T00:00:00.000Z
✅ Correct! Starts at midnight UTC
✅ Found 4 signups on Oct 12
✅ Would send 4 emails
```

## What You Need to Do

### 1. Deploy the Fix
The code has been fixed locally. You need to deploy it to production:

```bash
git add app/api/cron/route.ts
git add scripts/*.js
git add package.json
git add CRON_SETUP.md
git add BUGFIX-SENIOR-PROJECT-EMAILS.md
git commit -m "Fix: Senior project digest timezone bug - use setUTCHours"
git push
```

### 2. Wait for Next Automatic Run
The GitHub Action will automatically run tomorrow at 6:00 PM UTC. If there are signups today (Oct 13), it will send emails correctly.

### 3. Monitor GitHub Actions
Go to your GitHub repository → Actions → "Senior Project Daily Digest" and check the logs tomorrow to verify emails are being sent.

### 4. Optional: Manually Trigger Now (If There Are Signups Today)
If you want to test immediately and there are signups today:

```bash
# First check if there are signups today
npm run debug-senior-digest

# If there are signups, trigger manually (requires dev server running at localhost:3000)
npm run test-cron:senior-digest
```

### 5. Consider Sending Missed Emails
The fix won't retroactively send the missed emails from Oct 9 and Oct 12. If you need to notify those project owners about missed signups, you could:
- Manually contact them
- Or create a one-time script to send "late notification" emails

## Prevention

✅ **This bug is now fixed for both:**
- Senior project daily digests
- Organization daily digests

✅ **All date calculations now use UTC explicitly**

✅ **Future emails will be sent correctly regardless of server timezone**

## Testing Commands

```bash
# See what signups exist and what emails would be sent TODAY
npm run debug-senior-digest

# Check what emails SHOULD have been sent on previous days
node scripts/test-senior-project-historical.js

# Manually trigger the digest (requires dev server running)
npm run test-cron:senior-digest

# Verify the fix works with Oct 12 simulation
node scripts/simulate-cron-oct12-fixed.js
```

## Questions?

If emails still don't send after deploying this fix:
1. Run `npm run debug-senior-digest` to see if there are actually signups
2. Check GitHub Actions logs for error messages
3. Verify environment variables (CRON_SECRET, RESEND_API_KEY, etc.) are set in GitHub secrets
4. Check Vercel deployment logs for any errors

---

**Fix Date**: October 13, 2025
**Affected Systems**: Senior Project Daily Digest, Organization Daily Digest
**Status**: ✅ Fixed, awaiting deployment

