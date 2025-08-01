export interface TaskMessage {
  id: string;
  taskId: string;
  senderId: string;
  senderName?: string;
  content: string;
  timestamp: string;
  workspaceId: string;
  attachmentId?: string | null;
  attachmentName?: string | null;
  attachmentSize?: string | null;
  attachmentType?: string | null;
  sender?: {
    id: string;
    name: string | null;
    email: string | null;
    image?: string | null;
  };
}

export interface CreateTaskMessageRequest {
  taskId: string;
  content: string;
  workspaceId: string;
  attachmentId?: string;
  attachmentName?: string;
  attachmentSize?: string;
  attachmentType?: string;
}

export interface GetTaskMessagesRequest {
  taskId: string;
  workspaceId?: string;
}