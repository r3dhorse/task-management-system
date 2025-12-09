export enum TaskStatus {
  BACKLOG = "BACKLOG",
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  IN_REVIEW = "IN_REVIEW",
  DONE = "DONE",
  ARCHIVED = "ARCHIVED" // For soft-deleted tasks, accessible by admins and members
};

export enum ReviewStatus {
  PENDING = "PENDING",
  APPROVED = "APPROVED",
  REJECTED = "REJECTED",
  CHANGES_REQUESTED = "CHANGES_REQUESTED"
};

export type Task = {
  id: string;
  taskNumber: string;
  name: string;
  status: TaskStatus;
  workspaceId: string;
  reviewerId: string | null;
  serviceId: string;
  position: number;
  dueDate: string | null;
  description?: string | null;
  attachmentId?: string | null;
  followedIds?: string; // JSON string array of customer IDs following this task
  collaboratorIds?: string; // JSON string array of team member IDs collaborating on this task
  creatorId?: string | null; // User ID of the task creator
  isConfidential?: boolean; // If true, only visible to creator, assignees, followers, and collaborators
  parentTaskId?: string | null; // ID of the parent task if this is a subtask
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
    userId: string;
    name: string;
    email: string;
  }>;
  reviewer?: {
    id: string;
    userId: string;
    workspaceId: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  followers?: Array<{
    id: string;
    userId: string;
    workspaceId: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  collaborators?: Array<{
    id: string;
    userId: string;
    workspaceId: string;
    role: string;
    joinedAt: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  }>;
  subTaskCount?: number;
}

export type TaskReview = {
  id: string;
  taskId: string;
  reviewerId: string;
  status: ReviewStatus;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
}