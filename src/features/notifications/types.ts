export enum NotificationType {
  MENTION = "MENTION",
  NEW_MESSAGE = "NEW_MESSAGE",
  TASK_ASSIGNED = "TASK_ASSIGNED",
  TASK_UPDATE = "TASK_UPDATE",
  TASK_COMMENT = "TASK_COMMENT",
  REVIEWER_ASSIGNED = "REVIEWER_ASSIGNED",
}

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  workspaceId: string;
  taskId?: string;
  messageId?: string;
  mentionedBy?: string;
  createdAt: string;
  readAt?: string;

  // Relations
  task?: {
    id: string;
    name: string;
  };
  taskMessage?: {
    id: string;
    content: string;
  };
  mentioner?: {
    id: string;
    name: string;
  };
}