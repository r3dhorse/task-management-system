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
    await this.page.goto('/sign-in');
    
    // Wait for form elements to be loaded
    await this.page.waitForSelector('[data-testid="email-input"]');
    await this.page.waitForSelector('[data-testid="password-input"]');
    await this.page.waitForSelector('[data-testid="signin-button"]');
    
    await this.page.fill('[data-testid="email-input"]', user.email);
    await this.page.fill('[data-testid="password-input"]', user.password);
    
    // Wait for the form submission and any potential redirect
    const [response] = await Promise.all([
      this.page.waitForResponse(response => 
        response.url().includes('/api/auth/callback/credentials') && 
        response.request().method() === 'POST'
      ),
      this.page.click('[data-testid="signin-button"]')
    ]);
    
    console.log('Login response status:', response.status());
    
    // Check if login was successful
    if (response.status() !== 200) {
      throw new Error(`Login failed with status: ${response.status()}`);
    }
    
    // Wait for redirect and verify sign-in success with longer timeout
    try {
      await this.page.waitForURL(/\/(dashboard|workspaces|transactions|no-workspace)/, { timeout: 60000 });
    } catch (error) {
      console.log('Current URL after login attempt:', this.page.url());
      
      // Check for error messages on the page
      const errorMessages = await this.page.locator('text=/invalid|error|incorrect/i').allTextContents();
      if (errorMessages.length > 0) {
        console.log('Error messages found:', errorMessages);
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
          this.page.waitForSelector(`text=${user.name}`, { timeout: 10000 }),
          this.page.waitForSelector('text=Sign Out', { timeout: 10000 })
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
      await expect(this.page.locator('[data-testid="user-menu"]')).toBeVisible();
    }
  }

  async signOut() {
    const currentUrl = this.page.url();
    
    if (currentUrl.includes('/no-workspace')) {
      // On no-workspace page, click the direct logout button
      await this.page.click('text=Sign Out');
    } else {
      // On other pages, use the user menu dropdown
      await this.page.click('[data-testid="user-menu"]');
      await this.page.click('[data-testid="signout-button"]');
    }
    
    await this.page.waitForURL('/sign-in');
  }

}

export class WorkspaceHelper {
  constructor(private page: Page) {}

  async createWorkspace(name: string, description = '') {
    await this.page.goto('/workspaces');
    await this.page.click('[data-testid="create-workspace-button"]');
    
    await this.page.fill('[data-testid="workspace-name-input"]', name);
    if (description) {
      await this.page.fill('[data-testid="workspace-description-input"]', description);
    }
    
    await this.page.click('[data-testid="submit-workspace-button"]');
    
    // Wait for workspace to be created and redirected
    await this.page.waitForURL(/\/workspaces\/\w+/);
    
    // Get the workspace ID from URL
    const url = this.page.url();
    const workspaceId = url.split('/workspaces/')[1];
    return workspaceId;
  }

  async joinWorkspace(inviteCode: string) {
    await this.page.goto('/workspaces');
    await this.page.click('[data-testid="join-workspace-button"]');
    await this.page.fill('[data-testid="invite-code-input"]', inviteCode);
    await this.page.click('[data-testid="join-workspace-submit"]');
    
    // Wait for successful join
    await this.page.waitForURL(/\/workspaces\/\w+/);
  }

  async getInviteCode(workspaceId: string): Promise<string> {
    await this.page.goto(`/workspaces/${workspaceId}/settings`);
    await this.page.click('[data-testid="invite-members-button"]');
    
    const inviteCodeElement = this.page.locator('[data-testid="invite-code"]');
    await expect(inviteCodeElement).toBeVisible();
    
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
    await this.page.click('[data-testid="create-task-button"]');
    
    // Fill task form
    await this.page.fill('[data-testid="task-title-input"]', data.title);
    
    if (data.description) {
      await this.page.fill('[data-testid="task-description-input"]', data.description);
    }
    
    // Select service
    await this.page.click('[data-testid="task-service-select"]');
    await this.page.click(`[data-testid="service-option-${data.serviceId}"]`);
    
    if (data.assigneeId) {
      await this.page.click('[data-testid="task-assignee-select"]');
      await this.page.click(`[data-testid="assignee-option-${data.assigneeId}"]`);
    }
    
    if (data.dueDate) {
      await this.page.fill('[data-testid="task-due-date-input"]', data.dueDate);
    }
    
    if (data.priority) {
      await this.page.click('[data-testid="task-priority-select"]');
      await this.page.click(`[data-testid="priority-option-${data.priority}"]`);
    }
    
    await this.page.click('[data-testid="submit-task-button"]');
    
    // Wait for task to be created
    await expect(this.page.locator(`text=${data.title}`)).toBeVisible();
  }

