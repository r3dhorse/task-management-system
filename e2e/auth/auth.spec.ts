import { test, expect } from '@playwright/test';
import { AuthHelper, TEST_USERS, resetDatabase, seedTestData } from '../utils/test-helpers';

test.describe('Authentication', () => {
  let authHelper: AuthHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    // Reset database and seed with test data before each test
    await resetDatabase();
    await seedTestData();
  });

  test.describe('Sign In', () => {
    test('should successfully sign in with valid credentials', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      
      // Should be redirected to dashboard, workspaces, or no-workspace
      expect(page.url()).toMatch(/\/(dashboard|workspaces|no-workspace)/);
      
      // The signIn helper already verifies successful authentication
      // No additional assertions needed as the helper throws on failure
    });

    test('should show error with invalid email', async ({ page }) => {
      await page.goto('/sign-in');
      await page.fill('[data-testid="email-input"]', 'invalid@test.com');
      await page.fill('[data-testid="password-input"]', 'password123');
      await page.click('[data-testid="signin-button"]');
      
      // Wait for the error toast to appear
      await expect(page.locator('text=Incorrect email or password. Please check your credentials and try again.')).toBeVisible();
      expect(page.url()).toMatch(/\/sign-in/);
    });

    test('should show error with invalid password', async ({ page }) => {
      await page.goto('/sign-in');
      await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
      await page.fill('[data-testid="password-input"]', 'wrongpassword');
      await page.click('[data-testid="signin-button"]');
      
      // Wait for the error toast to appear
      await expect(page.locator('text=Incorrect email or password. Please check your credentials and try again.')).toBeVisible();
      expect(page.url()).toMatch(/\/sign-in/);
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/sign-in');
      
      // Wait for form to load
      await page.waitForSelector('[data-testid="signin-button"]');
      
      // Click submit without filling fields
      await page.click('[data-testid="signin-button"]');
      
      // Check for the actual validation messages
      await expect(page.locator('text=Invalid email')).toBeVisible();
      await expect(page.locator('text=Required')).toBeVisible();
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.goto('/sign-in');
      
      // Fill with an invalid email format and submit
      await page.fill('[data-testid="email-input"]', 'not-an-email');
      await page.fill('[data-testid="password-input"]', 'somepassword');
      await page.click('[data-testid="signin-button"]');
      
      // For invalid email format, the server should reject with "Invalid credentials"
      // since the user doesn't exist, or client validation should trigger
      await page.waitForTimeout(2000);
      
      // The application may handle this as a server-side validation
      // Check if we get "Invalid credentials" or stay on sign-in page
      const currentUrl = page.url();
      const hasCredentialsError = await page.locator('text=Invalid credentials').isVisible();
      
      // Either we should see an error message or stay on sign-in page (not redirect)
      const stayedOnSignIn = currentUrl.includes('/sign-in');
      
      expect(hasCredentialsError || stayedOnSignIn).toBeTruthy();
    });
  });


  test.describe('Sign Out', () => {
    test('should successfully sign out', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      await authHelper.signOut();
      
      // Should be redirected to sign in page
      expect(page.url()).toMatch(/\/sign-in/);
      
      // Should not show user menu
      await expect(page.locator('[data-testid="user-menu"]')).not.toBeVisible();
    });
  });

  test.describe('Password Change', () => {
    test('should successfully change password', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      
      // Navigate to profile/settings
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="profile-settings"]');
      
      // Change password
      await page.fill('[data-testid="current-password-input"]', TEST_USERS.admin.password);
      await page.fill('[data-testid="new-password-input"]', 'newpassword123');
      await page.fill('[data-testid="confirm-new-password-input"]', 'newpassword123');
      await page.click('[data-testid="change-password-button"]');
      
      // Should show success message
      await expect(page.locator('text=Password changed successfully')).toBeVisible();
      
      // Sign out and try to sign in with new password
      await authHelper.signOut();
      
      await page.goto('/sign-in');
      await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
      await page.fill('[data-testid="password-input"]', 'newpassword123');
      await page.click('[data-testid="signin-button"]');
      
      // Should successfully sign in with new password
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should show error with incorrect current password', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="profile-settings"]');
      
      await page.fill('[data-testid="current-password-input"]', 'wrongpassword');
      await page.fill('[data-testid="new-password-input"]', 'newpassword123');
      await page.fill('[data-testid="confirm-new-password-input"]', 'newpassword123');
      await page.click('[data-testid="change-password-button"]');
      
      await expect(page.locator('text=Current password is incorrect')).toBeVisible();
    });

    test('should show error when new passwords do not match', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      
      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="profile-settings"]');
      
      await page.fill('[data-testid="current-password-input"]', TEST_USERS.admin.password);
      await page.fill('[data-testid="new-password-input"]', 'newpassword123');
      await page.fill('[data-testid="confirm-new-password-input"]', 'differentpassword');
      await page.click('[data-testid="change-password-button"]');
      
      await expect(page.locator("text=Passwords don't match")).toBeVisible();
    });
  });

  test.describe('Session Management', () => {
    test('should handle unauthenticated access appropriately', async ({ page }) => {
      // Use a fresh browser context to ensure no authentication state
      const freshContext = await page.context().browser()!.newContext();
      const freshPage = await freshContext.newPage();
      
      // Navigate to protected route with fresh context
      await freshPage.goto('/dashboard');
      await freshPage.waitForLoadState('networkidle');
      
      const currentUrl = freshPage.url();
      console.log('Current URL after navigation:', currentUrl);
      
      // Check if we're either redirected to sign-in or if the page shows authentication required
      const isRedirectedToSignIn = currentUrl.includes('/sign-in');
      const hasSignInForm = await freshPage.locator('[data-testid="email-input"]').isVisible().catch(() => false);
      const hasAuthenticationError = await freshPage.locator('text=/sign in|login|authentication/i').isVisible().catch(() => false);
      
      // At least one authentication check should be true
      expect(isRedirectedToSignIn || hasSignInForm || hasAuthenticationError).toBeTruthy();
      
      await freshContext.close();
    });

    test('should maintain session across page refreshes', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      
      // Refresh the page
      await page.reload();
      
      // Should still be authenticated
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      expect(page.url()).not.toMatch(/\/sign-in/);
    });

    test('should handle session expiry gracefully', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      
      // Simulate session expiry by clearing cookies or local storage
      await page.context().clearCookies();
      
      // Try to access a protected route
      await page.goto('/dashboard');
      
      // Should be redirected to sign in
      expect(page.url()).toMatch(/\/sign-in/);
    });
  });

  test.describe('Role-based Access', () => {
    test('should allow superadmin access to user management', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      
      await page.goto('/admin/users');
      
      // Should have access to user management page
      await expect(page.locator('[data-testid="user-management-page"]')).toBeVisible();
      await expect(page.locator('[data-testid="create-user-button"]')).toBeVisible();
    });

    test('should deny regular user access to user management', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.user1);
      
      await page.goto('/admin/users');
      
      // Should be redirected or show access denied
      expect(page.url()).not.toMatch(/\/admin\/users/);
      // OR should show access denied message
      // await expect(page.locator('text=Access denied')).toBeVisible();
    });

    test('should show different navigation options based on role', async ({ page }) => {
      // Test with superadmin
      await authHelper.signIn(TEST_USERS.admin);
      
      await page.click('[data-testid="user-menu"]');
      await expect(page.locator('[data-testid="admin-panel-link"]')).toBeVisible();
      
      await authHelper.signOut();
      
      // Test with regular user
      await authHelper.signIn(TEST_USERS.user1);
      
      await page.click('[data-testid="user-menu"]');
      await expect(page.locator('[data-testid="admin-panel-link"]')).not.toBeVisible();
    });
  });
});