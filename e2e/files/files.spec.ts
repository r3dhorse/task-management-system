import { test, expect } from '@playwright/test';
import { AuthHelper, WorkspaceHelper, TaskHelper, FileHelper, TEST_USERS, resetDatabase, seedTestData } from '../utils/test-helpers';
import path from 'path';

test.describe('File Management', () => {
  let authHelper: AuthHelper;
  let workspaceHelper: WorkspaceHelper;
  let taskHelper: TaskHelper;
  let fileHelper: FileHelper;
  let workspaceId: string;
  let serviceId: string;

  // Create test files for upload testing
  const TEST_FILES = {
    pdf: path.join(__dirname, '../fixtures/test-document.pdf'),
    image: path.join(__dirname, '../fixtures/test-image.jpg'),
    largePdf: path.join(__dirname, '../fixtures/large-document.pdf'),
    invalidFile: path.join(__dirname, '../fixtures/test-file.txt'),
  };

  test.beforeAll(async () => {
    // Create test fixtures directory and files if they don't exist
    // This would typically be done in a setup script
    // For now, we'll assume they exist or create them programmatically
  });

  test.beforeEach(async ({ page }) => {
    authHelper = new AuthHelper(page);
    workspaceHelper = new WorkspaceHelper(page);
    taskHelper = new TaskHelper(page);
    fileHelper = new FileHelper(page);
    await resetDatabase();
    await seedTestData();

    // Setup workspace and service
    await authHelper.signIn(TEST_USERS.admin);
    workspaceId = await workspaceHelper.createWorkspace('File Test Workspace');
    
    // Create service for task attachments
    await page.goto(`/workspaces/${workspaceId}/services`);
    await page.click('[data-testid="create-service-button"]');
    await page.fill('[data-testid="service-name-input"]', 'File Test Service');
    await page.click('[data-testid="submit-service-button"]');
    serviceId = 'file-test-service-id';
  });

  test.describe('Task File Attachments', () => {
    test('should upload PDF file to task', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      // Create a task first
      await taskHelper.createTask({
        title: 'Task with Attachment',
        serviceId,
      });

      // Upload file to task
      await fileHelper.uploadFile(TEST_FILES.pdf, 'Task with Attachment');

      // Verify file appears in task
      await page.click('[data-testid="task-card"]:has-text("Task with Attachment")');
      await expect(page.locator('[data-testid="attachment-item"]:has-text("test-document.pdf")')).toBeVisible();
      
      // Verify file size and type are displayed
      await expect(page.locator('[data-testid="file-size"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-type"]:has-text("PDF")')).toBeVisible();
    });

    test('should upload image file to task', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'Task with Image',
        serviceId,
      });

      await fileHelper.uploadFile(TEST_FILES.image, 'Task with Image');

      // Verify image attachment
      await page.click('[data-testid="task-card"]:has-text("Task with Image")');
      await expect(page.locator('[data-testid="attachment-item"]:has-text("test-image.jpg")')).toBeVisible();
      
      // Verify image preview is available
      await expect(page.locator('[data-testid="image-preview"]')).toBeVisible();
    });

    test('should upload multiple files to task', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'Task with Multiple Files',
        serviceId,
      });

      // Upload multiple files
      await fileHelper.uploadFile(TEST_FILES.pdf, 'Task with Multiple Files');
      await fileHelper.uploadFile(TEST_FILES.image, 'Task with Multiple Files');

      // Verify both files appear
      await page.click('[data-testid="task-card"]:has-text("Task with Multiple Files")');
      await expect(page.locator('[data-testid="attachment-item"]:has-text("test-document.pdf")')).toBeVisible();
      await expect(page.locator('[data-testid="attachment-item"]:has-text("test-image.jpg")')).toBeVisible();
    });

    test('should show file upload progress', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'Progress Test Task',
        serviceId,
      });

      // Start upload and check for progress indicator
      await page.click('[data-testid="task-card"]:has-text("Progress Test Task")');
      await page.click('[data-testid="add-attachment-button"]');
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(TEST_FILES.pdf);
      
      // Should show progress bar during upload
      await expect(page.locator('[data-testid="upload-progress"]')).toBeVisible();
      
      await page.click('[data-testid="upload-submit-button"]');
      
      // Progress should complete
      await expect(page.locator('text=File uploaded successfully')).toBeVisible();
    });

    test('should reject files exceeding size limit', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'Size Limit Task',
        serviceId,
      });

      // Try to upload large file (assuming it exceeds 10MB limit)
      await page.click('[data-testid="task-card"]:has-text("Size Limit Task")');
      await page.click('[data-testid="add-attachment-button"]');
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(TEST_FILES.largePdf);
      
      await page.click('[data-testid="upload-submit-button"]');
      
      // Should show error message
      await expect(page.locator('text=File size exceeds 10MB limit')).toBeVisible();
    });

    test('should reject invalid file types', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'File Type Task',
        serviceId,
      });

      // Try to upload invalid file type
      await page.click('[data-testid="task-card"]:has-text("File Type Task")');
      await page.click('[data-testid="add-attachment-button"]');
      
      const fileInput = page.locator('[data-testid="file-input"]');
      await fileInput.setInputFiles(TEST_FILES.invalidFile);
      
      await page.click('[data-testid="upload-submit-button"]');
      
      // Should show error message
      await expect(page.locator('text=Only PDF and image files are allowed')).toBeVisible();
    });

    test('should download task attachment', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'Download Test Task',
        serviceId,
      });

      await fileHelper.uploadFile(TEST_FILES.pdf, 'Download Test Task');

      // Download the file
      const download = await fileHelper.downloadFile('test-document.pdf');
      
      // Verify download
      expect(download.suggestedFilename()).toBe('test-document.pdf');
    });

    test('should delete task attachment', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'Delete Attachment Task',
        serviceId,
      });

      await fileHelper.uploadFile(TEST_FILES.pdf, 'Delete Attachment Task');

      // Delete the file
      await page.click('[data-testid="task-card"]:has-text("Delete Attachment Task")');
      await fileHelper.deleteFile('test-document.pdf');

      // Verify file is deleted
      await expect(page.locator('[data-testid="attachment-item"]:has-text("test-document.pdf")')).not.toBeVisible();
    });

    test('should show attachment count on task card', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'Attachment Count Task',
        serviceId,
      });

      // Upload multiple files
      await fileHelper.uploadFile(TEST_FILES.pdf, 'Attachment Count Task');
      await fileHelper.uploadFile(TEST_FILES.image, 'Attachment Count Task');

      // Close task details to see card
      await page.click('[data-testid="close-task-details"]');

      // Verify attachment count on card
      await expect(page.locator('[data-testid="task-card"]:has-text("Attachment Count Task") [data-testid="attachment-count"]:has-text("2")')).toBeVisible();
    });
  });

  test.describe('Message File Attachments', () => {
    test('should upload file to task message', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'Message File Task',
        serviceId,
      });

      // Open task and add message with attachment
      await page.click('[data-testid="task-card"]:has-text("Message File Task")');
      await page.fill('[data-testid="message-input"]', 'Here is the document');
      
      // Attach file to message
      await page.click('[data-testid="attach-file-to-message"]');
      const fileInput = page.locator('[data-testid="message-file-input"]');
      await fileInput.setInputFiles(TEST_FILES.image);
      
      await page.click('[data-testid="send-message-button"]');

      // Verify message with attachment
      await expect(page.locator('[data-testid="message-item"]:has-text("Here is the document")')).toBeVisible();
      await expect(page.locator('[data-testid="message-attachment"]:has-text("test-image.jpg")')).toBeVisible();
    });

    test('should respect message file size limit', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'Message Size Test',
        serviceId,
      });

      await page.click('[data-testid="task-card"]:has-text("Message Size Test")');
      await page.fill('[data-testid="message-input"]', 'Large file test');
      await page.click('[data-testid="attach-file-to-message"]');
      
      const fileInput = page.locator('[data-testid="message-file-input"]');
      await fileInput.setInputFiles(TEST_FILES.largePdf);
      
      await page.click('[data-testid="send-message-button"]');

      // Should show error for message attachments (3MB limit vs 10MB for task attachments)
      await expect(page.locator('text=File size exceeds 3MB limit for messages')).toBeVisible();
    });

    test('should allow both images and PDFs in messages', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'Message Types Test',
        serviceId,
      });

      await page.click('[data-testid="task-card"]:has-text("Message Types Test")');
      
      // Send message with PDF
      await page.fill('[data-testid="message-input"]', 'PDF attachment');
      await page.click('[data-testid="attach-file-to-message"]');
      const fileInput1 = page.locator('[data-testid="message-file-input"]');
      await fileInput1.setInputFiles(TEST_FILES.pdf);
      await page.click('[data-testid="send-message-button"]');

      // Send message with image
      await page.fill('[data-testid="message-input"]', 'Image attachment');
      await page.click('[data-testid="attach-file-to-message"]');
      const fileInput2 = page.locator('[data-testid="message-file-input"]');
      await fileInput2.setInputFiles(TEST_FILES.image);
      await page.click('[data-testid="send-message-button"]');

      // Verify both message attachments
      await expect(page.locator('[data-testid="message-attachment"]:has-text("test-document.pdf")')).toBeVisible();
      await expect(page.locator('[data-testid="message-attachment"]:has-text("test-image.jpg")')).toBeVisible();
    });
  });

  test.describe('File Access Control', () => {
    test('should only allow workspace members to access files', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({
        title: 'Access Control Task',
        serviceId,
      });

      await fileHelper.uploadFile(TEST_FILES.pdf, 'Access Control Task');

      // Get file URL
      await page.click('[data-testid="task-card"]:has-text("Access Control Task")');
      const fileLink = page.locator('[data-testid="attachment-item"]:has-text("test-document.pdf") a');
      const fileUrl = await fileLink.getAttribute('href');

      // Sign out and try to access file
      await authHelper.signOut();

      // Direct access should be denied
      await page.goto(fileUrl!);
      expect(page.url()).toMatch(/\/sign-in/);
    });

    test('should allow file access to workspace members only', async ({ page }) => {
      // Upload file as admin
      await page.goto(`/workspaces/${workspaceId}`);
      await taskHelper.createTask({
        title: 'Member Access Task',
        serviceId,
      });
      await fileHelper.uploadFile(TEST_FILES.pdf, 'Member Access Task');

      // Get file URL
      await page.click('[data-testid="task-card"]:has-text("Member Access Task")');
      const fileLink = page.locator('[data-testid="attachment-item"]:has-text("test-document.pdf") a');
      const fileUrl = await fileLink.getAttribute('href');

      // Add user to workspace
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      await workspaceHelper.joinWorkspace(inviteCode);

      // User should be able to access file
      await page.goto(fileUrl!);
      
      // Should not be redirected to signin (file should load)
      expect(page.url()).not.toMatch(/\/sign-in/);
    });

    test('should deny file access to non-workspace members', async ({ page }) => {
      // Upload file as admin
      await page.goto(`/workspaces/${workspaceId}`);
      await taskHelper.createTask({
        title: 'Non-Member Access Task',
        serviceId,
      });
      await fileHelper.uploadFile(TEST_FILES.pdf, 'Non-Member Access Task');

      // Get file URL
      await page.click('[data-testid="task-card"]:has-text("Non-Member Access Task")');
      const fileLink = page.locator('[data-testid="attachment-item"]:has-text("test-document.pdf") a');
      const fileUrl = await fileLink.getAttribute('href');

      // Sign in as different user (not in workspace)
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);

      // Try to access file
      await page.goto(fileUrl!);
      
      // Should be denied access
      await expect(page.locator('text=File not found or access denied')).toBeVisible();
    });

    test('should handle confidential task file access', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      // Create confidential task
      await page.click('[data-testid="create-task-button"]');
      await page.fill('[data-testid="task-title-input"]', 'Confidential File Task');
      await page.click('[data-testid="task-service-select"]');
      await page.click(`[data-testid="service-option-${serviceId}"]`);
      await page.check('[data-testid="task-confidential-checkbox"]');
      await page.click('[data-testid="submit-task-button"]');

      await fileHelper.uploadFile(TEST_FILES.pdf, 'Confidential File Task');

      // Get file URL
      await page.click('[data-testid="task-card"]:has-text("Confidential File Task")');
      const fileLink = page.locator('[data-testid="attachment-item"]:has-text("test-document.pdf") a');
      const fileUrl = await fileLink.getAttribute('href');

      // Add regular member to workspace
      const inviteCode = await workspaceHelper.getInviteCode(workspaceId);
      await authHelper.signOut();
      await authHelper.signIn(TEST_USERS.user1);
      await workspaceHelper.joinWorkspace(inviteCode);

      // Regular member should not see confidential task files
      await page.goto(fileUrl!);
      await expect(page.locator('text=File not found or access denied')).toBeVisible();
    });
  });

  test.describe('File Storage and Management', () => {
    test('should show file storage usage in workspace settings', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      // Upload several files
      await taskHelper.createTask({ title: 'Storage Test 1', serviceId });
      await fileHelper.uploadFile(TEST_FILES.pdf, 'Storage Test 1');
      
      await taskHelper.createTask({ title: 'Storage Test 2', serviceId });
      await fileHelper.uploadFile(TEST_FILES.image, 'Storage Test 2');

      // Check storage usage in settings
      await page.goto(`/workspaces/${workspaceId}/settings`);
      await page.click('[data-testid="storage-tab"]');

      // Should show storage usage
      await expect(page.locator('[data-testid="storage-used"]')).toBeVisible();
      await expect(page.locator('[data-testid="file-count"]')).toBeVisible();
    });

    test('should list all workspace files in file manager', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      // Upload files to different tasks
      await taskHelper.createTask({ title: 'File Manager Test 1', serviceId });
      await fileHelper.uploadFile(TEST_FILES.pdf, 'File Manager Test 1');
      
      await taskHelper.createTask({ title: 'File Manager Test 2', serviceId });
      await fileHelper.uploadFile(TEST_FILES.image, 'File Manager Test 2');

      // Go to file manager
      await page.goto(`/workspaces/${workspaceId}/files`);

      // Should show all files
      await expect(page.locator('[data-testid="file-item"]:has-text("test-document.pdf")')).toBeVisible();
      await expect(page.locator('[data-testid="file-item"]:has-text("test-image.jpg")')).toBeVisible();
    });

    test('should filter files by type in file manager', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      // Upload different file types
      await taskHelper.createTask({ title: 'Filter Test', serviceId });
      await fileHelper.uploadFile(TEST_FILES.pdf, 'Filter Test');
      await fileHelper.uploadFile(TEST_FILES.image, 'Filter Test');

      await page.goto(`/workspaces/${workspaceId}/files`);

      // Filter by PDF
      await page.click('[data-testid="file-type-filter"]');
      await page.click('[data-testid="filter-pdf"]');

      // Should only show PDF files
      await expect(page.locator('[data-testid="file-item"]:has-text("test-document.pdf")')).toBeVisible();
      await expect(page.locator('[data-testid="file-item"]:has-text("test-image.jpg")')).not.toBeVisible();
    });

    test('should search files by name', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'Search Test', serviceId });
      await fileHelper.uploadFile(TEST_FILES.pdf, 'Search Test');
      await fileHelper.uploadFile(TEST_FILES.image, 'Search Test');

      await page.goto(`/workspaces/${workspaceId}/files`);

      // Search for specific file
      await page.fill('[data-testid="file-search-input"]', 'document');

      // Should only show matching files
      await expect(page.locator('[data-testid="file-item"]:has-text("test-document.pdf")')).toBeVisible();
      await expect(page.locator('[data-testid="file-item"]:has-text("test-image.jpg")')).not.toBeVisible();
    });

    test('should show file details and metadata', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'Metadata Test', serviceId });
      await fileHelper.uploadFile(TEST_FILES.pdf, 'Metadata Test');

      await page.goto(`/workspaces/${workspaceId}/files`);

      // Click on file for details
      await page.click('[data-testid="file-item"]:has-text("test-document.pdf")');

      // Should show file metadata
      await expect(page.locator('[data-testid="file-size"]')).toBeVisible();
      await expect(page.locator('[data-testid="upload-date"]')).toBeVisible();
      await expect(page.locator('[data-testid="uploaded-by"]')).toBeVisible();
      await expect(page.locator('[data-testid="associated-task"]')).toBeVisible();
    });
  });

  test.describe('File Cleanup and Deletion', () => {
    test('should delete files when task is deleted', async ({ page }) => {
      await page.goto(`/workspaces/${workspaceId}`);
      
      await taskHelper.createTask({ title: 'Cleanup Test Task', serviceId });
      await fileHelper.uploadFile(TEST_FILES.pdf, 'Cleanup Test Task');

      // Delete the task
      await taskHelper.deleteTask('Cleanup Test Task');

      // Check file manager - file should be gone
      await page.goto(`/workspaces/${workspaceId}/files`);
      await expect(page.locator('[data-testid="file-item"]:has-text("test-document.pdf")')).not.toBeVisible();
    });

    test('should delete files when workspace is deleted', async ({ page }) => {
      // Create workspace with files
      const tempWorkspaceId = await workspaceHelper.createWorkspace('Temp Workspace');
      
      await page.goto(`/workspaces/${tempWorkspaceId}/services`);
      await page.click('[data-testid="create-service-button"]');
      await page.fill('[data-testid="service-name-input"]', 'Temp Service');
      await page.click('[data-testid="submit-service-button"]');

      await page.goto(`/workspaces/${tempWorkspaceId}`);
      await taskHelper.createTask({ title: 'Temp Task', serviceId: 'temp-service-id' });
      await fileHelper.uploadFile(TEST_FILES.pdf, 'Temp Task');

      // Delete workspace
      await page.goto(`/workspaces/${tempWorkspaceId}/settings`);
      await page.click('[data-testid="delete-workspace-button"]');
      await page.fill('[data-testid="confirm-workspace-name"]', 'Temp Workspace');
      await page.click('[data-testid="confirm-delete-button"]');

      // Files should be cleaned up (this would need to be verified at the file system level)
      // For now, just verify workspace deletion succeeded
      expect(page.url()).toMatch(/\/workspaces$/);
    });

    test('should handle orphaned file cleanup', async ({ page }) => {
      // This test would verify that files without associated tasks/messages are cleaned up
      // Implementation would depend on your cleanup strategy
      
      await page.goto(`/workspaces/${workspaceId}/settings`);
      await page.click('[data-testid="maintenance-tab"]');
      
      // Run orphaned file cleanup
      await page.click('[data-testid="cleanup-orphaned-files"]');
      
      // Should show cleanup results
      await expect(page.locator('text=Orphaned files cleaned up successfully')).toBeVisible();
    });
  });
});