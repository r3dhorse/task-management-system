export enum TaskStatus {
  BACKLOG = "BACKLOG",
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "IN_REVIEW",
  DONE = "DONE",
  ARCHIVED = "ARCHIVED" // For soft-deleted tasks, accessible by admins and members
};

export type Task = {
  id: string;
  taskNumber: string;
  name: string;
  status: TaskStatus;
  workspaceId: string;
  assigneeId: string | null;
  serviceId: string;
  position: number;
  dueDate: string | null;
  description?: string | null;
  attachmentId?: string | null;
  followedIds?: string; // JSON string array of user IDs following this task
  creatorId?: string | null; // User ID of the task creator
  isConfidential?: boolean; // If true, only visible to creator, assignee, and followers
  createdAt: string;
  updatedAt: string;
}

export type PopulatedTask = Task & {
  service?: {
    id: string;
    name: string;
    workspaceId: string;
  };
  assignees?: Array<{
    id: string;
    name: string;
    email: string;
  }>;
}