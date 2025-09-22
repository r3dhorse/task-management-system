import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";

import { getMember } from "@/features/members/utils";
import { sessionMiddleware } from "@/lib/session-middleware";

const app = new Hono()
  .get(
    "/",
    sessionMiddleware,
    zValidator("query", z.object({ 
      workspaceId: z.string(),
      taskId: z.string().optional()
    })),
    async (c) => {
      const user = c.get("user");
      const prisma = c.get("prisma");
      const { workspaceId, taskId } = c.req.valid("query");
      
      
      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const member = await getMember({
        prisma,
        workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // If taskId is provided, get messages for that specific task
      if (taskId) {
        // Verify the task exists and belongs to the workspace
        const task = await prisma.task.findFirst({
          where: {
            id: taskId,
            workspaceId,
          },
        });

        if (!task) {
          return c.json({ error: "Task not found" }, 404);
        }

        try {
          const messages = await prisma.taskMessage.findMany({
            where: {
              taskId,
              workspaceId,
            },
            include: {
              sender: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  image: true,
                }
              }
            },
            orderBy: {
              createdAt: 'asc'
            }
          });

          // Transform messages to match expected format
          const transformedMessages = messages.map(message => ({
            id: message.id,
            taskId: message.taskId,
            senderId: message.senderId,
            workspaceId: message.workspaceId,
            content: message.content,
            timestamp: message.createdAt.toISOString(),
            attachmentId: message.attachmentId,
            attachmentName: message.attachmentName,
            attachmentSize: message.attachmentSize,
            attachmentType: message.attachmentType,
            sender: message.sender,
          }));

          return c.json({ 
            data: {
              documents: transformedMessages,
              total: transformedMessages.length,
            }
          });
        } catch (error) {
          console.error("Error fetching task messages:", error);
          return c.json({ 
            error: "Failed to fetch messages", 
            details: error instanceof Error ? error.message : "Unknown error" 
          }, 500);
        }
      }
      
      // If no taskId provided, return empty messages (for general workspace messages)
      return c.json({ 
        data: {
          documents: [],
          total: 0,
        }
      });
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
      const prisma = c.get("prisma");

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const member = await getMember({
        prisma,
        workspaceId,
        userId: user.id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Verify the task exists and belongs to the workspace
      const task = await prisma.task.findFirst({
        where: {
          id: taskId,
          workspaceId,
        },
      });

      if (!task) {
        return c.json({ error: "Task not found" }, 404);
      }

      try {
        const message = await prisma.taskMessage.create({
          data: {
            taskId,
            senderId: user.id,
            workspaceId,
            content: content.trim(),
            attachmentId,
            attachmentName,
            attachmentSize,
            attachmentType,
          },
          include: {
            sender: {
              select: {
                id: true,
                name: true,
                email: true,
                image: true,
              }
            }
          }
        });

        // Transform to match expected format
        const transformedMessage = {
          id: message.id,
          taskId: message.taskId,
          senderId: message.senderId,
          workspaceId: message.workspaceId,
          content: message.content,
          timestamp: message.createdAt.toISOString(),
          attachmentId: message.attachmentId,
          attachmentName: message.attachmentName,
          attachmentSize: message.attachmentSize,
          attachmentType: message.attachmentType,
          sender: message.sender,
        };

        return c.json({ data: transformedMessage });
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