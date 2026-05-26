import { test, expect } from '@playwright/test';

test('homepage loads successfully', async ({ page }) => {
  await page.goto('/');
  await expect(page).toHaveTitle(/LogisTrack/);
});

test('user can navigate to sign in page', async ({ page }) => {
  await page.goto('/');
  await page.goto('/signin');
  await expect(page.locator('input[type=email]')).toBeVisible();
  await expect(page.locator('input[type=password]')).toBeVisible();
});

test('login with wrong credentials shows error', async ({ page }) => {
  await page.goto('/signin');
  await page.fill('input[type=email]', 'wrong@test.com');
  await page.fill('input[type=password]', 'wrongpassword');
  await page.click('button[type=submit]');
  await expect(page.locator('.form-error')).toBeVisible();
});

test('user can login successfully', async ({ page }) => {
  await page.goto('/signin');
  await page.fill('input[type=email]', 'admin@logitarget.com');
  await page.fill('input[type=password]', 'Admin123');
  await page.click('button[type=submit]');
  await page.waitForURL(/dashboard/);
  await expect(page).toHaveURL(/dashboard/);
});

test('user can navigate to register page', async ({ page }) => {
  await page.goto('/register');
  await expect(page.locator('input[type=email]')).toBeVisible();
});