import { NotificationType } from "../types";

export interface CreateReviewerNotificationData {
  taskId: string;
  taskName: string;
  workspaceId: string;
  reviewerUserId: string;
  assignerUserId: string;
  assignerName: string;
}

/**
 * Create a reviewer assignment notification in the database
 */
export async function createReviewerNotification(data: CreateReviewerNotificationData) {
  try {
    const response = await fetch('/api/notifications/create-mention', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: data.reviewerUserId,
        type: NotificationType.REVIEWER_ASSIGNED,
        title: `Assigned as reviewer`,
        message: `${data.assignerName} assigned you as reviewer for task "${data.taskName}"`,
        workspaceId: data.workspaceId,
        taskId: data.taskId,
        mentionedBy: data.assignerUserId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create reviewer notification');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating reviewer notification:', error);
    throw error;
  }
}
