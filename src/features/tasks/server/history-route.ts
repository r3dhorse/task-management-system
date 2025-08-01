import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { TaskHistoryAction } from "../types/history";
import { getMember } from "@/features/members/utils";

const createHistorySchema = z.object({
  taskId: z.string(),
  action: z.nativeEnum(TaskHistoryAction),
  field: z.string().optional(),
  oldValue: z.string().optional(),
  newValue: z.string().optional(),
  details: z.string().optional(),
});

const app = new Hono()
  .get(
    "/:taskId",
    sessionMiddleware,
    async (c) => {
      console.log("Task history GET request for taskId:", c.req.param().taskId);
      const prisma = c.get("prisma");
      const user = c.get("user");
      const { taskId } = c.req.param();

      // Validate taskId format
      if (!taskId || taskId.length > 36 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
        return c.json({ error: "Invalid task ID format" }, 400);
      }

      // Verify task exists and user has access
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        return c.json({ error: "Task not found" }, 404);
      }
      
      const member = await getMember({
        prisma,
        workspaceId: task.workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get history entries
      console.log("Fetching history from database for taskId:", taskId);
      const history = await prisma.taskHistory.findMany({
        where: { taskId },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        take: 100
      });
      
      console.log("Found history entries:", history.length);
      
      // Transform to match expected format
      const transformedHistory = history.map(entry => ({
        id: entry.id,
        taskId: entry.taskId,
        userId: entry.userId,
        userName: entry.user.name,
        action: entry.action,
        field: entry.field,
        oldValue: entry.oldValue,
        newValue: entry.newValue,
        details: entry.details,
        timestamp: entry.createdAt.toISOString(),
      }));

      return c.json({ 
        data: { 
          documents: transformedHistory,
          total: transformedHistory.length 
        } 
      });
    }
  )
  .post(
    "/",
    sessionMiddleware,
    zValidator("json", createHistorySchema),
    async (c) => {
      const prisma = c.get("prisma");
      const user = c.get("user");
      const { taskId, action, field, oldValue, newValue, details } = c.req.valid("json");

      // Validate taskId format
      if (!taskId || taskId.length > 36 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
        return c.json({ error: "Invalid task ID format" }, 400);
      }

      // Verify task exists and user has access
      const task = await prisma.task.findUnique({
        where: { id: taskId },
      });

      if (!task) {
        return c.json({ error: "Task not found" }, 404);
      }
      
      const member = await getMember({
        prisma,
        workspaceId: task.workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Create history entry
      const historyEntry = await prisma.taskHistory.create({
        data: {
          taskId,
          userId: user.id,
          action,
          field,
          oldValue,
          newValue,
          details,
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
            }
          }
        }
      });

      // Transform to match expected format
      const transformedEntry = {
        id: historyEntry.id,
        taskId: historyEntry.taskId,
        userId: historyEntry.userId,
        userName: historyEntry.user.name,
        action: historyEntry.action,
        field: historyEntry.field,
        oldValue: historyEntry.oldValue,
        newValue: historyEntry.newValue,
        details: historyEntry.details,
        timestamp: historyEntry.createdAt.toISOString(),
      };

      return c.json({ data: transformedEntry });
    }
  );

export default app;