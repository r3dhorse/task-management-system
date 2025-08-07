export enum TaskHistoryAction {
  CREATED = "CREATED",
  UPDATED = "UPDATED",
  STATUS_CHANGED = "STATUS_CHANGED",
  ASSIGNEE_CHANGED = "ASSIGNEE_CHANGED",
  SERVICE_CHANGED = "SERVICE_CHANGED",
  DUE_DATE_CHANGED = "DUE_DATE_CHANGED",
  ATTACHMENT_ADDED = "ATTACHMENT_ADDED",
  ATTACHMENT_REMOVED = "ATTACHMENT_REMOVED",
  ATTACHMENT_VIEWED = "ATTACHMENT_VIEWED",
  DESCRIPTION_UPDATED = "DESCRIPTION_UPDATED",
  NAME_CHANGED = "NAME_CHANGED",
  FOLLOWERS_CHANGED = "FOLLOWERS_CHANGED",
  CONFIDENTIAL_CHANGED = "CONFIDENTIAL_CHANGED",
  ARCHIVED = "ARCHIVED"
}

export interface TaskHistoryEntry {
  id: string;
  taskId: string;
  userId: string;
  userName: string;
  action: TaskHistoryAction;
  field?: string;
  oldValue?: string;
  newValue?: string;
  details?: string;
  timestamp: string;
}

export interface TaskHistoryChange {
  field: string;
  oldValue: string | undefined;
  newValue: string | undefined;
  displayName: string;
}