import { Hono } from "hono";
import { ID, Query, Permission, Role } from "node-appwrite";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { getMember } from "@/features/members/utils";
import { sessionMiddleware } from "@/lib/session-middleware";
import { DATABASE_ID, TASK_MESSAGES_ID } from "@/config";

const app = new Hono()
  .get(
    "/:taskId",
    sessionMiddleware,
    zValidator("param", z.object({ taskId: z.string() })),
    zValidator("query", z.object({ workspaceId: z.string().optional() })),
    async (c) => {
      const { taskId } = c.req.valid("param");
      const { workspaceId } = c.req.valid("query");
      const user = c.get("user");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // If workspaceId is provided, verify membership
      if (workspaceId) {
        const member = await getMember({
          databases: c.get("databases"),
          workspaceId,
          userId: user.$id,
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }
      }

      // Use user's database client to respect Appwrite permissions
      const databases = c.get("databases");

      try {
        const messages = await databases.listDocuments(
          DATABASE_ID,
          TASK_MESSAGES_ID,
          [
            Query.equal("taskId", taskId),
            Query.orderAsc("timestamp"),
          ]
        );

        return c.json({ data: messages });
      } catch (error) {
        console.error("Error fetching task messages:", error);
        return c.json({ 
          error: "Failed to fetch messages", 
          details: error instanceof Error ? error.message : "Unknown error" 
        }, 500);
      }
    },
  )
  .post(
    "/",
    sessionMiddleware,
    zValidator("json", z.object({
      taskId: z.string(),
      content: z.string().max(1000),
      workspaceId: z.string(),
      attachmentId: z.string().optional(),
      attachmentName: z.string().optional(),
      attachmentSize: z.string().optional(),
      attachmentType: z.string().optional(),
    }).refine((data) => {
      // Either content must have text or there must be an attachment
      return data.content.trim().length > 0 || data.attachmentId;
    }, {
      message: "Message must contain either text or an attachment",
    })),
    async (c) => {
      const { 
        taskId, 
        content, 
        workspaceId,
        attachmentId,
        attachmentName,
        attachmentSize,
        attachmentType
      } = c.req.valid("json");
      const user = c.get("user");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const member = await getMember({
        databases: c.get("databases"),
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Use user's database client to respect Appwrite permissions
      const databases = c.get("databases");

      try {
        const messageData: {
          taskId: string;
          senderId: string;
          senderName: string;
          content: string;
          timestamp: string;
          workspaceId: string;
          attachmentId?: string;
          attachmentName?: string;
          attachmentSize?: string;
          attachmentType?: string;
        } = {
          taskId,
          senderId: user.$id,
          senderName: user.name || "Unknown User",
          content: content.trim(),
          timestamp: new Date().toISOString(),
          workspaceId,
        };

        // Add attachment fields if provided
        if (attachmentId) {
          messageData.attachmentId = attachmentId;
          messageData.attachmentName = attachmentName;
          messageData.attachmentSize = attachmentSize;
          messageData.attachmentType = attachmentType;
        }

        const message = await databases.createDocument(
          DATABASE_ID,
          TASK_MESSAGES_ID,
          ID.unique(),
          messageData,
          [
            Permission.read(Role.user(user.$id)),
            Permission.update(Role.user(user.$id)),
            Permission.delete(Role.user(user.$id)),
            Permission.read(Role.any()), // Allow any authenticated user to read
          ]
        );

        return c.json({ data: message });
      } catch (error) {
        console.error("Error creating task message:", error);
        return c.json({ 
          error: "Failed to create message", 
          details: error instanceof Error ? error.message : "Unknown error" 
        }, 500);
      }
    },
  );

export default app;