import { test, expect } from '@playwright/test';
import { AuthHelper, WorkspaceHelper, TEST_USERS, resetDatabase, seedTestData } from '../utils/test-helpers';

test.describe('Workspace Management', () => {
  let authHelper: AuthHelper;
  let workspaceHelper: WorkspaceHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    workspaceHelper = new WorkspaceHelper(page);
    await resetDatabase();
    await seedTestData();
  });

  test.describe('Workspace Creation', () => {
    test('should create a new workspace successfully', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      
      const workspaceId = await workspaceHelper.createWorkspace('Test Workspace', 'A test workspace description');
      
      // Should be redirected to the new workspace
      expect(page.url()).toContain(`/workspaces/${workspaceId}`);
      
      // Should show workspace name and description
      await expect(page.locator('h1:has-text("Test Workspace")')).toBeVisible();
      await expect(page.locator('text=A test workspace description')).toBeVisible();
    });

    test('should create workspace with minimal data', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      
      const workspaceId = await workspaceHelper.createWorkspace('Minimal Workspace');
      
      expect(page.url()).toContain(`/workspaces/${workspaceId}`);
      await expect(page.locator('h1:has-text("Minimal Workspace")')).toBeVisible();
    });

    test('should show validation error for empty workspace name', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      
      await page.goto('/workspaces');
      await page.click('[data-testid="create-workspace-button"]');
      await page.click('[data-testid="submit-workspace-button"]');
      
      await expect(page.locator('text=Workspace name is required')).toBeVisible();
    });

    test('should prevent non-admin users from creating workspaces', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.user1);
      
      await page.goto('/workspaces');
      
      // Create workspace button should not be visible or should be disabled
      await expect(page.locator('[data-testid="create-workspace-button"]')).not.toBeVisible();
    });

    test('should generate unique invite codes for new workspaces', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      
      const workspace1Id = await workspaceHelper.createWorkspace('Workspace 1');
      const inviteCode1 = await workspaceHelper.getInviteCode(workspace1Id);
      
      const workspace2Id = await workspaceHelper.createWorkspace('Workspace 2');
      const inviteCode2 = await workspaceHelper.getInviteCode(workspace2Id);
      
      expect(inviteCode1).not.toBe(inviteCode2);
      expect(inviteCode1).toHaveLength(8); // Assuming 8-character invite codes
      expect(inviteCode2).toHaveLength(8);
    });
  });

  test.describe('Workspace Navigation', () => {
    test('should list all user workspaces', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      
      // Create multiple workspaces
      await workspaceHelper.createWorkspace('Workspace A');
      await workspaceHelper.createWorkspace('Workspace B');
      await workspaceHelper.createWorkspace('Workspace C');
      
      await page.goto('/workspaces');
      
      // Should show all created workspaces
      await expect(page.locator('text=Workspace A')).toBeVisible();
      await expect(page.locator('text=Workspace B')).toBeVisible();
      await expect(page.locator('text=Workspace C')).toBeVisible();
    });

    test('should navigate between workspaces', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      
      const workspace1Id = await workspaceHelper.createWorkspace('First Workspace');
      const workspace2Id = await workspaceHelper.createWorkspace('Second Workspace');
      
      // Navigate to first workspace
      await page.goto(`/workspaces/${workspace1Id}`);
      await expect(page.locator('h1:has-text("First Workspace")')).toBeVisible();
      
      // Navigate to second workspace
      await page.goto(`/workspaces/${workspace2Id}`);
      await expect(page.locator('h1:has-text("Second Workspace")')).toBeVisible();
    });

    test('should show empty state when user has no workspaces', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.user1);
      
      await page.goto('/workspaces');
      
      await expect(page.locator('text=No workspaces found')).toBeVisible();
      await expect(page.locator('[data-testid="join-workspace-button"]')).toBeVisible();
    });

    test('should prevent access to workspace user is not a member of', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Private Workspace');
      
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      
      await page.goto(`/workspaces/${workspaceId}`);
      
      // Should be redirected or show access denied
      expect(page.url()).not.toContain(`/workspaces/${workspaceId}`);
    });
  });

  test.describe('Workspace Joining', () => {
    test('should join workspace with valid invite code', async ({ page }) => {
      // Admin creates workspace and gets invite code
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Team Workspace');
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      
      // User joins workspace
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      
      await workspaceHelper.joinWorkspace(inviteCode);
      
      // Should be redirected to the joined workspace
      expect(page.url()).toContain(`/workspaces/${workspaceId}`);
      await expect(page.locator('h1:has-text("Team Workspace")')).toBeVisible();
    });

    test('should show error with invalid invite code', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.user1);
      
      await page.goto('/workspaces');
      await page.click('[data-testid="join-workspace-button"]');
      await page.fill('[data-testid="invite-code-input"]', 'INVALID1');
      await page.click('[data-testid="join-workspace-submit"]');
      
      await expect(page.locator('text=Invalid invite code')).toBeVisible();
    });

    test('should show error when trying to join workspace already a member of', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('My Workspace');
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      
      // Try to join own workspace
      await workspaceHelper.joinWorkspace(inviteCode);
      
      await expect(page.locator('text=You are already a member of this workspace')).toBeVisible();
    });

    test('should show validation error for empty invite code', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.user1);
      
      await page.goto('/workspaces');
      await page.click('[data-testid="join-workspace-button"]');
      await page.click('[data-testid="join-workspace-submit"]');
      
      await expect(page.locator('text=Invite code is required')).toBeVisible();
    });
  });

  test.describe('Workspace Settings', () => {
    test('should update workspace details', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Original Name', 'Original description');
      
      await page.goto(`/workspaces/${workspaceId}/settings`);
      
      // Update workspace details
      await page.fill('[data-testid="workspace-name-input"]', 'Updated Name');
      await page.fill('[data-testid="workspace-description-input"]', 'Updated description');
      await page.click('[data-testid="save-workspace-button"]');
      
      // Should show success message
      await expect(page.locator('text=Workspace updated successfully')).toBeVisible();
      
      // Navigate back to workspace and verify changes
      await page.goto(`/workspaces/${workspaceId}`);
      await expect(page.locator('h1:has-text("Updated Name")')).toBeVisible();
      await expect(page.locator('text=Updated description')).toBeVisible();
    });

    test('should regenerate invite code', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Test Workspace');
      const originalInviteCode = await workspaceHelper.getInviteCode(workspaceId);
      
      await page.goto(`/workspaces/${workspaceId}/settings`);
      await page.click('[data-testid="regenerate-invite-code-button"]');
      await page.click('[data-testid="confirm-regenerate-button"]');
      
      // Should show success message
      await expect(page.locator('text=Invite code regenerated successfully')).toBeVisible();
      
      // New invite code should be different
      const newInviteCode = await page.locator('[data-testid="invite-code"]').textContent();
      expect(newInviteCode).not.toBe(originalInviteCode);
    });

    test('should prevent non-admin members from accessing settings', async ({ page }) => {
      // Admin creates workspace
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Team Workspace');
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      
      // User joins as member
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      await workspaceHelper.joinWorkspace(inviteCode);
      
      // Try to access settings
      await page.goto(`/workspaces/${workspaceId}/settings`);
      
      // Should be redirected or show access denied
      expect(page.url()).not.toContain('/settings');
    });
  });

  test.describe('Workspace Members', () => {
    test('should display workspace members', async ({ page }) => {
      // Create workspace and add member
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Team Workspace');
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      await workspaceHelper.joinWorkspace(inviteCode);
      
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.admin);
      
      await page.goto(`/workspaces/${workspaceId}/members`);
      
      // Should show both admin and member
      await expect(page.locator(`text=${TEST_USERS.admin.email}`)).toBeVisible();
      await expect(page.locator(`text=${TEST_USERS.user1.email}`)).toBeVisible();
    });

    test('should change member roles', async ({ page }) => {
      // Setup workspace with member
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Team Workspace');
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      await workspaceHelper.joinWorkspace(inviteCode);
      
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.admin);
      
      await page.goto(`/workspaces/${workspaceId}/members`);
      
      // Change user1 role to admin
      const memberRow = page.locator(`[data-testid="member-row"]:has-text("${TEST_USERS.user1.email}")`);
      await memberRow.locator('[data-testid="role-select"]').click();
      await page.click('[data-testid="role-option-ADMIN"]');
      
      // Should show success message
      await expect(page.locator('text=Member role updated successfully')).toBeVisible();
      
      // Verify role change
      await expect(memberRow.locator('text=Admin')).toBeVisible();
    });

    test('should remove members from workspace', async ({ page }) => {
      // Setup workspace with member
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Team Workspace');
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      await workspaceHelper.joinWorkspace(inviteCode);
      
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.admin);
      
      await page.goto(`/workspaces/${workspaceId}/members`);
      
      // Remove user1 from workspace
      const memberRow = page.locator(`[data-testid="member-row"]:has-text("${TEST_USERS.user1.email}")`);
      await memberRow.locator('[data-testid="remove-member-button"]').click();
      await page.click('[data-testid="confirm-remove-button"]');
      
      // Should show success message
      await expect(page.locator('text=Member removed successfully')).toBeVisible();
      
      // Member should no longer be visible
      await expect(page.locator(`text=${TEST_USERS.user1.email}`)).not.toBeVisible();
    });

    test('should prevent members from managing other members', async ({ page }) => {
      // Create workspace with member
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Team Workspace');
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      await workspaceHelper.joinWorkspace(inviteCode);
      
      await page.goto(`/workspaces/${workspaceId}/members`);
      
      // Member should not see admin controls
      await expect(page.locator('[data-testid="role-select"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="remove-member-button"]')).not.toBeVisible();
    });
  });

  test.describe('Workspace Deletion', () => {
    test('should delete workspace successfully', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Workspace to Delete');
      
      await page.goto(`/workspaces/${workspaceId}/settings`);
      
      // Delete workspace
      await page.click('[data-testid="delete-workspace-button"]');
      await page.fill('[data-testid="confirm-workspace-name"]', 'Workspace to Delete');
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Should be redirected to workspaces list
      expect(page.url()).toMatch(/\/workspaces$/);
      
      // Should show success message
      await expect(page.locator('text=Workspace deleted successfully')).toBeVisible();
      
      // Workspace should not appear in list
      await expect(page.locator('text=Workspace to Delete')).not.toBeVisible();
    });

    test('should prevent deletion with incorrect workspace name', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Workspace to Delete');
      
      await page.goto(`/workspaces/${workspaceId}/settings`);
      
      await page.click('[data-testid="delete-workspace-button"]');
      await page.fill('[data-testid="confirm-workspace-name"]', 'Wrong Name');
      await page.click('[data-testid="confirm-delete-button"]');
      
      // Should show error
      await expect(page.locator('text=Workspace name does not match')).toBeVisible();
      
      // Should still be on settings page
      expect(page.url()).toContain('/settings');
    });

    test('should prevent non-admin from deleting workspace', async ({ page }) => {
      // Create workspace and add member
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Team Workspace');
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      await workspaceHelper.joinWorkspace(inviteCode);
      
      await page.goto(`/workspaces/${workspaceId}/settings`);
      
      // Delete button should not be visible
      await expect(page.locator('[data-testid="delete-workspace-button"]')).not.toBeVisible();
    });
  });
});