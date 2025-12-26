import { z } from "zod";

// Server-side schema for creating a checklist
export const createChecklistSchema = z.object({
  serviceId: z.string().min(1, "Service ID is required"),
});

// ============ Section Schemas ============

// Schema for creating a section
export const createChecklistSectionSchema = z.object({
  name: z.string().trim().min(1, "Section name is required").max(100, "Section name too long"),
});

// Client-side schema for creating a section
export const createChecklistSectionClientSchema = z.object({
  name: z.string().trim().min(1, "Section name is required").max(100, "Section name too long"),
});

// Schema for updating a section
export const updateChecklistSectionSchema = z.object({
  name: z.string().trim().min(1, "Section name is required").max(100, "Section name too long").optional(),
});

// Schema for reordering sections
export const reorderChecklistSectionsSchema = z.object({
  sectionIds: z.array(z.string()).min(1, "At least one section ID is required"),
});

// ============ Item Schemas ============

// Server-side schema for creating a checklist item (now requires sectionId context)
export const createChecklistItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
  requirePhoto: z.boolean().optional().default(false),
  requireRemarks: z.boolean().optional().default(false),
});

// Client-side schema for creating a checklist item
export const createChecklistItemClientSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255, "Title too long"),
  description: z.string().max(1000, "Description too long").optional(),
  requirePhoto: z.boolean().optional().default(false),
  requireRemarks: z.boolean().optional().default(false),
});

// Server-side schema for updating a checklist item
export const updateChecklistItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(255, "Title too long").optional(),
  description: z.string().max(1000, "Description too long").optional().nullable(),
  order: z.number().optional(),
  requirePhoto: z.boolean().optional(),
  requireRemarks: z.boolean().optional(),
});

// Schema for reordering checklist items within a section
export const reorderChecklistItemsSchema = z.object({
  itemIds: z.array(z.string()).min(1, "At least one item ID is required"),
});

// Schema for moving an item between sections
export const moveChecklistItemSchema = z.object({
  targetSectionId: z.string().min(1, "Target section ID is required"),
  newOrder: z.number().min(0, "Order must be non-negative"),
});

// ============ Task Checklist Schemas ============

// Valid statuses for checklist items
export const checklistItemStatusValues = ['pending', 'passed', 'failed'] as const;
export type ChecklistItemStatusValue = typeof checklistItemStatusValues[number];

// Schema for task checklist item in JSON field
export const taskChecklistItemSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().optional(),
  order: z.number(),
  requirePhoto: z.boolean().optional(),
  requireRemarks: z.boolean().optional(),
  status: z.enum(checklistItemStatusValues).default('pending'),
  completedAt: z.string().optional(),
  completedBy: z.string().optional(),
  remarks: z.string().max(1000).optional(),
  photoUrl: z.string().optional(),
});

// Schema for task checklist section in JSON field
export const taskChecklistSectionSchema = z.object({
  id: z.string(),
  name: z.string(),
  order: z.number(),
  items: z.array(taskChecklistItemSchema),
});

// New schema for task checklist with sections
export const taskChecklistSchema = z.object({
  sections: z.array(taskChecklistSectionSchema),
});

// Legacy schema for backward compatibility (flat items)
export const legacyTaskChecklistSchema = z.object({
  items: z.array(taskChecklistItemSchema),
});

// Schema for updating task checklist (accepts new format with sections)
export const updateTaskChecklistSchema = z.object({
  sections: z.array(taskChecklistSectionSchema),
});
