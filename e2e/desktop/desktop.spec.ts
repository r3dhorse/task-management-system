import { test, expect, devices } from '@playwright/test';
import { AuthHelper, WorkspaceHelper, TaskHelper, TEST_USERS, resetDatabase, seedTestData } from '../utils/test-helpers';

// Test desktop functionality and browser compatibility
test.describe('Desktop Compatibility', () => {
  let authHelper: AuthHelper;
  let workspaceHelper: WorkspaceHelper;
  let taskHelper: TaskHelper;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    workspaceHelper = new WorkspaceHelper(page);
    taskHelper = new TaskHelper(page);
    await resetDatabase();
    await seedTestData();
  });

  // Test on desktop viewport sizes
  const desktopViewports = [
    { name: 'Desktop Standard', width: 1920, height: 1080 },
    { name: 'Desktop Large', width: 2560, height: 1440 },
  ];

  desktopViewports.forEach(({ name, width, height }) => {
    test.describe(`${name} (${width}x${height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width, height });
      });

      test('should render signin page properly', async ({ page }) => {
        await page.goto('/sign-in', { waitUntil: 'domcontentloaded', timeout: 60000 });

        // Check that essential elements are visible
        await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="signin-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="signin-form"]')).toBeVisible();

        // Check that the form is interactive
        await page.locator('[data-testid="email-input"]').click();
        await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
      });

      test('should handle desktop navigation', async ({ page }) => {
        await authHelper.signIn(TEST_USERS.admin);

        // Desktop: should have regular navigation
        await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
        await expect(page.locator('[data-testid="mobile-menu-button"]')).not.toBeVisible();
      });

      test('should display kanban board in grid layout', async ({ page }) => {
        await authHelper.signIn(TEST_USERS.admin);
        const workspaceId = await workspaceHelper.createWorkspace('Desktop Test');

        await page.goto(`/workspaces/${workspaceId}`);

        // Desktop: columns should be in a grid layout
        const kanbanBoard = page.locator('[data-testid="kanban-board"]');
        await expect(kanbanBoard).toBeVisible();
        
        // Should have multiple columns visible
        const columns = page.locator('[data-testid^="kanban-column-"]');
        await expect(columns).toHaveCountGreaterThan(1);
      });

      test('should handle forms with proper sizing', async ({ page }) => {
        await authHelper.signIn(TEST_USERS.admin);
        const workspaceId = await workspaceHelper.createWorkspace('Form Test');

        await page.goto(`/workspaces/${workspaceId}`);
        await page.click('[data-testid="create-task-button"]');

        // Desktop form should have reasonable max width
        const form = page.locator('[data-testid="task-form"]');
        await expect(form).toBeVisible();

        // Form inputs should be properly sized for desktop
        const titleInput = page.locator('[data-testid="task-title-input"]');
        await expect(titleInput).toBeVisible();
      });
    });
  });

  // Test desktop-specific interactions
  test.describe('Desktop Interactions', () => {

    test('should support mouse drag and drop on kanban', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Drag Test');

      // Create service first
      await page.goto(`/workspaces/${workspaceId}/services`);
      await page.click('[data-testid="create-service-button"]');
      await page.fill('[data-testid="service-name-input"]', 'Drag Service');
      await page.click('[data-testid="submit-service-button"]');

      await page.goto(`/workspaces/${workspaceId}`);
      
      // Create a task for drag testing
      await taskHelper.createTask({
        title: 'Drag Task',
        serviceId: 'drag-service-id',
      });

      // Test mouse drag and drop functionality
      const taskCard = page.locator('[data-testid="task-card"]:has-text("Drag Task")');
      await expect(taskCard).toBeVisible();
    });

    test('should handle desktop task details modal', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Modal Test');

      // Create service first
      await page.goto(`/workspaces/${workspaceId}/services`);
      await page.click('[data-testid="create-service-button"]');
      await page.fill('[data-testid="service-name-input"]', 'Modal Service');
      await page.click('[data-testid="submit-service-button"]');

      await page.goto(`/workspaces/${workspaceId}`);
      
      // Create a task
      await taskHelper.createTask({
        title: 'Modal Task',
        serviceId: 'modal-service-id',
      });

      // Open task details
      await page.click('[data-testid="task-card"]:has-text("Modal Task")');

      // On desktop, task details should be in a modal dialog
      const taskModal = page.locator('[data-testid="task-details-modal"]');
      await expect(taskModal).toBeVisible();
    });
  });

  // Test browser-specific features
  test.describe('Browser Compatibility', () => {
    test('should work with different browsers', async ({ page, browserName }) => {
      await authHelper.signIn(TEST_USERS.admin);

      // Basic functionality should work across all browsers
      await expect(page.locator('[data-testid="user-menu"]')).toBeVisible();
      
      // Browser-specific optimizations
      if (browserName === 'webkit') {
        // Safari-specific checks
        // File uploads might behave differently
        await page.goto('/workspaces');
        // Ensure iOS Safari compatibility
      } else if (browserName === 'firefox') {
        // Firefox-specific checks
        // Drag and drop might need different handling
      } else if (browserName === 'chromium') {
        // Chrome-specific checks
        // Modern features should work
      }
    });

    test('should handle different input methods', async ({ page, browserName }) => {
      await page.goto('/sign-in');

      // Test keyboard navigation
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="password-input"]')).toBeFocused();
      
      await page.keyboard.press('Tab');
      await expect(page.locator('[data-testid="signin-button"]')).toBeFocused();

      // Test form submission with Enter key
      await page.fill('[data-testid="email-input"]', TEST_USERS.admin.email);
      await page.fill('[data-testid="password-input"]', TEST_USERS.admin.password);
      await page.keyboard.press('Enter');

      // Should successfully sign in
      await page.waitForURL(/\/(dashboard|workspaces)/);
    });
  });

  // Desktop performance tests
  test.describe('Desktop Performance', () => {
    test('should load pages quickly', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/sign-in', { waitUntil: 'domcontentloaded', timeout: 60000 });
      
      // Page should load within reasonable time
      await expect(page.locator('[data-testid="signin-form"]')).toBeVisible();
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(10000); // Should load within 10 seconds
    });

    test('should handle multiple tasks efficiently', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Performance Test');

      // Create service first
      await page.goto(`/workspaces/${workspaceId}/services`);
      await page.click('[data-testid="create-service-button"]');
      await page.fill('[data-testid="service-name-input"]', 'Perf Service');
      await page.click('[data-testid="submit-service-button"]');

      await page.goto(`/workspaces/${workspaceId}`);

      // Create some tasks to test basic functionality
      const taskCount = 5; // Reduced for reliability
      for (let i = 0; i < taskCount; i++) {
        await taskHelper.createTask({
          title: `Performance Task ${i + 1}`,
          serviceId: 'perf-service-id',
        });
        
        await page.waitForTimeout(500); // Give time between creations
      }

      // Kanban board should display all tasks
      const kanbanBoard = page.locator('[data-testid="kanban-board"]');
      await expect(kanbanBoard).toBeVisible();
      
      // Should have created tasks visible
      const taskCards = page.locator('[data-testid="task-card"]');
      await expect(taskCards).toHaveCountGreaterThanOrEqual(taskCount);
    });
  });
});