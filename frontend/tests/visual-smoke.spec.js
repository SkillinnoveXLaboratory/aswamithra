import { expect, test } from '@playwright/test';

const baseURL = 'http://localhost:5173';

test.use({
  channel: 'chrome',
  viewport: { width: 1440, height: 980 },
});

async function assertCleanPage(page) {
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  return errors;
}

async function loginAs(page, role, mobile, expectedHeading) {
  await page.goto(`${baseURL}/login`);
  await page.getByRole('button', { name: new RegExp(role, 'i') }).click();
  await page.getByLabel('Mobile number').fill(mobile);
  await page.getByRole('button', { name: /send otp/i }).click();
  await page.getByLabel('6 digit OTP').fill('123456');
  await page.getByRole('button', { name: /verify and continue/i }).click();
  await expect(page.getByRole('heading', { name: expectedHeading })).toBeVisible({ timeout: 12000 });
}

test('public landing and role portals render with backend data', async ({ page }) => {
  const errors = await assertCleanPage(page);

  await page.goto(baseURL);
  await expect(page.getByRole('heading', { name: /marketplace|fresh farm products/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /get started/i }).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/aswamithra-landing-desktop.png', fullPage: true });

  await loginAs(page, 'Customer', '+919876543210', /Customer Marketplace/i);
  await expect(page.getByText(/Nearby products/i)).toBeVisible();
  await page.getByRole('link', { name: /Browse/i }).click();
  await expect(page.getByPlaceholder(/Search rice/i)).toBeVisible();
  await expect(page.getByRole('button', { name: /Add to cart/i }).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/aswamithra-customer-dashboard.png', fullPage: true });

  await page.evaluate(() => localStorage.clear());
  await loginAs(page, 'Farmer', '+919876543211', /Farmer Seller Portal/i);
  await page.getByRole('link', { name: /Products/i }).click();
  await expect(page.getByRole('heading', { name: /Your products/i })).toBeVisible();
  await page.screenshot({ path: 'test-results/aswamithra-farmer-dashboard.png', fullPage: true });

  await page.evaluate(() => localStorage.clear());
  await loginAs(page, 'B2B', '+919876543212', /B2B Wholesale Portal/i);
  await expect(page.getByRole('heading', { name: /Bulk catalog/i })).toBeVisible();
  await page.screenshot({ path: 'test-results/aswamithra-b2b-dashboard.png', fullPage: true });

  await page.evaluate(() => localStorage.clear());
  await loginAs(page, 'Admin', '+919876543213', /Admin Command Center/i);
  await page.getByRole('link', { name: /KYC/i }).click();
  await expect(page.getByRole('heading', { name: /KYC review queue/i })).toBeVisible();
  await page.screenshot({ path: 'test-results/aswamithra-admin-dashboard.png', fullPage: true });

  expect(errors).toEqual([]);
});

test('mobile landing keeps content readable', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(baseURL);
  await expect(page.getByRole('heading', { name: /marketplace|fresh farm products/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /get started/i }).first()).toBeVisible();
  await page.screenshot({ path: 'test-results/aswamithra-landing-mobile.png', fullPage: true });
});
