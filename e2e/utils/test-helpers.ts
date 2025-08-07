import { Page, expect } from '@playwright/test';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  isSuperAdmin?: boolean;
}

export const TEST_USERS = {
  admin: {
    email: 'admin@test.com',
    password: 'admin123',
    name: 'Admin User',
    isSuperAdmin: true,
  },
  user1: {
    email: 'user1@test.com',
    password: 'user123',
    name: 'Test User 1',
  },
  user2: {
    email: 'user2@test.com',
    password: 'user123',
    name: 'Test User 2',
  },
} as const;

export class AuthHelper {
  constructor(private page: Page) {}

  async signIn(user: TestUser) {
    // Navigate with retry logic
    try {
      await this.page.goto('/sign-in', { waitUntil: 'networkidle', timeout: 60000 });
    } catch (error) {
      console.log('First navigation attempt failed, retrying...');
      await this.page.goto('/sign-in', { waitUntil: 'domcontentloaded', timeout: 60000 });
    }
    
    // Wait for form elements to be loaded with increased timeout
    await this.page.waitForSelector('[data-testid="email-input"]', { timeout: 30000 });
    await this.page.waitForSelector('[data-testid="password-input"]', { timeout: 30000 });
    await this.page.waitForSelector('[data-testid="signin-button"]', { timeout: 30000 });
    
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);
    
    // Click the sign-in button and wait for navigation
    await this.page.click('[data-testid="signin-button"]');
    
    // Wait for either successful redirect or error state
    try {
      await this.page.waitForFunction(() => {
        const url = window.location.href;
        // Either we've navigated away from sign-in, or we're back on sign-in with an error state
        return !url.includes('/sign-in') || 
               url.includes('?email=') || // Form submission fallback 
               document.querySelector('[data-testid="error-message"]') !== null ||
               document.querySelector('.error') !== null;
      }, { timeout: 30000 });
      
      const currentUrl = this.page.url();
      console.log('URL after login attempt:', currentUrl);
      
      if (currentUrl.includes('/sign-in')) {
        // Still on sign-in page, check for errors
        await this.page.waitForTimeout(1000); // Wait a bit for error messages to render
        
        const errorMessages = await this.page.locator('text=/invalid|error|incorrect|failed/i').allTextContents();
        if (errorMessages.length > 0) {
          console.log('Error messages found:', errorMessages);
          throw new Error('Authentication failed with invalid credentials');
        }
        
        // Check for NextAuth.js specific error patterns
        const hasAuthError = await this.page.locator('[id*="error"], .error-message, [data-testid*="error"]').count();
        if (hasAuthError > 0) {
          console.log('Auth error elements found');
          throw new Error('Authentication failed');
        }
        
        // If we have URL parameters but no error, it might be a different issue
        if (currentUrl.includes('?email=')) {
          console.log('Form submitted but stayed on sign-in page - possible auth failure');
          throw new Error('Authentication failed - form submission did not redirect');
        }
        
        throw new Error('Authentication failed - stayed on sign-in page');
      } else {
        // Successfully redirected
        console.log('Authentication successful - redirected to:', currentUrl);
      }
      
    } catch (error) {
      console.log('Auth flow error:', error);
      console.log('Current URL after login attempt:', this.page.url());
      
      // Additional debugging
      const pageContent = await this.page.content();
      if (pageContent.includes('error') || pageContent.includes('invalid')) {
        console.log('Page contains error content');
      }
      
      throw error;
    }
    
    // Verify user is signed in by checking for appropriate elements based on the page
    const currentUrl = this.page.url();
    console.log('Navigated to:', currentUrl);
    
