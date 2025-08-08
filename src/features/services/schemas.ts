import { z } from "zod";

export const createServiceSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  workspaceId: z.string(),
  isPublic: z.string().transform((val) => val === "true").default("false"),
});

export const createServiceClientSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  isPublic: z.boolean().default(false),
});

export const updateServiceSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  isPublic: z.string().transform((val) => val === "true").default("false"),
});

export const updateServiceClientSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  isPublic: z.boolean().default(false),
});