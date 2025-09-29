import { Task, TaskStatus } from "../types";
import { TaskHistoryAction, TaskHistoryChange } from "../types/history";

// Helper function to normalize empty values
function normalizeValue(value: string | undefined | null): string {
  return value || "";
}

// Helper function to normalize follower IDs for comparison
function normalizeFollowerIds(value: string | undefined | null): string {
  if (!value || value === "") return "[]";
  return value;
}

// Helper function to normalize dates for comparison
function normalizeDateForComparison(dateValue: string | undefined | null): string {
  if (!dateValue) return "";
  try {
    // Convert to ISO date string (YYYY-MM-DD) for consistent comparison
    return new Date(dateValue).toISOString().split('T')[0];
  } catch {
    return dateValue || "";
  }
}

export function detectTaskChanges(oldTask: Task, newTask: Partial<Task>): TaskHistoryChange[] {
  const changes: TaskHistoryChange[] = [];

  // Name change
  if (newTask.name !== undefined && normalizeValue(newTask.name) !== normalizeValue(oldTask.name)) {
    changes.push({
      field: "name",
      oldValue: oldTask.name,
      newValue: newTask.name,
      displayName: "Task Name"
    });
  }

  // Status change
  if (newTask.status !== undefined && newTask.status !== oldTask.status) {
    // Don't create history entries for null/undefined status changes
    const oldStatus = oldTask.status || null;
    const newStatus = newTask.status || null;
    if (oldStatus !== null || newStatus !== null) {
      changes.push({
        field: "status",
        oldValue: oldTask.status,
        newValue: newTask.status,
        displayName: "Status"
      });
    }
  }

  // Assignee change - handle empty strings vs null/undefined consistently
  if (newTask.assigneeId !== undefined && normalizeValue(newTask.assigneeId) !== normalizeValue(oldTask.assigneeId)) {
    changes.push({
      field: "assigneeId",
      oldValue: oldTask.assigneeId || undefined,
      newValue: newTask.assigneeId || undefined,
      displayName: "Assignee"
    });
  }

  // Reviewer change - handle empty strings vs null/undefined consistently
  if (newTask.reviewerId !== undefined && normalizeValue(newTask.reviewerId) !== normalizeValue(oldTask.reviewerId)) {
    changes.push({
      field: "reviewerId",
      oldValue: oldTask.reviewerId || undefined,
      newValue: newTask.reviewerId || undefined,
      displayName: "Reviewer"
    });
  }

  // Service change
  if (newTask.serviceId !== undefined && normalizeValue(newTask.serviceId) !== normalizeValue(oldTask.serviceId)) {
    changes.push({
      field: "serviceId",
      oldValue: oldTask.serviceId,
      newValue: newTask.serviceId,
      displayName: "Service"
    });
  }

  // Workspace change
  if (newTask.workspaceId !== undefined && normalizeValue(newTask.workspaceId) !== normalizeValue(oldTask.workspaceId)) {
    changes.push({
      field: "workspaceId",
      oldValue: oldTask.workspaceId,
      newValue: newTask.workspaceId,
      displayName: "Workspace"
    });
  }

  // Due date change - use proper date comparison
  if (newTask.dueDate !== undefined && normalizeDateForComparison(newTask.dueDate) !== normalizeDateForComparison(oldTask.dueDate)) {
    changes.push({
      field: "dueDate",
      oldValue: oldTask.dueDate || undefined,
      newValue: newTask.dueDate || undefined,
      displayName: "Due Date"
    });
  }

  // Description change
  if (newTask.description !== undefined && normalizeValue(newTask.description) !== normalizeValue(oldTask.description)) {
    changes.push({
      field: "description",
      oldValue: oldTask.description || "",
      newValue: newTask.description || undefined,
      displayName: "Description"
    });
  }

  // Attachment change
  if (newTask.attachmentId !== undefined && normalizeValue(newTask.attachmentId) !== normalizeValue(oldTask.attachmentId)) {
    changes.push({
      field: "attachmentId",
      oldValue: oldTask.attachmentId || "",
      newValue: newTask.attachmentId || undefined,
      displayName: "Attachment"
    });
  }

  // Followers change
  if (newTask.followedIds !== undefined && normalizeFollowerIds(newTask.followedIds) !== normalizeFollowerIds(oldTask.followedIds)) {
    changes.push({
      field: "followedIds",
      oldValue: oldTask.followedIds || "[]",
      newValue: newTask.followedIds || "[]",
      displayName: "Followers"
    });
  }

  // Confidential change
  if (newTask.isConfidential !== undefined && newTask.isConfidential !== oldTask.isConfidential) {
    changes.push({
      field: "isConfidential",
      oldValue: oldTask.isConfidential ? "true" : "false",
      newValue: newTask.isConfidential ? "true" : "false",
      displayName: "Confidential"
    });
  }

  return changes;
}

