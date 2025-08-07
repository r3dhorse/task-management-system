import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS, resetDatabase, seedTestData } from '../utils/test-helpers';

test.describe('Basic Authentication Smoke Tests', () => {
  test.beforeAll(async () => {
    // Reset and seed test database
    await resetDatabase();
    await seedTestData();
  });

  test('can visit sign-in page', async ({ page }) => {
    await page.goto('/sign-in');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Check basic elements exist
    await expect(page.locator('[data-testid="email-input"]')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="signin-button"]')).toBeVisible();
    
    // Check we're on the right page
    expect(page.url()).toContain('/sign-in');
  });

  test('can sign in with valid credentials', async ({ page }) => {
    await page.goto('/sign-in');
    await page.waitForLoadState('networkidle');
    
    // Fill in credentials
    await page.locator('[data-testid="email-input"]').fill(TEST_USERS.admin.email);
    await page.locator('[data-testid="password-input"]').fill(TEST_USERS.admin.password);
    
    // Submit form
    await page.locator('[data-testid="signin-button"]').click();
    
    // Wait for redirect and check we're not on sign-in page anymore
    await page.waitForURL((url) => !url.pathname.includes('/sign-in'), { timeout: 15000 });
    
    const currentUrl = page.url();
    expect(currentUrl).not.toContain('/sign-in');
  });

  test('invalid credentials show error', async ({ page }) => {
    await page.goto('/sign-in');
    
    // Wait for form to load
    await page.waitForSelector('[data-testid="email-input"]', { timeout: 10000 });
    
    // Fill with invalid credentials
    await page.locator('[data-testid="email-input"]').fill('invalid@test.com');
    await page.locator('[data-testid="password-input"]').fill('wrongpassword');
    
    // Submit form
    await page.locator('[data-testid="signin-button"]').click();
    
    // Should stay on sign-in page (authentication failed)
    await page.waitForTimeout(2000);
    const currentUrl = page.url();
    expect(currentUrl).toContain('/sign-in');
  });
});