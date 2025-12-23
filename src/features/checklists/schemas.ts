import { z } from "zod";

// Server-side schema for creating a checklist
export const createChecklistSchema = z.object({
  serviceId: z.string().min(1, "Service ID is required"),
});

// Server-side schema for creating a checklist item
export const createChecklistItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
});

// Client-side schema for creating a checklist item
export const createChecklistItemClientSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
});

// Server-side schema for updating a checklist item
export const updateChecklistItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255, "Title too long").optional(),
  description: z.string().max(1000, "Description too long").optional().nullable(),
  order: z.number().optional(),
});

// Schema for reordering checklist items
export const reorderChecklistItemsSchema = z.object({
  itemIds: z.array(z.string()).min(1, "At least one item ID is required"),
});

// Valid statuses for checklist items
export const checklistItemStatusValues = ['pending', 'passed', 'failed'] as const;
export type ChecklistItemStatusValue = typeof checklistItemStatusValues[number];

// Schema for task checklist JSON field
export const taskChecklistItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number(),
  status: z.enum(checklistItemStatusValues).default('pending'),
  completedAt: z.string().optional(),
  completedBy: z.string().optional(),
});

export const taskChecklistSchema = z.object({
  items: z.array(taskChecklistItemSchema),
});

// Schema for updating task checklist
export const updateTaskChecklistSchema = z.object({
  items: z.array(taskChecklistItemSchema),
});
