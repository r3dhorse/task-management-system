import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  description: z.string().optional(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Must be 1 or more characters").optional(),
  description: z.string().optional(),
});

// KPI weights schema for configuration
export const kpiWeightsSchema = z.object({
  kpiCompletionWeight: z.number().min(0).max(100),
  kpiProductivityWeight: z.number().min(0).max(100),
  kpiSlaWeight: z.number().min(0).max(100),
  kpiCollaborationWeight: z.number().min(0).max(100),
  kpiReviewWeight: z.number().min(0).max(100),
}).refine((data) => {
  const total = data.kpiCompletionWeight + data.kpiProductivityWeight +
               data.kpiSlaWeight + data.kpiCollaborationWeight + data.kpiReviewWeight;
  return Math.abs(total - 100) <= 0.1; // Allow small floating point differences (up to 0.1%)
}, {
  message: "All KPI weights must sum to 100%",
  path: ["kpiCompletionWeight"], // Show error on first field
});

// Extended update schema with KPI weights
export const updateWorkspaceWithKpiSchema = updateWorkspaceSchema.merge(
  z.object({
    kpiCompletionWeight: z.number().min(0).max(100).optional(),
    kpiProductivityWeight: z.number().min(0).max(100).optional(),
    kpiSlaWeight: z.number().min(0).max(100).optional(),
    kpiCollaborationWeight: z.number().min(0).max(100).optional(),
    kpiReviewWeight: z.number().min(0).max(100).optional(),
  })
);