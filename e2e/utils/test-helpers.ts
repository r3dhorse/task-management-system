import { Page, expect } from '@playwright/test';

export const TEST_USERS = {
  admin: {
    email: 'admin@example.com',
    password: 'admin123',
    name: 'Admin User'
  },
  superadmin: {
    email: 'superadmin@example.com',
    password: 'super123',
    name: 'Super Admin'
  },
  member: {
    email: 'member@example.com',
    password: 'member123',
    name: 'Member User'
  }
};

export async function login(page: Page, email: string, password: string) {
  await page.goto('/sign-in');
  await page.fill('input[type="email"]', email);
  await page.fill('input[type="password"]', password);
  await page.click('button[type="submit"]');
  
  // Wait for either dashboard redirect or workspace selection
  try {
    await page.waitForURL('**/dashboard/**', { timeout: 5000 });
  } catch {
    // If direct dashboard redirect fails, check for workspace selection
    try {
      await page.waitForURL('**/workspaces', { timeout: 5000 });
      // Select first workspace if on workspace selection page
      const workspaceButton = page.locator('button:has-text("Test Workspace"), button[data-testid="workspace-item"]').first();
      if (await workspaceButton.isVisible()) {
        await workspaceButton.click();
        await page.waitForURL('**/dashboard/**', { timeout: 5000 });
      }
    } catch {
      // Check if we're already logged in and redirected somewhere else
      await expect(page).not.toHaveURL('**/sign-in');
    }
  }
}

export async function logout(page: Page) {
  await page.click('button:has-text("Logout")');
  await page.waitForURL('**/sign-in', { timeout: 5000 });
}

export async function createWorkspace(page: Page, name: string) {
  await page.click('button:has-text("Create Workspace")');
  await page.fill('input[name="name"]', name);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1000);
}

export async function createTask(page: Page, taskData: {
  name: string;
  description?: string;
  assigneeId?: string;
  status?: string;
  dueDate?: string;
}) {
  await page.click('button:has-text("New Task")');
  await page.fill('input[name="name"]', taskData.name);
  
  if (taskData.description) {
    await page.fill('textarea[name="description"]', taskData.description);
  }
  
  if (taskData.status) {
    await page.click('button[role="combobox"]:has-text("Select Status")');
    await page.click(`div[role="option"]:has-text("${taskData.status}")`);
  }
  
  if (taskData.dueDate) {
    await page.fill('input[type="date"]', taskData.dueDate);
  }
  
  await page.click('button[type="submit"]:has-text("Create")');
  await page.waitForTimeout(1000);
}

export async function waitForToast(page: Page, message: string) {
  const toast = page.locator(`div[role="status"]:has-text("${message}")`);
  await expect(toast).toBeVisible({ timeout: 5000 });
}

export function generateTestEmail(): string {
  const timestamp = Date.now();
  return `test${timestamp}@example.com`;
}

export function generateTestWorkspace(): string {
  const timestamp = Date.now();
  return `Test Workspace ${timestamp}`;
}