import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  workspaceId: z.string(),
});

export const updateServiceSchema = z.object({
  name: z.string().trim().min(1, "Required"),
});