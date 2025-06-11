import { Models } from "node-appwrite"

export enum TaskStatus {
  BACKLOG = "BACKLOG",
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "IN_REVIEW",
  DONE = "DONE",
  ARCHIVED = "ARCHIVED" // For soft-deleted tasks, accessible by admins and members
};

export type Task = Models.Document & {
  name: string;
  status: TaskStatus;
  workspaceId: string;
  assigneeId: string;
  serviceId: string;
  position: number;
  dueDate: string;
  description?: string;
  attachmentId?: string;
  followedIds?: string; // JSON string array of user IDs following this task
  creatorId?: string; // User ID of the task creator
  isConfidential?: boolean; // If true, only visible to creator, assignee, and followers
}

export type PopulatedTask = Task & {
  service?: Models.Document;
  assignees?: Models.Document[];
}