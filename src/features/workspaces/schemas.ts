import { z } from "zod";

export const createWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  description: z.string().optional(),
  withReviewStage: z.boolean(),
});

export const updateWorkspaceSchema = z.object({
  name: z.string().trim().min(1, "Must be 1 or more characters").optional(),
  description: z.string().optional(),
  withReviewStage: z.boolean().optional(),
});