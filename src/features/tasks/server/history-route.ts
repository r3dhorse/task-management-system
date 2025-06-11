import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { DATABASE_ID, TASK_HISTORY_ID, TASKS_ID } from "@/config";
import { ID, Query } from "node-appwrite";
import { z } from "zod";
import { TaskHistoryEntry, TaskHistoryAction } from "../types/history";
import { getMember } from "@/features/members/utils";
import { createAdminClient } from "@/lib/appwrite";

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
      const databases = c.get("databases");
      const user = c.get("user");
      const { taskId } = c.req.param();

      // Validate taskId format
      if (!taskId || taskId.length > 36 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
        return c.json({ error: "Invalid task ID format" }, 400);
      }

      // Verify task exists and user has access
      let task;
      try {
        task = await databases.getDocument(DATABASE_ID, TASKS_ID, taskId);
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'type' in error && error.type === 'document_not_found') {
          return c.json({ error: "Task not found" }, 404);
        }
        throw error;
      }
      
      const member = await getMember({
        databases,
        workspaceId: task.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get history entries
      console.log("Fetching history from collection:", TASK_HISTORY_ID);
      const history = await databases.listDocuments<TaskHistoryEntry>(
        DATABASE_ID,
        TASK_HISTORY_ID,
        [
          Query.equal("taskId", taskId),
          Query.orderDesc("$createdAt"),
          Query.limit(100)
        ]
      );
      
      console.log("Found history entries:", history.documents.length);
      return c.json({ data: history });
    }
  )
  .post(
    "/",
    sessionMiddleware,
    zValidator("json", createHistorySchema),
    async (c) => {
      const { users } = await createAdminClient();
      const databases = c.get("databases");
      const user = c.get("user");
      const { taskId, action, field, oldValue, newValue, details } = c.req.valid("json");

      // Validate taskId format
      if (!taskId || taskId.length > 36 || !/^[a-zA-Z0-9_-]+$/.test(taskId)) {
        return c.json({ error: "Invalid task ID format" }, 400);
      }

      // Verify task exists and user has access
      let task;
      try {
        task = await databases.getDocument(DATABASE_ID, TASKS_ID, taskId);
      } catch (error: unknown) {
        if (error && typeof error === 'object' && 'type' in error && error.type === 'document_not_found') {
          return c.json({ error: "Task not found" }, 404);
        }
        throw error;
      }
      
      const member = await getMember({
        databases,
        workspaceId: task.workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get user info
      const userInfo = await users.get(user.$id);

      // Create history entry
      const historyEntry = await databases.createDocument(
        DATABASE_ID,
        TASK_HISTORY_ID,
        ID.unique(),
        {
          taskId,
          userId: user.$id,
          userName: userInfo.name,
          action,
          field,
          oldValue,
          newValue,
          details,
          timestamp: new Date().toISOString(),
        }
      );

      return c.json({ data: historyEntry });
    }
  );

export default app;