import { test, expect } from '@playwright/test';
import { AuthHelper, WorkspaceHelper, TaskHelper, TEST_USERS, resetDatabase, seedTestData } from '../utils/test-helpers';

test.describe('Task Management', () => {
  let authHelper: AuthHelper;
  let workspaceHelper: WorkspaceHelper;
  let taskHelper: TaskHelper;
  let workspaceId: string;
  let serviceId: string;

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    workspaceHelper = new WorkspaceHelper(page);
    taskHelper = new TaskHelper(page);
    await resetDatabase();
    await seedTestData();

    // Setup workspace and service for tests
    await authHelper.signIn(TEST_USERS.admin);
    workspaceId = await workspaceHelper.createWorkspace('Task Test Workspace');
    
    // Create a service (assuming service creation is available)
    await page.goto(`/workspaces/${workspaceId}/services`);
    await page.click('[data-testid="create-service-button"]');
    await page.fill('[data-testid="service-name-input"]', 'Test Service');
    await page.click('[data-testid="submit-service-button"]');
    
    // Get service ID from URL or response
    serviceId = 'test-service-id'; // This would be extracted from actual implementation
  });

  test.describe('Task Creation', () => {
    test('should create task with all fields', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'Complete Testing',
        description: 'Write comprehensive E2E tests for the application',
        serviceId,
        dueDate: '2024-12-31',
        priority: 'HIGH',
      });
      
      // Verify task appears in kanban board
      await expect(page.locator('[data-testid="task-card"]:has-text("Complete Testing")')).toBeVisible();
      
      // Verify task details
      await page.click('[data-testid="task-card"]:has-text("Complete Testing")');
      await expect(page.locator('text=Write comprehensive E2E tests for the application')).toBeVisible();
      await expect(page.locator('text=High Priority')).toBeVisible();
      await expect(page.locator('text=Dec 31, 2024')).toBeVisible();
    });

    test('should create task with minimal data', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'Simple Task',
        serviceId,
      });
      
      await expect(page.locator('[data-testid="task-card"]:has-text("Simple Task")')).toBeVisible();
    });

    test('should show validation error for empty title', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await page.click('[data-testid="create-task-button"]');
      await page.click('[data-testid="submit-task-button"]');
      
      await expect(page.locator('text=Task title is required')).toBeVisible();
    });

    test('should show validation error when no service selected', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await page.click('[data-testid="create-task-button"]');
      await page.fill('[data-testid="task-title-input"]', 'Test Task');
      await page.click('[data-testid="submit-task-button"]');
      
      await expect(page.locator('text=Service is required')).toBeVisible();
    });

    test('should create task with assignee', async ({ page }) => {
      // Add another user to workspace first
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      await workspaceHelper.joinWorkspace(inviteCode);
      
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.admin);
      
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'Assigned Task',
        serviceId,
        assigneeId: 'user1-id', // This would be the actual user ID
      });
      
      // Verify task shows assignee
      await page.click('[data-testid="task-card"]:has-text("Assigned Task")');
      await expect(page.locator(`text=${TEST_USERS.user1.name}`)).toBeVisible();
    });

    test('should create confidential task', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await page.click('[data-testid="create-task-button"]');
      await page.fill('[data-testid="task-title-input"]', 'Confidential Task');
      await page.click('[data-testid="task-service-select"]');
      await page.click(`[data-testid="service-option-${serviceId}"]`);
      await page.check('[data-testid="task-confidential-checkbox"]');
      await page.click('[data-testid="submit-task-button"]');
      
      // Verify confidential indicator
      await expect(page.locator('[data-testid="task-card"]:has-text("Confidential Task") [data-testid="confidential-indicator"]')).toBeVisible();
    });
  });

  test.describe('Task Display and Kanban', () => {
    test('should display tasks in correct kanban columns', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      // Create tasks with different statuses
      await taskHelper.createTask({ title: 'Todo Task', serviceId, status: 'TODO' });
      await taskHelper.createTask({ title: 'In Progress Task', serviceId, status: 'IN_PROGRESS' });
      await taskHelper.createTask({ title: 'Review Task', serviceId, status: 'REVIEW' });
      await taskHelper.createTask({ title: 'Done Task', serviceId, status: 'DONE' });
      
      // Verify tasks appear in correct columns
      await expect(page.locator('[data-testid="kanban-column-TODO"] [data-testid="task-card"]:has-text("Todo Task")')).toBeVisible();
      await expect(page.locator('[data-testid="kanban-column-IN_PROGRESS"] [data-testid="task-card"]:has-text("In Progress Task")')).toBeVisible();
      await expect(page.locator('[data-testid="kanban-column-REVIEW"] [data-testid="task-card"]:has-text("Review Task")')).toBeVisible();
      await expect(page.locator('[data-testid="kanban-column-DONE"] [data-testid="task-card"]:has-text("Done Task")')).toBeVisible();
    });

    test('should move task between columns via drag and drop', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'Movable Task', serviceId, status: 'TODO' });
      
      // Move task from TODO to IN_PROGRESS
      await taskHelper.moveTaskToColumn('Movable Task', 'IN_PROGRESS');
      
      // Verify task moved
      await expect(page.locator('[data-testid="kanban-column-IN_PROGRESS"] [data-testid="task-card"]:has-text("Movable Task")')).toBeVisible();
      await expect(page.locator('[data-testid="kanban-column-TODO"] [data-testid="task-card"]:has-text("Movable Task")')).not.toBeVisible();
    });

    test('should show task count in column headers', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      // Create multiple tasks in TODO column
      await taskHelper.createTask({ title: 'Task 1', serviceId, status: 'TODO' });
      await taskHelper.createTask({ title: 'Task 2', serviceId, status: 'TODO' });
      await taskHelper.createTask({ title: 'Task 3', serviceId, status: 'TODO' });
      
      // Verify column shows count
      await expect(page.locator('[data-testid="kanban-column-TODO"] [data-testid="column-count"]:has-text("3")')).toBeVisible();
    });

    test('should filter tasks by service', async ({ page }) => {
      // Create another service
      await page.goto(`/workspaces/${workspaceId}/services`);
      await page.click('[data-testid="create-service-button"]');
      await page.fill('[data-testid="service-name-input"]', 'Service 2');
      await page.click('[data-testid="submit-service-button"]');
      const service2Id = 'service-2-id';
      
      await page.goto(`/workspaces/${workspaceId}`);
      
      // Create tasks in different services
      await taskHelper.createTask({ title: 'Service 1 Task', serviceId });
      await taskHelper.createTask({ title: 'Service 2 Task', serviceId: service2Id });
      
      // Filter by Service 1
      await page.click('[data-testid="service-filter"]');
      await page.click(`[data-testid="filter-service-${serviceId}"]`);
      
      // Should only show Service 1 tasks
      await expect(page.locator('[data-testid="task-card"]:has-text("Service 1 Task")')).toBeVisible();
      await expect(page.locator('[data-testid="task-card"]:has-text("Service 2 Task")')).not.toBeVisible();
    });

    test('should filter tasks by assignee', async ({ page }) => {
      // Add user to workspace
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      await workspaceHelper.joinWorkspace(inviteCode);
      
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.admin);
      
      await page.goto(`/workspaces/${workspaceId}`);
      
      // Create tasks with different assignees
      await taskHelper.createTask({ title: 'My Task', serviceId });
      await taskHelper.createTask({ title: 'User1 Task', serviceId, assigneeId: 'user1-id' });
      
      // Filter by current user
      await page.click('[data-testid="assignee-filter"]');
      await page.click('[data-testid="filter-my-tasks"]');
      
      // Should only show current user's tasks
      await expect(page.locator('[data-testid="task-card"]:has-text("My Task")')).toBeVisible();
      await expect(page.locator('[data-testid="task-card"]:has-text("User1 Task")')).not.toBeVisible();
    });
  });

  test.describe('Task Editing', () => {
    test('should edit task details', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'Original Title',
        description: 'Original description',
        serviceId,
        priority: 'LOW',
      });
      
      await taskHelper.editTask('Original Title', {
        title: 'Updated Title',
        description: 'Updated description',
        priority: 'HIGH',
      });
      
      // Verify changes
      await expect(page.locator('[data-testid="task-card"]:has-text("Updated Title")')).toBeVisible();
      await expect(page.locator('[data-testid="task-card"]:has-text("Original Title")')).not.toBeVisible();
      
      // Check task details
      await page.click('[data-testid="task-card"]:has-text("Updated Title")');
      await expect(page.locator('text=Updated description')).toBeVisible();
      await expect(page.locator('text=High Priority')).toBeVisible();
    });

    test('should reassign task to different user', async ({ page }) => {
      // Add user to workspace
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      await workspaceHelper.joinWorkspace(inviteCode);
      
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.admin);
      
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'Reassign Task', serviceId });
      
      // Edit task to assign to user1
      await page.click('[data-testid="task-card"]:has-text("Reassign Task")');
      await page.click('[data-testid="edit-task-button"]');
      await page.click('[data-testid="task-assignee-select"]');
      await page.click(`[data-testid="assignee-option-user1-id"]`);
      await page.click('[data-testid="save-task-button"]');
      
      // Verify assignee changed
      await page.click('[data-testid="task-card"]:has-text("Reassign Task")');
      await expect(page.locator(`text=${TEST_USERS.user1.name}`)).toBeVisible();
    });

    test('should update task due date', async ({ page }) => {
      await page.goto(`/workspaceId/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'Date Task', serviceId });
      
      await taskHelper.editTask('Date Task', {
        dueDate: '2024-12-25',
      });
      
      // Verify due date
      await page.click('[data-testid="task-card"]:has-text("Date Task")');
      await expect(page.locator('text=Dec 25, 2024')).toBeVisible();
    });

    test('should prevent editing tasks in different workspace', async ({ page }) => {
      // Create second workspace
      const workspace2Id = await workspaceHelper.createWorkspace('Second Workspace');
      await page.goto(`/workspaces/${workspace2Id}`);
      
      // Try to access task from first workspace (this would require manipulating URLs)
      // This test ensures proper authorization checks
      await page.goto(`/workspaces/${workspace2Id}/tasks/task-from-workspace1`);
      
      // Should get 404 or access denied
      await expect(page.locator('text=Task not found')).toBeVisible();
    });
  });

  test.describe('Task Deletion', () => {
    test('should delete task successfully', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'Task to Delete', serviceId });
      await taskHelper.deleteTask('Task to Delete');
      
      // Verify task is deleted
      await expect(page.locator('[data-testid="task-card"]:has-text("Task to Delete")')).not.toBeVisible();
    });

    test('should show confirmation dialog before deletion', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'Confirm Delete', serviceId });
      
      await page.click('[data-testid="task-card"]:has-text("Confirm Delete")');
      await page.click('[data-testid="delete-task-button"]');
      
      // Should show confirmation dialog
      await expect(page.locator('text=Are you sure you want to delete this task?')).toBeVisible();
      await expect(page.locator('[data-testid="confirm-delete-button"]')).toBeVisible();
      await expect(page.locator('[data-testid="cancel-delete-button"]')).toBeVisible();
    });

    test('should cancel task deletion', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'Cancel Delete', serviceId });
      
      await page.click('[data-testid="task-card"]:has-text("Cancel Delete")');
      await page.click('[data-testid="delete-task-button"]');
      await page.click('[data-testid="cancel-delete-button"]');
      
      // Task should still be visible
      await expect(page.locator('[data-testid="task-card"]:has-text("Cancel Delete")')).toBeVisible();
    });

    test('should prevent non-authorized users from deleting tasks', async ({ page }) => {
      await taskHelper.createTask({ title: 'Protected Task', serviceId });
      
      // Switch to different user
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      await workspaceHelper.joinWorkspace(inviteCode);
      
      await page.goto(`/workspaces/${workspaceId}`);
      
      // Open task - delete button should not be visible for non-creator
      await page.click('[data-testid="task-card"]:has-text("Protected Task")');
      await expect(page.locator('[data-testid="delete-task-button"]')).not.toBeVisible();
    });
  });

  test.describe('Task Comments and Messages', () => {
    test('should add comment to task', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'Comment Task', serviceId });
      
      await page.click('[data-testid="task-card"]:has-text("Comment Task")');
      await page.fill('[data-testid="comment-input"]', 'This is a test comment');
      await page.click('[data-testid="submit-comment-button"]');
      
      // Verify comment appears
      await expect(page.locator('text=This is a test comment')).toBeVisible();
      await expect(page.locator(`text=${TEST_USERS.admin.name}`)).toBeVisible();
    });

    test('should show comment count on task card', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'Comment Count Task', serviceId });
      
      // Add multiple comments
      await page.click('[data-testid="task-card"]:has-text("Comment Count Task")');
      await page.fill('[data-testid="comment-input"]', 'First comment');
      await page.click('[data-testid="submit-comment-button"]');
      await page.fill('[data-testid="comment-input"]', 'Second comment');
      await page.click('[data-testid="submit-comment-button"]');
      
      // Close task details
      await page.click('[data-testid="close-task-details"]');
      
      // Check comment count on card
      await expect(page.locator('[data-testid="task-card"]:has-text("Comment Count Task") [data-testid="comment-count"]:has-text("2")')).toBeVisible();
    });

    test('should edit own comments', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'Edit Comment Task', serviceId });
      
      await page.click('[data-testid="task-card"]:has-text("Edit Comment Task")');
      await page.fill('[data-testid="comment-input"]', 'Original comment');
      await page.click('[data-testid="submit-comment-button"]');
      
      // Edit comment
      await page.hover('[data-testid="comment-item"]');
      await page.click('[data-testid="edit-comment-button"]');
      await page.fill('[data-testid="edit-comment-input"]', 'Updated comment');
      await page.click('[data-testid="save-comment-button"]');
      
      // Verify comment updated
      await expect(page.locator('text=Updated comment')).toBeVisible();
      await expect(page.locator('text=Original comment')).not.toBeVisible();
    });

    test('should delete own comments', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'Delete Comment Task', serviceId });
      
      await page.click('[data-testid="task-card"]:has-text("Delete Comment Task")');
      await page.fill('[data-testid="comment-input"]', 'Comment to delete');
      await page.click('[data-testid="submit-comment-button"]');
      
      // Delete comment
      await page.hover('[data-testid="comment-item"]');
      await page.click('[data-testid="delete-comment-button"]');
      await page.click('[data-testid="confirm-delete-comment"]');
      
      // Verify comment deleted
      await expect(page.locator('text=Comment to delete')).not.toBeVisible();
    });

    test('should prevent editing other users comments', async ({ page }) => {
      await taskHelper.createTask({ title: 'Other User Comment Task', serviceId });
      
      await page.click('[data-testid="task-card"]:has-text("Other User Comment Task")');
      await page.fill('[data-testid="comment-input"]', 'Admin comment');
      await page.click('[data-testid="submit-comment-button"]');
      
      // Switch to different user
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      await workspaceHelper.joinWorkspace(inviteCode);
      
      await page.goto(`/workspaces/${workspaceId}`);
      await page.click('[data-testid="task-card"]:has-text("Other User Comment Task")');
      
      // Should not see edit/delete buttons for admin's comment
      await page.hover('[data-testid="comment-item"]');
      await expect(page.locator('[data-testid="edit-comment-button"]')).not.toBeVisible();
      await expect(page.locator('[data-testid="delete-comment-button"]')).not.toBeVisible();
    });
  });

  test.describe('Task History and Audit Trail', () => {
    test('should track task status changes', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'History Task', serviceId });
      
      // Move task through different statuses
      await taskHelper.moveTaskToColumn('History Task', 'IN_PROGRESS');
      await taskHelper.moveTaskToColumn('History Task', 'REVIEW');
      await taskHelper.moveTaskToColumn('History Task', 'DONE');
      
      // Check task history
      await page.click('[data-testid="task-card"]:has-text("History Task")');
      await page.click('[data-testid="task-history-tab"]');
      
      // Should show status change history
      await expect(page.locator('text=moved to In Progress')).toBeVisible();
      await expect(page.locator('text=moved to Review')).toBeVisible();
      await expect(page.locator('text=moved to Done')).toBeVisible();
    });

    test('should track task field changes', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'Field Changes Task', serviceId, priority: 'LOW' });
      
      await taskHelper.editTask('Field Changes Task', {
        title: 'Updated Field Changes Task',
        priority: 'HIGH',
      });
      
      // Check history
      await page.click('[data-testid="task-card"]:has-text("Updated Field Changes Task")');
      await page.click('[data-testid="task-history-tab"]');
      
      // Should show field change history
      await expect(page.locator('text=changed title')).toBeVisible();
      await expect(page.locator('text=changed priority from Low to High')).toBeVisible();
    });

    test('should show who made changes and when', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'Attribution Task', serviceId });
      
      await taskHelper.editTask('Attribution Task', { description: 'Added description' });
      
      await page.click('[data-testid="task-card"]:has-text("Attribution Task")');
      await page.click('[data-testid="task-history-tab"]');
      
      // Should show user and timestamp
      await expect(page.locator(`text=${TEST_USERS.admin.name}`)).toBeVisible();
      await expect(page.locator('[data-testid="change-timestamp"]')).toBeVisible();
    });
  });
});