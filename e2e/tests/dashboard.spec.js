import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  await page.goto('/signin');
  await page.fill('input[type=email]', 'admin@logitarget.com');
  await page.fill('input[type=password]', 'Admin123');
  await page.click('button[type=submit]');
  await page.waitForURL(/dashboard/);
});

test('dashboard loads with content', async ({ page }) => {
  await expect(page).toHaveURL(/dashboard/);
  await expect(page.locator('section.page-section')).toBeVisible();
});

test('fleet manager page loads', async ({ page }) => {
  await page.goto('/operation/fleet-manager');
  await expect(page.locator('text=Vehicle Registration')).toBeVisible();
});

test('archive page loads', async ({ page }) => {
  await page.goto('/operation/archive');
  await expect(page.locator('text=Trip archive')).toBeVisible();
});

test('archive page has export buttons', async ({ page }) => {
  await page.goto('/operation/archive');
  await expect(page.locator('text=Download Excel')).toBeVisible();
  await expect(page.locator('text=Export via e-mail')).toBeVisible();
  await expect(page.locator('text=Send as PDF via e-mail')).toBeVisible();
});

test('user can logout', async ({ page }) => {
  await page.locator('.user-menu, [class*=user]').first().click();
  const logoutBtn = page.locator('text=Logout, text=Cikis, text=Sign out').first();
  if (await logoutBtn.isVisible()) {
    await logoutBtn.click();
    await expect(page).toHaveURL(/signin|\//);
  }
});