    if (currentUrl.includes('/no-workspace')) {
      // On no-workspace page, wait for and verify user elements are loaded
      try {
        // Wait for either the user name or logout button to appear
        await Promise.race([
          this.page.waitForSelector(`text=${user.name}`, { timeout: 15000 }),
          this.page.waitForSelector('text=Sign Out', { timeout: 15000 })
        ]);
        
        const userNameVisible = await this.page.locator(`text=${user.name}`).isVisible();
        const logoutButtonVisible = await this.page.locator('text=Sign Out').isVisible();
        
        console.log(`User name visible: ${userNameVisible}, Logout button visible: ${logoutButtonVisible}`);
        
        if (!userNameVisible && !logoutButtonVisible) {
          throw new Error('User authentication verification failed on no-workspace page');
        }
      } catch (error) {
        console.log('Failed to find expected elements on no-workspace page:', error);
        throw error;
      }
    } else {
      // On other pages, check for user menu
      await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible({ timeout: 15000 });
    }
  }

  async signOut() {
    const currentUrl = this.page.url();
    
    if (currentUrl.includes('/no-workspace')) {
      // On no-workspace page, click the direct logout button
      await this.page.click('text=Sign Out', { timeout: 15000 });
    } else {
      // On other pages, use the user menu dropdown
      await this.page.click('[data-testid="user-menu"]', { timeout: 15000 });
      await this.page.click('[data-testid="signout-button"]', { timeout: 15000 });
    }
    
    await this.page.waitForURL('/sign-in', { timeout: 30000 });
  }

}

export class WorkspaceHelper {
  constructor(private page: Page) {}

