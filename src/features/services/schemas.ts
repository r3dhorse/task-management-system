import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  workspaceId: z.string(),
  isPublic: z.string().transform((val) => val === "true").default("false"),
  slaDays: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
  includeWeekends: z.string().transform((val) => val === "true").default("false"),
});

export const createServiceClientSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  isPublic: z.boolean().default(false),
  slaDays: z.number().min(1, "SLA days must be at least 1").max(365, "SLA days cannot exceed 365").optional(),
  includeWeekends: z.boolean().default(false),
});

export const updateServiceSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  isPublic: z.string().transform((val) => val === "true").default("false"),
  slaDays: z.string().optional().transform((val) => val ? parseInt(val, 10) : undefined),
  includeWeekends: z.string().transform((val) => val === "true").default("false"),
});

export const updateServiceClientSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  isPublic: z.boolean().default(false),
  slaDays: z.number().min(1, "SLA days must be at least 1").max(365, "SLA days cannot exceed 365").optional(),
  includeWeekends: z.boolean().default(false),
});