import { test, expect } from '@playwright/test';
import { AuthHelper, UserHelper, WorkspaceHelper, TEST_USERS, resetDatabase, seedTestData } from '../utils/test-helpers';

test.describe('User Management', () => {
  let authHelper: AuthHelper;
  let userHelper: UserHelper;
  let workspaceHelper: WorkspaceHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    userHelper = new UserHelper(page);
    workspaceHelper = new WorkspaceHelper(page);
    await resetDatabase();
    await seedTestData();
  });

  test.describe('SuperAdmin User Management', () => {
    test.beforeEach(async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
    });

    test('should create new user with temporary password', async ({ page }) => {
      const newUserData = {
        name: 'New Employee',
        email: 'newemployee@test.com',
        tempPassword: 'temp123',
        role: 'ADMIN' as const,
      };

      await userHelper.createUser(newUserData);

      // Verify user appears in user list
      await expect(page.locator(`text=${newUserData.email}`)).toBeVisible();
      await expect(page.locator(`text=${newUserData.name}`)).toBeVisible();
      
      // Verify role is displayed
      const userRow = page.locator(`[data-testid="user-row"]:has-text("${newUserData.email}")`);
      await expect(userRow.locator('text=Admin')).toBeVisible();
    });

    test('should create user with different roles', async ({ page }) => {
      await userHelper.createUser({
        name: 'Super Admin User',
        email: 'superadmin@test.com',
        tempPassword: 'temp123',
        role: 'SUPERADMIN',
      });

      await userHelper.createUser({
        name: 'Regular User',
        email: 'regular@test.com',
        tempPassword: 'temp123',
      });

      // Verify both users with correct roles
      await expect(page.locator(`[data-testid="user-row"]:has-text("superadmin@test.com") text=Super Admin`)).toBeVisible();
      await expect(page.locator(`[data-testid="user-row"]:has-text("regular@test.com") text=User`)).toBeVisible();
    });

    test('should show validation error for duplicate email', async ({ page }) => {
      await userHelper.createUser({
        name: 'First User',
        email: 'duplicate@test.com',
        tempPassword: 'temp123',
      });

      // Try to create another user with same email
      await page.goto('/admin/users');
      await page.click('[data-testid="create-user-button"]');
      await page.fill('[data-testid="user-name-input"]', 'Second User');
      await page.fill('[data-testid="user-email-input"]', 'duplicate@test.com');
      await page.fill('[data-testid="temp-password-input"]', 'temp123');
      await page.click('[data-testid="create-user-submit"]');

      await expect(page.locator('text=Email already exists')).toBeVisible();
    });

    test('should show validation errors for empty fields', async ({ page }) => {
      await page.goto('/admin/users');
      await page.click('[data-testid="create-user-button"]');
      await page.click('[data-testid="create-user-submit"]');

      await expect(page.locator('text=Name is required')).toBeVisible();
      await expect(page.locator('text=Email is required')).toBeVisible();
      await expect(page.locator('text=Temporary password is required')).toBeVisible();
    });

    test('should show validation error for invalid email format', async ({ page }) => {
      await page.goto('/admin/users');
      await page.click('[data-testid="create-user-button"]');
      await page.fill('[data-testid="user-name-input"]', 'Test User');
      await page.fill('[data-testid="user-email-input"]', 'invalid-email');
      await page.fill('[data-testid="temp-password-input"]', 'temp123');
      await page.click('[data-testid="create-user-submit"]');

      await expect(page.locator('text=Invalid email format')).toBeVisible();
    });

    test('should edit user details', async ({ page }) => {
      await userHelper.createUser({
        name: 'Original Name',
        email: 'original@test.com',
        tempPassword: 'temp123',
      });

      // Edit user
      const userRow = page.locator(`[data-testid="user-row"]:has-text("original@test.com")`);
      await userRow.locator('[data-testid="edit-user-button"]').click();

      await page.fill('[data-testid="edit-name-input"]', 'Updated Name');
      await page.fill('[data-testid="edit-email-input"]', 'updated@test.com');
      await page.click('[data-testid="save-user-button"]');

      // Verify changes
      await expect(page.locator('text=User updated successfully')).toBeVisible();
      await expect(page.locator('text=Updated Name')).toBeVisible();
      await expect(page.locator('text=updated@test.com')).toBeVisible();
      await expect(page.locator('text=Original Name')).not.toBeVisible();
    });

    test('should set temporary password for existing user', async ({ page }) => {
      await userHelper.createUser({
        name: 'Password Reset User',
        email: 'resetpassword@test.com',
        tempPassword: 'temp123',
      });

      await userHelper.setTempPassword('resetpassword@test.com', 'newtemp456');

      // Verify success message
      await expect(page.locator('text=Password updated successfully')).toBeVisible();
    });

    test('should delete user successfully', async ({ page }) => {
      await userHelper.createUser({
        name: 'User to Delete',
        email: 'delete@test.com',
        tempPassword: 'temp123',
      });

      await userHelper.deleteUser('delete@test.com');

      // Verify user is deleted
      await expect(page.locator('text=delete@test.com')).not.toBeVisible();
    });

    test('should show confirmation dialog before deleting user', async ({ page }) => {
      await userHelper.createUser({
        name: 'Confirm Delete User',
        email: 'confirmdelete@test.com',
        tempPassword: 'temp123',
      });

      const userRow = page.locator(`[data-testid="user-row"]:has-text("confirmdelete@test.com")`);
      await userRow.locator('[data-testid="delete-user-button"]').click();

      // Should show confirmation dialog
      await expect(page.locator('text=Are you sure you want to delete this user?')).toBeVisible();
      await expect(page.locator('[data-testid="confirm-delete-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-delete-button"]')).toBeVisible();
    });

    test('should cancel user deletion', async ({ page }) => {
      await userHelper.createUser({
        name: 'Cancel Delete User',
        email: 'canceldelete@test.com',
        tempPassword: 'temp123',
      });

      const userRow = page.locator(`[data-testid="user-row"]:has-text("canceldelete@test.com")`);
      await userRow.locator('[data-testid="delete-user-button"]').click();
      await page.click('[data-testid="cancel-delete-button"]');

      // User should still be visible
      await expect(page.locator('text=canceldelete@test.com')).toBeVisible();
    });

    test('should prevent deleting other superadmins', async ({ page }) => {
      // Create another superadmin
      await userHelper.createUser({
        name: 'Another SuperAdmin',
        email: 'anothersuperadmin@test.com',
        tempPassword: 'temp123',
        role: 'SUPERADMIN',
      });

      const userRow = page.locator(`[data-testid="user-row"]:has-text("anothersuperadmin@test.com")`);
      
      // Delete button should be disabled or not visible
      await expect(userRow.locator('[data-testid="delete-user-button"]')).toBeDisabled();
    });

    test('should prevent deleting self', async ({ page }) => {
      await page.goto('/admin/users');

      const currentUserRow = page.locator(`[data-testid="user-row"]:has-text("${TEST_USERS.admin.email}")`);
      
      // Delete button should be disabled or not visible for current user
      await expect(currentUserRow.locator('[data-testid="delete-user-button"]')).toBeDisabled();
    });

    test('should change user role', async ({ page }) => {
      await userHelper.createUser({
        name: 'Role Change User',
        email: 'rolechange@test.com',
        tempPassword: 'temp123',
      });

      // Change role from User to Admin
      const userRow = page.locator(`[data-testid="user-row"]:has-text("rolechange@test.com")`);
      await userRow.locator('[data-testid="role-select"]').click();
      await page.click('[data-testid="role-option-ADMIN"]');

      // Verify role changed
      await expect(page.locator('text=User role updated successfully')).toBeVisible();
      await expect(userRow.locator('text=Admin')).toBeVisible();
    });

    test('should filter users by role', async ({ page }) => {
      // Create users with different roles
      await userHelper.createUser({
        name: 'Admin User',
        email: 'adminuser@test.com',
        tempPassword: 'temp123',
        role: 'ADMIN',
      });

      await userHelper.createUser({
        name: 'Regular User',
        email: 'regularuser@test.com',
        tempPassword: 'temp123',
      });

      // Filter by Admin role
      await page.click('[data-testid="role-filter"]');
      await page.click('[data-testid="filter-admin"]');

      // Should only show admin users
      await expect(page.locator('text=adminuser@test.com')).toBeVisible();
      await expect(page.locator('text=regularuser@test.com')).not.toBeVisible();
    });

    test('should search users by name or email', async ({ page }) => {
      await userHelper.createUser({
        name: 'John Doe',
        email: 'john@test.com',
        tempPassword: 'temp123',
      });

      await userHelper.createUser({
        name: 'Jane Smith',
        email: 'jane@test.com',
        tempPassword: 'temp123',
      });

      // Search by name
      await page.fill('[data-testid="user-search-input"]', 'John');
      
      // Should only show matching user
      await expect(page.locator('text=John Doe')).toBeVisible();
      await expect(page.locator('text=Jane Smith')).not.toBeVisible();

      // Search by email
      await page.fill('[data-testid="user-search-input"]', 'jane@test');
      
      await expect(page.locator('text=Jane Smith')).toBeVisible();
      await expect(page.locator('text=John Doe')).not.toBeVisible();
    });

    test('should show user creation date and last login', async ({ page }) => {
      await userHelper.createUser({
        name: 'Date Test User',
        email: 'datetest@test.com',
        tempPassword: 'temp123',
      });

      const userRow = page.locator(`[data-testid="user-row"]:has-text("datetest@test.com")`);
      
      // Should show creation date
      await expect(userRow.locator('[data-testid="creation-date"]')).toBeVisible();
      
      // Should show "Never" for last login since user hasn't logged in
      await expect(userRow.locator('text=Never')).toBeVisible();
    });
  });

  test.describe('Regular User Access Control', () => {
    test('should deny access to user management for regular users', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.user1);

      await page.goto('/admin/users');

      // Should be redirected or show access denied
      expect(page.url()).not.toMatch(/\/admin\/users/);
      
      // Or should show access denied message
      await expect(page.locator('text=Access denied')).toBeVisible();
    });

    test('should not show admin navigation for regular users', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.user1);

      await page.click('[data-testid="user-menu"]');
      
      // Admin panel link should not be visible
      await expect(page.locator('[data-testid="admin-panel-link"]')).not.toBeVisible();
    });
  });

  test.describe('User Profile Management', () => {
    test('should allow users to edit their own profile', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.user1);

      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="profile-settings"]');

      // Edit profile
      await page.fill('[data-testid="profile-name-input"]', 'Updated User Name');
      await page.fill('[data-testid="profile-email-input"]', 'updated.user1@test.com');
      await page.click('[data-testid="save-profile-button"]');

      // Verify changes saved
      await expect(page.locator('text=Profile updated successfully')).toBeVisible();
      
      // Verify changes reflected in UI
      await page.click('[data-testid="user-menu"]');
      await expect(page.locator('text=Updated User Name')).toBeVisible();
    });

    test('should show validation errors for invalid profile data', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.user1);

      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="profile-settings"]');

      // Clear required fields
      await page.fill('[data-testid="profile-name-input"]', '');
      await page.fill('[data-testid="profile-email-input"]', 'invalid-email');
      await page.click('[data-testid="save-profile-button"]');

      // Should show validation errors
      await expect(page.locator('text=Name is required')).toBeVisible();
      await expect(page.locator('text=Invalid email format')).toBeVisible();
    });

    test('should prevent email duplication in profile update', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.user1);

      await page.click('[data-testid="user-menu"]');
      await page.click('[data-testid="profile-settings"]');

      // Try to use admin's email
      await page.fill('[data-testid="profile-email-input"]', TEST_USERS.admin.email);
      await page.click('[data-testid="save-profile-button"]');

      await expect(page.locator('text=Email already exists')).toBeVisible();
    });
  });

  test.describe('Temporary Password Flow', () => {
    test('should force password change on first login with temporary password', async ({ page }) => {
      // Create user with temporary password as admin
      await authHelper.signIn(TEST_USERS.admin);
      await userHelper.createUser({
        name: 'Temp Password User',
        email: 'temppass@test.com',
        tempPassword: 'temp123',
      });

      await authHelper.signOut();

      // Try to sign in with temporary password
      await page.goto('/sign-in');
      await page.fill('[data-testid="email-input"]', 'temppass@test.com');
      await page.fill('[data-testid="password-input"]', 'temp123');
      await page.click('[data-testid="signin-button"]');

      // Should be redirected to change password page
      expect(page.url()).toMatch(/\/change-password/);
      await expect(page.locator('text=You must change your temporary password')).toBeVisible();
    });

    test('should successfully change temporary password', async ({ page }) => {
      // Setup user with temporary password
      await authHelper.signIn(TEST_USERS.admin);
      await userHelper.createUser({
        name: 'Change Temp User',
        email: 'changetemp@test.com',
        tempPassword: 'temp123',
      });

      await authHelper.signOut();

      // Sign in and change password
      await page.goto('/sign-in');
      await page.fill('[data-testid="email-input"]', 'changetemp@test.com');
      await page.fill('[data-testid="password-input"]', 'temp123');
      await page.click('[data-testid="signin-button"]');

      // Change password
      await page.fill('[data-testid="new-password-input"]', 'newpassword123');
      await page.fill('[data-testid="confirm-password-input"]', 'newpassword123');
      await page.click('[data-testid="change-password-submit"]');

      // Should be redirected to dashboard
      expect(page.url()).toMatch(/\/(dashboard|workspaces)/);

      // Sign out and try new password
      await authHelper.signOut();

      await page.goto('/sign-in');
      await page.fill('[data-testid="email-input"]', 'changetemp@test.com');
      await page.fill('[data-testid="password-input"]', 'newpassword123');
      await page.click('[data-testid="signin-button"]');

      // Should successfully sign in without forced password change
      expect(page.url()).toMatch(/\/(dashboard|workspaces)/);
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
    });

    test('should show validation errors for invalid new password', async ({ page }) => {
      // Setup and navigate to change password
      await authHelper.signIn(TEST_USERS.admin);
      await userHelper.createUser({
        name: 'Invalid Pass User',
        email: 'invalidpass@test.com',
        tempPassword: 'temp123',
      });

      await authHelper.signOut();

      await page.goto('/sign-in');
      await page.fill('[data-testid="email-input"]', 'invalidpass@test.com');
      await page.fill('[data-testid="password-input"]', 'temp123');
      await page.click('[data-testid="signin-button"]');

      // Try weak password
      await page.fill('[data-testid="new-password-input"]', '123');
      await page.fill('[data-testid="confirm-password-input"]', '123');
      await page.click('[data-testid="change-password-submit"]');

      await expect(page.locator('text=Password must be at least 8 characters')).toBeVisible();
    });

    test('should show error when new passwords do not match', async ({ page }) => {
      // Setup and navigate to change password
      await authHelper.signIn(TEST_USERS.admin);
      await userHelper.createUser({
        name: 'Mismatch Pass User',
        email: 'mismatch@test.com',
        tempPassword: 'temp123',
      });

      await authHelper.signOut();

      await page.goto('/sign-in');
      await page.fill('[data-testid="email-input"]', 'mismatch@test.com');
      await page.fill('[data-testid="password-input"]', 'temp123');
      await page.click('[data-testid="signin-button"]');

      // Enter mismatched passwords
      await page.fill('[data-testid="new-password-input"]', 'newpassword123');
      await page.fill('[data-testid="confirm-password-input"]', 'differentpassword');
      await page.click('[data-testid="change-password-submit"]');

      await expect(page.locator('text=Passwords do not match')).toBeVisible();
    });
  });

  test.describe('User Activity and Audit', () => {
    test('should track user login activity', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      await page.goto('/admin/users');

      // Find admin user row and check for last login
      const adminRow = page.locator(`[data-testid="user-row"]:has-text("${TEST_USERS.admin.email}")`);
      
      // Should show recent login time
      await expect(adminRow.locator('[data-testid="last-login"]')).not.toHaveText('Never');
    });

    test('should show user workspace memberships', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      
      // Create workspace and add user
      const workspaceId = await workspaceHelper.createWorkspace('User Workspace');
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      await workspaceHelper.joinWorkspace(inviteCode);
      
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.admin);
      
      await page.goto('/admin/users');

      // View user details
      const userRow = page.locator(`[data-testid="user-row"]:has-text("${TEST_USERS.user1.email}")`);
      await userRow.locator('[data-testid="view-user-details"]').click();

      // Should show workspace memberships
      await expect(page.locator('text=User Workspace')).toBeVisible();
    });
  });
});