  async createWorkspace(name: string, description = '') {
    await this.page.goto('/workspaces', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.click('[data-testid="create-workspace-button"]', { timeout: 15000 });
    
    await this.page.fill('[data-testid="workspace-name-input"]', name);
    if (description) {
      await this.page.fill('[data-testid="workspace-description-input"]', description);
    }
    
    await this.page.click('[data-testid="submit-workspace-button"]', { timeout: 15000 });
    
    // Wait for workspace to be created and redirected
    await this.page.waitForURL(/\/workspaces\/\w+/, { timeout: 30000 });
    
    // Get the workspace ID from URL
    const url = this.page.url();
    const workspaceId = url.split('/workspaces/')[1];
    return workspaceId;
  }

  async joinWorkspace(inviteCode: string) {
    await this.page.goto('/workspaces', { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.click('[data-testid="join-workspace-button"]', { timeout: 15000 });
    await this.page.fill('[data-testid="invite-code-input"]', inviteCode);
    await this.page.click('[data-testid="join-workspace-submit"]', { timeout: 15000 });
    
    // Wait for successful join
    await this.page.waitForURL(/\/workspaces\/\w+/, { timeout: 30000 });
  }

  async getInviteCode(workspaceId: string): Promise<string> {
    await this.page.goto(`/workspaces/${workspaceId}/settings`, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await this.page.click('[data-testid="invite-members-button"]', { timeout: 15000 });
    
    const inviteCodeElement = this.page.locator('[data-testid="invite-code"]');
    await expect(inviteCodeElement).toBeVisible({ timeout: 15000 });
    
    return await inviteCodeElement.textContent() || '';
  }
}

export class TaskHelper {
  constructor(private page: Page) {}

  async createTask(data: {
    title: string;
    description?: string;
    serviceId: string;
    assigneeId?: string;
    dueDate?: string;
    priority?: 'LOW' | 'MEDIUM' | 'HIGH';
    status?: 'TODO' | 'IN_PROGRESS' | 'REVIEW' | 'DONE';
  }) {
    // Wait for create task button to be available
    await this.page.waitForSelector('[data-testid="create-task-button"]', { timeout: 15000 });
    await this.page.click('[data-testid="create-task-button"]', { timeout: 15000 });
    
    // Wait for form elements to be available
    await this.page.waitForSelector('[data-testid="task-title-input"]', { timeout: 15000 });
    await this.page.fill('[data-testid="task-title-input"]', data.title);
    
    if (data.description) {
      await this.page.fill('[data-testid="task-description-input"]', data.description);
    }
    
    // Select service
    await this.page.waitForSelector('[data-testid="task-service-select"]', { timeout: 15000 });
    await this.page.click('[data-testid="task-service-select"]', { timeout: 15000 });
    await this.page.waitForSelector(`[data-testid="service-option-${data.serviceId}"]`, { timeout: 15000 });
    await this.page.click(`[data-testid="service-option-${data.serviceId}"]`, { timeout: 15000 });
    
    if (data.assigneeId) {
      await this.page.click('[data-testid="task-assignee-select"]', { timeout: 15000 });
      await this.page.click(`[data-testid="assignee-option-${data.assigneeId}"]`, { timeout: 15000 });
    }
    
    if (data.dueDate) {
      await this.page.fill('[data-testid="task-due-date-input"]', data.dueDate);
    }
    
    if (data.priority) {
      await this.page.click('[data-testid="task-priority-select"]', { timeout: 15000 });
      await this.page.click(`[data-testid="priority-option-${data.priority}"]`, { timeout: 15000 });
    }
    
    await this.page.click('[data-testid="submit-task-button"]', { timeout: 15000 });
    
    // Wait for task to be created
    await expect(this.page.locator(`text=${data.title}`)).toBeVisible({ timeout: 15000 });
  }

  async moveTaskToColumn(taskTitle: string, targetStatus: string) {
    const taskCard = this.page.locator(`[data-testid="task-card"]:has-text("${taskTitle}")`);
    const targetColumn = this.page.locator(`[data-testid="kanban-column-${targetStatus}"]`);
    
    await expect(taskCard).toBeVisible({ timeout: 15000 });
    await expect(targetColumn).toBeVisible({ timeout: 15000 });
    
    await taskCard.dragTo(targetColumn);
    
    // Verify task moved to new column
    await expect(targetColumn.locator(`text=${taskTitle}`)).toBeVisible({ timeout: 15000 });
  }

  async editTask(taskTitle: string, updates: Partial<{
    title: string;
    description: string;
    dueDate: string;
    priority: string;
  }>) {
    await this.page.click(`[data-testid="task-card"]:has-text("${taskTitle}")`, { timeout: 15000 });
    await this.page.waitForSelector('[data-testid="edit-task-button"]', { timeout: 15000 });
    await this.page.click('[data-testid="edit-task-button"]', { timeout: 15000 });
    
    if (updates.title) {
      await this.page.waitForSelector('[data-testid="task-title-input"]', { timeout: 15000 });
      await this.page.fill('[data-testid="task-title-input"]', updates.title);
    }
    
    if (updates.description) {
      await this.page.fill('[data-testid="task-description-input"]', updates.description);
    }
    
    if (updates.dueDate) {
      await this.page.fill('[data-testid="task-due-date-input"]', updates.dueDate);
    }
    
    if (updates.priority) {
      await this.page.click('[data-testid="task-priority-select"]', { timeout: 15000 });
      await this.page.click(`[data-testid="priority-option-${updates.priority}"]`, { timeout: 15000 });
    }
    
    await this.page.click('[data-testid="save-task-button"]', { timeout: 15000 });
    
    // Wait for changes to be saved
    if (updates.title) {
      await expect(this.page.locator(`text=${updates.title}`)).toBeVisible({ timeout: 15000 });
    }
  }

  async deleteTask(taskTitle: string) {
    await this.page.click(`[data-testid="task-card"]:has-text("${taskTitle}")`, { timeout: 15000 });
    await this.page.waitForSelector('[data-testid="delete-task-button"]', { timeout: 15000 });
    await this.page.click('[data-testid="delete-task-button"]', { timeout: 15000 });
    await this.page.waitForSelector('[data-testid="confirm-delete-button"]', { timeout: 15000 });
    await this.page.click('[data-testid="confirm-delete-button"]', { timeout: 15000 });
    
    // Verify task is deleted
    await expect(this.page.locator(`text=${taskTitle}`)).not.toBeVisible({ timeout: 15000 });
  }
}

export class UserHelper {
  constructor(private page: Page) {}

  async createUser(userData: {
    name: string;
    email: string;
    tempPassword: string;
    role?: 'ADMIN' | 'SUPERADMIN';
  }) {
    await this.page.goto('/admin/users', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Check if we're actually on the user management page or got redirected
    const currentUrl = this.page.url();
    console.log('UserHelper: Current URL after navigation:', currentUrl);
    
    if (!currentUrl.includes('/admin/users')) {
      throw new Error(`Expected to be on /admin/users but got redirected to: ${currentUrl}`);
    }
    
    // Wait for the create user button to be available
    await this.page.waitForSelector('button:has-text("Create User")', { timeout: 30000 });
    
    console.log('UserHelper: Create User button found, attempting to click...');
    await this.page.click('button:has-text("Create User")', { timeout: 15000 });
    
    console.log('UserHelper: Button clicked, waiting for dialog...');
    
    // Try waiting for dialog with multiple approaches
    try {
      await Promise.race([
        this.page.waitForSelector('text="Create New User"', { timeout: 15000 }),
        this.page.waitForSelector('[role="dialog"]', { timeout: 15000 }),
        this.page.waitForSelector('.dialog', { timeout: 15000 }),
      ]);
      console.log('UserHelper: Dialog detected');
    } catch (error) {
      console.log('UserHelper: Dialog not found, taking screenshot for debugging...');
      await this.page.screenshot({ path: 'user-helper-dialog-not-found.png' });
      
      // Get console errors
      const logs = [];
      this.page.on('console', msg => logs.push(msg.text()));
      
      console.log('UserHelper: Console logs:', logs);
      throw new Error('Create User dialog did not open after clicking button');
    }
    
    // Wait for form elements to be available (using actual IDs from the UI)
    await this.page.waitForSelector('#createName', { timeout: 15000 });
    await this.page.waitForSelector('#createEmail', { timeout: 15000 });
    await this.page.waitForSelector('#createPassword', { timeout: 15000 });
    
    // Fill in the form
    await this.page.fill('#createName', userData.name);
    await this.page.fill('#createEmail', userData.email);
    
    // Generate a temporary password first (the password field is readonly)
    await this.page.click('button:has-text("Generate")', { timeout: 15000 });
    
    // Set role switches if specified
    if (userData.role === 'ADMIN') {
      await this.page.click('#createIsAdmin', { timeout: 15000 });
    }
    if (userData.role === 'SUPERADMIN') {
      await this.page.click('#createIsSuperAdmin', { timeout: 15000 });
    }
    
    // Click create user button
    await this.page.click('button:has-text("Create User")', { timeout: 15000 });
    
    // Verify user was created
    await expect(this.page.locator(`text=${userData.email}`)).toBeVisible({ timeout: 15000 });
  }

  async deleteUser(userEmail: string) {
    await this.page.goto('/admin/users', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for user table to load
    await this.page.waitForSelector('table', { timeout: 15000 });
    
    // Find the user row by email and click the delete button (trash icon)
    const userRow = this.page.locator(`tr:has-text("${userEmail}")`);
    await expect(userRow).toBeVisible({ timeout: 15000 });
    
    // Click the trash icon button in that row
    await userRow.locator('button').filter({ hasText: /.*/ }).nth(2).click({ timeout: 15000 });
    
    // Wait for and click the delete confirmation button
    await this.page.waitForSelector('button:has-text("Delete User")', { timeout: 15000 });
    await this.page.click('button:has-text("Delete User")', { timeout: 15000 });
    
    // Verify user was deleted
    await expect(this.page.locator(`text=${userEmail}`)).not.toBeVisible({ timeout: 15000 });
  }

  async setTempPassword(userEmail: string, newPassword: string) {
    await this.page.goto('/admin/users', { waitUntil: 'domcontentloaded', timeout: 60000 });
    
    // Wait for user table to load
    await this.page.waitForSelector('table', { timeout: 15000 });
    
    // Find the user row by email and click the key icon button (temp password)
    const userRow = this.page.locator(`tr:has-text("${userEmail}")`);
    await expect(userRow).toBeVisible({ timeout: 15000 });
    
    // Click the key icon button (second button) in that row
    await userRow.locator('button').filter({ hasText: /.*/ }).nth(1).click({ timeout: 15000 });
    
    // Wait for the temp password dialog and generate a password
    await this.page.waitForSelector('#tempPassword', { timeout: 15000 });
    await this.page.click('button:has-text("Generate")', { timeout: 15000 });
    
    // Click set password button
    await this.page.click('button:has-text("Set Password")', { timeout: 15000 });
    
    // Verify success message
    await expect(this.page.locator('text=Temporary password has been set!')).toBeVisible({ timeout: 15000 });
  }
}

export class FileHelper {
  constructor(private page: Page) {}

  async uploadFile(filePath: string, taskTitle?: string) {
    if (taskTitle) {
      // Upload to specific task
      await this.page.click(`[data-testid="task-card"]:has-text("${taskTitle}")`, { timeout: 15000 });
      await this.page.waitForSelector('[data-testid="add-attachment-button"]', { timeout: 15000 });
      await this.page.click('[data-testid="add-attachment-button"]', { timeout: 15000 });
    } else {
      // Upload to general file area
      await this.page.waitForSelector('[data-testid="upload-file-button"]', { timeout: 15000 });
      await this.page.click('[data-testid="upload-file-button"]', { timeout: 15000 });
    }
    
    const fileInput = this.page.locator('[data-testid="file-input"]');
    await expect(fileInput).toBeVisible({ timeout: 15000 });
    await fileInput.setInputFiles(filePath);
    
    await this.page.waitForSelector('[data-testid="upload-submit-button"]', { timeout: 15000 });
    await this.page.click('[data-testid="upload-submit-button"]', { timeout: 15000 });
    
    // Wait for upload to complete
    await expect(this.page.locator('text=File uploaded successfully')).toBeVisible({ timeout: 15000 });
  }

  async downloadFile(fileName: string) {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click(`[data-testid="download-file"]:has-text("${fileName}")`, { timeout: 15000 });
    const download = await downloadPromise;
    
    return download;
  }

  async deleteFile(fileName: string) {
    await this.page.click(`[data-testid="file-item"]:has-text("${fileName}") [data-testid="delete-file-button"]`, { timeout: 15000 });
    await this.page.waitForSelector('[data-testid="confirm-delete-button"]', { timeout: 15000 });
    await this.page.click('[data-testid="confirm-delete-button"]', { timeout: 15000 });
    
    // Verify file was deleted
    await expect(this.page.locator(`text=${fileName}`)).not.toBeVisible({ timeout: 15000 });
  }
}

export async function resetDatabase() {
  // Reset database tables for testing
  const { PrismaClient } = await import('@prisma/client');
  const prisma = new PrismaClient();
  
  try {
    // Delete in correct order due to foreign keys
    await prisma.taskAttachment.deleteMany();
    await prisma.taskMessage.deleteMany();
    await prisma.taskHistory.deleteMany();
    await prisma.task.deleteMany();
    await prisma.service.deleteMany();
    await prisma.member.deleteMany();
    await prisma.workspace.deleteMany();
    await prisma.account.deleteMany();
    await prisma.session.deleteMany();
    await prisma.verificationToken.deleteMany();
    await prisma.user.deleteMany();
    
    console.log('✅ Database reset complete');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

export async function seedTestData() {
  // Seed database with test users and data
  const { PrismaClient } = await import('@prisma/client');
  const bcrypt = await import('bcryptjs');
  const prisma = new PrismaClient();
  
  try {
    // Create test users with hashed passwords using upsert to handle duplicates
    const adminUser = await prisma.user.upsert({
      where: { email: TEST_USERS.admin.email },
      update: {
        name: TEST_USERS.admin.name,
        password: await bcrypt.hash(TEST_USERS.admin.password, 10),
        isSuperAdmin: TEST_USERS.admin.isSuperAdmin || false,
        isAdmin: true,
      },
      create: {
        email: TEST_USERS.admin.email,
        name: TEST_USERS.admin.name,
        password: await bcrypt.hash(TEST_USERS.admin.password, 10),
        isSuperAdmin: TEST_USERS.admin.isSuperAdmin || false,
        isAdmin: true,
      }
    });
    
    const user1 = await prisma.user.upsert({
      where: { email: TEST_USERS.user1.email },
      update: {
        name: TEST_USERS.user1.name,
        password: await bcrypt.hash(TEST_USERS.user1.password, 10),
        isSuperAdmin: false,
        isAdmin: false,
      },
      create: {
        email: TEST_USERS.user1.email,
        name: TEST_USERS.user1.name,
        password: await bcrypt.hash(TEST_USERS.user1.password, 10),
        isSuperAdmin: false,
        isAdmin: false,
      }
    });
    
    const user2 = await prisma.user.upsert({
      where: { email: TEST_USERS.user2.email },
      update: {
        name: TEST_USERS.user2.name,
        password: await bcrypt.hash(TEST_USERS.user2.password, 10),
        isSuperAdmin: false,
        isAdmin: false,
      },
      create: {
        email: TEST_USERS.user2.email,
        name: TEST_USERS.user2.name,
        password: await bcrypt.hash(TEST_USERS.user2.password, 10),
        isSuperAdmin: false,
        isAdmin: false,
      }
    });
    
    console.log('✅ Test data seeded successfully');
    console.log(`  - Admin: ${adminUser.email}`);
    console.log(`  - User1: ${user1.email}`);
    console.log(`  - User2: ${user2.email}`);
  } catch (error) {
    console.error('❌ Test data seeding failed:', error);
    throw error; // Re-throw to fail the test if seeding fails
  } finally {
    await prisma.$disconnect();
  }
}