import { z } from "zod"
import { TaskStatus } from "./types"

export const createTaskSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  status: z.nativeEnum(TaskStatus, { required_error: "Required" }),
  workspaceId: z.string().trim().min(1, "Required"),
  serviceId: z.string().trim().min(1, "Service is required"),
  dueDate: z.string().min(1, "Due date is required"),
  assigneeIds: z.string().optional(), // JSON string array of assignee member IDs
  reviewerId: z.string().optional().transform((val) => val === 'undefined' || !val ? undefined : val),
  description: z.string().min(1, "Description is required"),
  attachmentId: z.string().optional().transform((val) => val === 'undefined' || !val ? undefined : val),
  followedIds: z.string().optional(), // JSON string array of follower IDs
  creatorId: z.string().optional(), // User ID of the task creator
  isConfidential: z.boolean().optional(),
}).refine((data) => {
  // If task is confidential, at least one assignee must be present
  if (data.isConfidential) {
    try {
      const assigneeIds = data.assigneeIds ? JSON.parse(data.assigneeIds) : [];
      if (!Array.isArray(assigneeIds) || assigneeIds.length === 0) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}, {
  message: "At least one assignee is required for confidential tasks",
  path: ["assigneeIds"],
});

// Schema for updating tasks (all fields optional except validation)
export const updateTaskSchema = z.object({
  name: z.string().trim().min(1, "Required").optional(),
  status: z.nativeEnum(TaskStatus, { required_error: "Required" }).optional(),
  serviceId: z.string().trim().min(1, "Service is required").optional(),
  workspaceId: z.string().trim().min(1, "Workspace is required").optional(),
  dueDate: z.string().optional(),
  assigneeIds: z.string().optional(), // JSON string array of assignee member IDs
  reviewerId: z.string().optional().transform((val) => val === 'undefined' || !val ? undefined : val),
  description: z.string().optional(),
  attachmentId: z.string().optional().transform((val) => val === 'undefined' || !val ? undefined : val),
  followedIds: z.string().optional(),
  creatorId: z.string().optional(),
  isConfidential: z.boolean().optional(),
}).refine((data) => {
  // If task is confidential, at least one assignee must be present
  if (data.isConfidential) {
    try {
      const assigneeIds = data.assigneeIds ? JSON.parse(data.assigneeIds) : [];
      if (!Array.isArray(assigneeIds) || assigneeIds.length === 0) {
        return false;
      }
    } catch {
      return false;
    }
  }
  return true;
}, {
  message: "At least one assignee is required for confidential tasks",
  path: ["assigneeIds"],
});