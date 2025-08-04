import { NotificationType } from "../types";

export interface CreateMentionNotificationData {
  taskId: string;
  messageId: string;
  workspaceId: string;
  mentionedUserId: string;
  mentionerUserId: string;
  mentionerName: string;
  taskName: string;
  messageContent: string;
}

/**
 * Create a mention notification in the database
 */
export async function createMentionNotification(data: CreateMentionNotificationData) {
  try {
    const response = await fetch('/api/notifications/create-mention', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: data.mentionedUserId,
        type: NotificationType.MENTION,
        title: `${data.mentionerName} mentioned you`,
        message: `${data.mentionerName} mentioned you in task "${data.taskName}": ${data.messageContent.slice(0, 100)}${data.messageContent.length > 100 ? '...' : ''}`,
        workspaceId: data.workspaceId,
        taskId: data.taskId,
        messageId: data.messageId,
        mentionedBy: data.mentionerUserId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to create mention notification');
    }

    return await response.json();
  } catch (error) {
    console.error('Error creating mention notification:', error);
    throw error;
  }
}