  async moveTaskToColumn(taskTitle: string, targetStatus: string) {
    const taskCard = this.page.locator(`[data-testid="task-card"]:has-text("${taskTitle}")`);
    const targetColumn = this.page.locator(`[data-testid="kanban-column-${targetStatus}"]`);
    
    await taskCard.dragTo(targetColumn);
    
    // Verify task moved to new column
    await expect(targetColumn.locator(`text=${taskTitle}`)).toBeVisible();
  }

  async editTask(taskTitle: string, updates: Partial<{
    title: string;
    description: string;
    dueDate: string;
    priority: string;
  }>) {
    await this.page.click(`[data-testid="task-card"]:has-text("${taskTitle}")`);
    await this.page.click('[data-testid="edit-task-button"]');
    
    if (updates.title) {
      await this.page.fill('[data-testid="task-title-input"]', updates.title);
    }
    
    if (updates.description) {
      await this.page.fill('[data-testid="task-description-input"]', updates.description);
    }
    
    if (updates.dueDate) {
      await this.page.fill('[data-testid="task-due-date-input"]', updates.dueDate);
    }
    
    if (updates.priority) {
      await this.page.click('[data-testid="task-priority-select"]');
      await this.page.click(`[data-testid="priority-option-${updates.priority}"]`);
    }
    
    await this.page.click('[data-testid="save-task-button"]');
    
    // Wait for changes to be saved
    if (updates.title) {
      await expect(this.page.locator(`text=${updates.title}`)).toBeVisible();
    }
  }

  async deleteTask(taskTitle: string) {
    await this.page.click(`[data-testid="task-card"]:has-text("${taskTitle}")`);
    await this.page.click('[data-testid="delete-task-button"]');
    await this.page.click('[data-testid="confirm-delete-button"]');
    
    // Verify task is deleted
    await expect(this.page.locator(`text=${taskTitle}`)).not.toBeVisible();
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
    await this.page.goto('/admin/users');
    await this.page.click('[data-testid="create-user-button"]');
    
    await this.page.fill('[data-testid="user-name-input"]', userData.name);
    await this.page.fill('[data-testid="user-email-input"]', userData.email);
    await this.page.fill('[data-testid="temp-password-input"]', userData.tempPassword);
    
    if (userData.role) {
      await this.page.click('[data-testid="user-role-select"]');
      await this.page.click(`[data-testid="role-option-${userData.role}"]`);
    }
    
    await this.page.click('[data-testid="create-user-submit"]');
    
    // Verify user was created
    await expect(this.page.locator(`text=${userData.email}`)).toBeVisible();
  }

  async deleteUser(userEmail: string) {
    await this.page.goto('/admin/users');
    
    const userRow = this.page.locator(`[data-testid="user-row"]:has-text("${userEmail}")`);
    await userRow.locator('[data-testid="delete-user-button"]').click();
    await this.page.click('[data-testid="confirm-delete-button"]');
    
    // Verify user was deleted
    await expect(this.page.locator(`text=${userEmail}`)).not.toBeVisible();
  }

  async setTempPassword(userEmail: string, newPassword: string) {
    await this.page.goto('/admin/users');
    
    const userRow = this.page.locator(`[data-testid="user-row"]:has-text("${userEmail}")`);
    await userRow.locator('[data-testid="set-temp-password-button"]').click();
    
    await this.page.fill('[data-testid="new-temp-password-input"]', newPassword);
    await this.page.click('[data-testid="set-password-submit"]');
    
    // Verify success message
    await expect(this.page.locator('text=Password updated successfully')).toBeVisible();
  }
}

export class FileHelper {
  constructor(private page: Page) {}

  async uploadFile(filePath: string, taskTitle?: string) {
    if (taskTitle) {
      // Upload to specific task
      await this.page.click(`[data-testid="task-card"]:has-text("${taskTitle}")`);
      await this.page.click('[data-testid="add-attachment-button"]');
    } else {
      // Upload to general file area
      await this.page.click('[data-testid="upload-file-button"]');
    }
    
    const fileInput = this.page.locator('[data-testid="file-input"]');
    await fileInput.setInputFiles(filePath);
    
    await this.page.click('[data-testid="upload-submit-button"]');
    
    // Wait for upload to complete
    await expect(this.page.locator('text=File uploaded successfully')).toBeVisible();
  }

  async downloadFile(fileName: string) {
    const downloadPromise = this.page.waitForEvent('download');
    await this.page.click(`[data-testid="download-file"]:has-text("${fileName}")`);
    const download = await downloadPromise;
    
    return download;
  }

  async deleteFile(fileName: string) {
    await this.page.click(`[data-testid="file-item"]:has-text("${fileName}") [data-testid="delete-file-button"]`);
    await this.page.click('[data-testid="confirm-delete-button"]');
    
    // Verify file was deleted
    await expect(this.page.locator(`text=${fileName}`)).not.toBeVisible();
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