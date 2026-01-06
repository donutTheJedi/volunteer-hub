import { test, expect } from '@playwright/test';

test('login page renders', async ({ page }) => {
  await page.goto('/en/login');
  await expect(page.locator('form')).toBeVisible();
});

test('signup page renders', async ({ page }) => {
  await page.goto('/en/signup');
  await expect(page.locator('h1')).toHaveText(/join voluna/i);
});

