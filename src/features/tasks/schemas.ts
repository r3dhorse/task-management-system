import { z } from "zod"
import { TaskStatus } from "./types"

export const createTaskSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  status: z.nativeEnum(TaskStatus, { required_error: "Required" }),
  workspaceId: z.string().trim().min(1, "Required"),
  serviceId: z.string().trim().min(1, "Service is required"),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional().transform((val) => val === 'undefined' || !val ? undefined : val),
  description: z.string().optional(),
  attachmentId: z.string().optional().transform((val) => val === 'undefined' || !val ? undefined : val),
  followedIds: z.string().optional(), // JSON string array of follower IDs
  creatorId: z.string().optional(), // User ID of the task creator
  isConfidential: z.boolean().optional(),
}).refine((data) => {
  // If task is confidential, assignee must be required and not "unassigned"
  if (data.isConfidential && (!data.assigneeId || data.assigneeId === "unassigned" || data.assigneeId === "")) {
    return false;
  }
  return true;
}, {
  message: "Assignee is required for confidential tasks",
  path: ["assigneeId"], // This will show the error on the assigneeId field
});

// Schema for updating tasks (all fields optional except validation)
export const updateTaskSchema = z.object({
  name: z.string().trim().min(1, "Required").optional(),
  status: z.nativeEnum(TaskStatus, { required_error: "Required" }).optional(),
  serviceId: z.string().trim().min(1, "Service is required").optional(),
  dueDate: z.string().optional(),
  assigneeId: z.string().optional().transform((val) => val === 'undefined' || !val ? undefined : val),
  description: z.string().optional(),
  attachmentId: z.string().optional().transform((val) => val === 'undefined' || !val ? undefined : val),
  followedIds: z.string().optional(),
  creatorId: z.string().optional(),
  isConfidential: z.boolean().optional(),
}).refine((data) => {
  // If task is confidential, assignee must be required and not "unassigned"
  if (data.isConfidential && (!data.assigneeId || data.assigneeId === "unassigned" || data.assigneeId === "")) {
    return false;
  }
  return true;
}, {
  message: "Assignee is required for confidential tasks",
  path: ["assigneeId"],
});