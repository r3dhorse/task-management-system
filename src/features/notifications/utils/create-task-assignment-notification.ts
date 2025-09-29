import { NotificationType } from "../types";

export interface CreateTaskAssignmentNotificationData {
  taskId: string;
  taskName: string;
  workspaceId: string;
  assigneeUserId: string;
  assignerUserId: string;
  assignerName: string;
}

/**
 * Create a task assignment notification in the database
 */
export async function createTaskAssignmentNotification(data: CreateTaskAssignmentNotificationData) {
  try {
    const response = await fetch('/api/notifications/create-mention', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: data.assigneeUserId,
        type: NotificationType.TASK_ASSIGNED,
        title: `Task assigned to you`,
        message: `${data.assignerName} assigned you to task "${data.taskName}"`,
        workspaceId: data.workspaceId,
        taskId: data.taskId,
        mentionedBy: data.assignerUserId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create task assignment notification');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating task assignment notification:', error);
    throw error;
  }
}