export function formatHistoryMessage(
  action: TaskHistoryAction,
  userName: string,
  field?: string,
  oldValue?: string,
  newValue?: string
): string {
  // Handle follower changes even when action is UPDATED
  if (field === "followedIds") {
    return formatFollowersChangeMessage(userName, oldValue, newValue);
  }

  // Handle service changes even when action is UPDATED
  if (field === "serviceId") {
    return `${userName} moved task to service ${formatValue(newValue)}`;
  }

  // Handle workspace changes even when action is UPDATED
  if (field === "workspaceId") {
    return `${userName} transferred task from ${formatValue(oldValue, "Unknown Workspace")} to ${formatValue(newValue)}`;
  }

  // Handle confidential changes even when action is UPDATED
  if (field === "isConfidential") {
    const isConfidential = newValue === "true";
    if (isConfidential) {
      return `${userName} marked this task as confidential`;
    } else {
      return `${userName} removed confidential status from this task`;
    }
  }

  switch (action) {
    case TaskHistoryAction.CREATED:
      return `${userName} created this task`;
    
    case TaskHistoryAction.STATUS_CHANGED:
      return `${userName} changed status from ${formatStatus(oldValue)} to ${formatStatus(newValue)}`;
    
    case TaskHistoryAction.ASSIGNEE_CHANGED:
      return `${userName} changed assignee from ${formatValue(oldValue, "Unassigned")} to ${formatValue(newValue, "Unassigned")}`;

    case TaskHistoryAction.REVIEWER_CHANGED:
      return `${userName} changed reviewer from ${formatValue(oldValue, "No Reviewer")} to ${formatValue(newValue, "No Reviewer")}`;

    case TaskHistoryAction.SERVICE_CHANGED:
      return `${userName} moved task to service ${formatValue(newValue)}`;

    case TaskHistoryAction.WORKSPACE_CHANGED:
      return `${userName} transferred task from ${formatValue(oldValue, "Unknown Workspace")} to ${formatValue(newValue)}`;

    case TaskHistoryAction.DUE_DATE_CHANGED:
      return `${userName} changed due date from ${formatDate(oldValue)} to ${formatDate(newValue)}`;
    
    case TaskHistoryAction.ATTACHMENT_ADDED:
      return `${userName} added an attachment`;
    
    case TaskHistoryAction.ATTACHMENT_REMOVED:
      return `${userName} removed the attachment`;
    
    case TaskHistoryAction.ATTACHMENT_VIEWED:
      return `${userName} viewed the attachment`;
    
    case TaskHistoryAction.DESCRIPTION_UPDATED:
      return `${userName} updated the description`;
    
    case TaskHistoryAction.NAME_CHANGED:
      return `${userName} changed task name from "${oldValue}" to "${newValue}"`;
    
    case TaskHistoryAction.FOLLOWERS_CHANGED:
      return formatFollowersChangeMessage(userName, oldValue, newValue);
    
    case TaskHistoryAction.CONFIDENTIAL_CHANGED:
      const isConfidentialStatus = newValue === "true";
      if (isConfidentialStatus) {
        return `${userName} marked this task as confidential`;
      } else {
        return `${userName} removed confidential status from this task`;
      }
    
    case TaskHistoryAction.ARCHIVED:
      return `${userName} archived this task`;
    
    default:
      return `${userName} updated the task`;
  }
}

