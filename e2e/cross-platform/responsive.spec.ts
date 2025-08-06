import { test, expect, devices } from '@playwright/test';
import { AuthHelper, WorkspaceHelper, TaskHelper, TEST_USERS, resetDatabase, seedTestData } from '../utils/test-helpers';

// Test responsive design and cross-platform compatibility
test.describe('Cross-Platform Compatibility', () => {
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

  // Test on different viewport sizes
  const viewports = [
    { name: 'Mobile', width: 375, height: 667 },
    { name: 'Tablet', width: 768, height: 1024 },
    { name: 'Desktop', width: 1920, height: 1080 },
  ];

  viewports.forEach(({ name, width, height }) => {
    test.describe(`${name} (${width}x${height})`, () => {
      test.beforeEach(async ({ page }) => {
        await page.setViewportSize({ width, height });
      });

      test('should render signin page responsively', async ({ page }) => {
        await page.goto('/sign-in');

        // Check that essential elements are visible
        await expect(page.locator('[data-testid="email-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="password-input"]')).toBeVisible();
        await expect(page.locator('[data-testid="signin-button"]')).toBeVisible();
        await expect(page.locator('[data-testid="signin-form"]')).toBeVisible();

        // Check that the form is interactive
        await page.locator('[data-testid="email-input"]').click();
        await expect(page.locator('[data-testid="email-input"]')).toBeFocused();
      });

      test('should handle navigation responsively', async ({ page }) => {
        await authHelper.signIn(TEST_USERS.admin);

        if (width < 768) {
          // Mobile: should have hamburger menu
          await expect(page.locator('[data-testid="mobile-menu-button"]')).toBeVisible();
          
          // Click to open mobile menu
          await page.click('[data-testid="mobile-menu-button"]');
          await expect(page.locator('[data-testid="mobile-nav-menu"]')).toBeVisible();
        } else {
          // Desktop/Tablet: should have regular navigation
          await expect(page.locator('[data-testid="desktop-nav"]')).toBeVisible();
          await expect(page.locator('[data-testid="mobile-menu-button"]')).not.toBeVisible();
        }
      });

      test('should display kanban board responsively', async ({ page }) => {
        await authHelper.signIn(TEST_USERS.admin);
        const workspaceId = await workspaceHelper.createWorkspace('Responsive Test');

        await page.goto(`/workspaces/${workspaceId}`);

        if (width < 768) {
          // Mobile: kanban columns should be scrollable horizontally
          const kanbanBoard = page.locator('[data-testid="kanban-board"]');
          await expect(kanbanBoard).toHaveCSS('overflow-x', 'auto');
          
          // Columns should have minimum width
          const columns = page.locator('[data-testid^="kanban-column-"]');
          const firstColumn = columns.first();
          await expect(firstColumn).toHaveCSS('min-width', /250px|15.625rem/);
        } else {
          // Desktop/Tablet: columns should be in a grid
          const kanbanBoard = page.locator('[data-testid="kanban-board"]');
          await expect(kanbanBoard).toHaveCSS('display', 'grid');
        }
      });

      test('should handle forms responsively', async ({ page }) => {
        await authHelper.signIn(TEST_USERS.admin);
        const workspaceId = await workspaceHelper.createWorkspace('Form Test');

        await page.goto(`/workspaces/${workspaceId}`);
        await page.click('[data-testid="create-task-button"]');

        // Form should be responsive
        const form = page.locator('[data-testid="task-form"]');
        
        if (width < 768) {
          // Mobile: form should take full width
          await expect(form).toHaveCSS('width', /100%|full/);
        } else {
          // Desktop: form should have reasonable max width
          await expect(form).toHaveCSS('max-width', /600px|37.5rem/);
        }

        // Form inputs should be appropriately sized
        const titleInput = page.locator('[data-testid="task-title-input"]');
        await expect(titleInput).toBeVisible();
        
        if (width < 480) {
          // Very small screens: inputs should be full width
          await expect(titleInput).toHaveCSS('width', /100%|full/);
        }
      });
    });
  });

  // Test specific mobile interactions
  test.describe('Mobile Interactions', () => {

    test('should support touch interactions on kanban', async ({ page }) => {
      // Set mobile viewport for this test
      await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 size
      
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Touch Test');

      // Create service and task
      await page.goto(`/workspaces/${workspaceId}/services`);
      await page.click('[data-testid="create-service-button"]');
      await page.fill('[data-testid="service-name-input"]', 'Touch Service');
      await page.click('[data-testid="submit-service-button"]');

      await page.goto(`/workspaces/${workspaceId}`);
      await taskHelper.createTask({
        title: 'Touch Task',
        serviceId: 'touch-service-id',
      });

      // Test touch drag (mobile-specific)
      const taskCard = page.locator('[data-testid="task-card"]:has-text("Touch Task")');
      
      // On mobile, there should be touch indicators or drag handles
      await expect(taskCard.locator('[data-testid="drag-handle"]')).toBeVisible();
    });

    test('should handle mobile task details modal', async ({ page }) => {
      // Set mobile viewport for this test
      await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 size
      
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Modal Test');

      await page.goto(`/workspaces/${workspaceId}/services`);
      await page.click('[data-testid="create-service-button"]');
      await page.fill('[data-testid="service-name-input"]', 'Modal Service');
      await page.click('[data-testid="submit-service-button"]');

      await page.goto(`/workspaces/${workspaceId}`);
      await taskHelper.createTask({
        title: 'Modal Task',
        serviceId: 'modal-service-id',
      });

      // Open task details
      await page.click('[data-testid="task-card"]:has-text("Modal Task")');

      // On mobile, task details should be full screen or slide up
      const taskModal = page.locator('[data-testid="task-details-modal"]');
      await expect(taskModal).toBeBounded(); // Should take up most of the screen
      
      // Should have mobile-specific close button
      await expect(page.locator('[data-testid="mobile-close-button"]')).toBeVisible();
    });

    test('should handle mobile menu navigation', async ({ page }) => {
      // Set mobile viewport for this test
      await page.setViewportSize({ width: 390, height: 844 }); // iPhone 12 size
      
      await authHelper.signIn(TEST_USERS.admin);

      // Open mobile menu
      await page.click('[data-testid="mobile-menu-button"]');
      
      // Menu should slide in or overlay
      const mobileMenu = page.locator('[data-testid="mobile-nav-menu"]');
      await expect(mobileMenu).toBeVisible();
      
      // Should be able to navigate to different sections
      await page.click('[data-testid="mobile-nav-workspaces"]');
      expect(page.url()).toMatch(/\/workspaces/);
      
      // Menu should close after navigation
      await expect(mobileMenu).not.toBeVisible();
    });
  });

  // Test tablet-specific behavior
  test.describe('Tablet Layout', () => {

    test('should optimize for tablet layout', async ({ page }) => {
      // Set tablet viewport for this test
      await page.setViewportSize({ width: 1024, height: 1366 }); // iPad Pro size
      
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Tablet Test');

      await page.goto(`/workspaces/${workspaceId}`);

      // Tablet should show a hybrid layout
      // Not as compact as mobile, not as expanded as desktop
      const kanbanBoard = page.locator('[data-testid="kanban-board"]');
      
      // Should have reasonable column widths for tablet
      const columns = page.locator('[data-testid^="kanban-column-"]');
      const firstColumn = columns.first();
      
      // Column should be wider than mobile but not as wide as desktop
      const columnWidth = await firstColumn.evaluate(el => el.getBoundingClientRect().width);
      expect(columnWidth).toBeGreaterThan(250); // Wider than mobile minimum
      expect(columnWidth).toBeLessThan(400); // But not too wide
    });

    test('should handle tablet form layouts', async ({ page }) => {
      // Set tablet viewport for this test  
      await page.setViewportSize({ width: 1024, height: 1366 }); // iPad Pro size
      
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Tablet Form Test');

      await page.goto(`/workspaces/${workspaceId}`);
      await page.click('[data-testid="create-task-button"]');

      // Form should be optimized for tablet
      const form = page.locator('[data-testid="task-form"]');
      
      // Should not be full width like mobile, but not as constrained as desktop
      const formWidth = await form.evaluate(el => el.getBoundingClientRect().width);
      const viewportWidth = await page.evaluate(() => window.innerWidth);
      
      // Form should be between 60-80% of viewport width on tablet
      const widthRatio = formWidth / viewportWidth;
      expect(widthRatio).toBeGreaterThan(0.6);
      expect(widthRatio).toBeLessThan(0.8);
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

  // Performance tests for different devices
  test.describe('Performance', () => {
    test('should load quickly on mobile devices', async ({ page }) => {
      // Simulate slow network
      await page.route('**/*', route => {
        setTimeout(() => route.continue(), 100); // Add 100ms delay
      });

      const startTime = Date.now();
      await page.goto('/sign-in');
      
      // Page should load within reasonable time even with network delay
      await expect(page.locator('[data-testid="signin-form"]')).toBeVisible();
      const loadTime = Date.now() - startTime;
      
      expect(loadTime).toBeLessThan(5000); // Should load within 5 seconds
    });

    test('should handle large datasets efficiently', async ({ page }) => {
      await authHelper.signIn(TEST_USERS.admin);
      const workspaceId = await workspaceHelper.createWorkspace('Performance Test');

      // Create service first
      await page.goto(`/workspaces/${workspaceId}/services`);
      await page.click('[data-testid="create-service-button"]');
      await page.fill('[data-testid="service-name-input"]', 'Perf Service');
      await page.click('[data-testid="submit-service-button"]');

      await page.goto(`/workspaces/${workspaceId}`);

      // Create multiple tasks to test performance
      const taskCount = 20;
      for (let i = 0; i < taskCount; i++) {
        await taskHelper.createTask({
          title: `Performance Task ${i + 1}`,
          serviceId: 'perf-service-id',
        });
        
        // Don't wait too long between tasks
        if (i % 5 === 0) {
          await page.waitForTimeout(100);
        }
      }

      // Kanban board should still be responsive
      const kanbanBoard = page.locator('[data-testid="kanban-board"]');
      await expect(kanbanBoard).toBeVisible();
      
      // All tasks should be visible
      const taskCards = page.locator('[data-testid="task-card"]');
      await expect(taskCards).toHaveCount(taskCount);
    });
  });
});