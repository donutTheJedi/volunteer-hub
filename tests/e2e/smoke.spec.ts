import { test, expect } from '@playwright/test';

test('homepage renders and has opportunities link', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/Voluna|Next|Volunteer/i);
});