function formatValue(value?: string, fallback = "None"): string {
  if (!value || value === "") return fallback;
  return value;
}

function formatDate(dateString?: string): string {
  if (!dateString) return "None";
  try {
    return new Date(dateString).toLocaleDateString();
  } catch {
    return dateString;
  }
}

function formatStatus(status?: string): string {
  if (!status) return "None";
  
  switch (status) {
    case TaskStatus.BACKLOG:
      return "Backlog";
    case TaskStatus.TODO:
      return "Todo";
    case TaskStatus.IN_PROGRESS:
      return "In Progress";
    case TaskStatus.IN_REVIEW:
      return "In Review";
    case TaskStatus.DONE:
      return "Done";
    case TaskStatus.ARCHIVED:
      return "Archived";
    default:
      return status;
  }
}

function formatFollowersChangeMessage(userName: string, oldValue?: string, newValue?: string): string {
  try {
    const oldFollowers = oldValue ? JSON.parse(oldValue) : [];
    const newFollowers = newValue ? JSON.parse(newValue) : [];
    
    const added = newFollowers.filter((id: string) => !oldFollowers.includes(id));
    const removed = oldFollowers.filter((id: string) => !newFollowers.includes(id));
    
    if (added.length > 0 && removed.length > 0) {
      return `${userName} updated the followers list`;
    } else if (added.length > 0) {
      return `${userName} added ${added.length} follower${added.length > 1 ? 's' : ''}`;
    } else if (removed.length > 0) {
      return `${userName} removed ${removed.length} follower${removed.length > 1 ? 's' : ''}`;
    }
    
    return `${userName} updated the followers`;
  } catch {
    return `${userName} updated the followers`;
  }
}

export function getActionColor(action: TaskHistoryAction, field?: string): string {
  // Handle follower changes even when action is UPDATED
  if (field === "followedIds") {
    return "bg-teal-500";
  }

  // Handle service changes even when action is UPDATED
  if (field === "serviceId") {
    return "bg-indigo-500";
  }

  // Handle workspace changes even when action is UPDATED
  if (field === "workspaceId") {
    return "bg-violet-500";
  }

  // Handle confidential changes even when action is UPDATED
  if (field === "isConfidential") {
    return "bg-amber-500";
  }

  switch (action) {
    case TaskHistoryAction.CREATED:
      return "bg-green-500";
    case TaskHistoryAction.STATUS_CHANGED:
      return "bg-blue-500";
    case TaskHistoryAction.ASSIGNEE_CHANGED:
      return "bg-purple-500";
    case TaskHistoryAction.REVIEWER_CHANGED:
      return "bg-purple-600";
    case TaskHistoryAction.SERVICE_CHANGED:
      return "bg-indigo-500";
    case TaskHistoryAction.WORKSPACE_CHANGED:
      return "bg-violet-500";
    case TaskHistoryAction.DUE_DATE_CHANGED:
      return "bg-yellow-500";
    case TaskHistoryAction.ATTACHMENT_ADDED:
    case TaskHistoryAction.ATTACHMENT_REMOVED:
      return "bg-orange-500";
    case TaskHistoryAction.ATTACHMENT_VIEWED:
      return "bg-pink-500";
    case TaskHistoryAction.DESCRIPTION_UPDATED:
    case TaskHistoryAction.NAME_CHANGED:
      return "bg-gray-500";
    case TaskHistoryAction.FOLLOWERS_CHANGED:
      return "bg-teal-500";
    case TaskHistoryAction.CONFIDENTIAL_CHANGED:
      return "bg-amber-500";
    case TaskHistoryAction.ARCHIVED:
      return "bg-red-500";
    default:
      return "bg-gray-400";
  }
}