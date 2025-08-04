import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { z } from "zod";
import { sessionMiddleware } from "@/lib/session-middleware";
import { getWorkspaceMember } from "@/lib/auth-utils";

const app = new Hono()
  .get(
    "/",
    sessionMiddleware,
    zValidator(
      "query",
      z.object({
        page: z.string().optional().transform(val => val ? parseInt(val) : 1),
        limit: z.string().optional().transform(val => val ? parseInt(val) : 20),
        type: z.enum(["MENTION", "NEW_MESSAGE", "TASK_ASSIGNED", "TASK_UPDATE", "TASK_COMMENT"]).optional(),
      })
    ),
    async (c) => {
      const user = c.get("user");
      const prisma = c.get("prisma");
      const { page, limit, type } = c.req.valid("query");

      try {
        const skip = (page - 1) * limit;
        
        const where = {
          userId: user.id,
          ...(type && { type }),
        };

        // Get total count for pagination
        const totalCount = await prisma.notification.count({ where });

        const notifications = await prisma.notification.findMany({
          where,
          include: {
            task: {
              select: {
                id: true,
                name: true,
              },
            },
            taskMessage: {
              select: {
                id: true,
                content: true,
              },
            },
            mentioner: {
              select: {
                id: true,
                name: true,
              },
            },
            workspace: {
              select: {
                id: true,
                name: true,
              },
            },
          },
          orderBy: {
            createdAt: "desc",
          },
          skip,
          take: limit,
        });

        const totalPages = Math.ceil(totalCount / limit);

        return c.json({
          data: {
            documents: notifications,
            total: totalCount,
            page,
            limit,
            totalPages,
            hasNext: page < totalPages,
            hasPrev: page > 1,
          },
        });
      } catch (error) {
        console.error("Failed to fetch notifications:", error);
        return c.json({ error: "Failed to fetch notifications" }, 500);
      }
    }
  )
  .post(
    "/read",
    sessionMiddleware,
    zValidator(
      "json",
      z.object({
        notificationIds: z.array(z.string()).optional(),
        taskId: z.string().optional(),
        markAll: z.boolean().optional(),
      })
    ),
    async (c) => {
      const user = c.get("user");
      const prisma = c.get("prisma");
      const { notificationIds, taskId, markAll } = c.req.valid("json");

      try {
        const where = {
          userId: user.id,
          isRead: false,
          ...(notificationIds && notificationIds.length > 0 && { id: { in: notificationIds } }),
          ...(taskId && { taskId }),
        };

        if (!notificationIds?.length && !taskId && !markAll) {
          return c.json({ error: "Must specify notification IDs, task ID, or mark all" }, 400);
        }

        const updatedNotifications = await prisma.notification.updateMany({
          where,
          data: {
            isRead: true,
            readAt: new Date(),
          },
        });

        return c.json({
          data: {
            updatedCount: updatedNotifications.count,
          },
        });
      } catch (error) {
        console.error("Failed to mark notifications as read:", error);
        return c.json({ error: "Failed to mark notifications as read" }, 500);
      }
    }
  )
  .get("/count", sessionMiddleware, async (c) => {
    const user = c.get("user");
    const prisma = c.get("prisma");

    try {
      const unreadCount = await prisma.notification.count({
        where: {
          userId: user.id,
          isRead: false,
        },
      });

      return c.json({
        data: {
          count: unreadCount,
        },
      });
    } catch (error) {
      console.error("Failed to fetch notification count:", error);
      return c.json({ error: "Failed to fetch notification count" }, 500);
    }
  })
  .post(
    "/create-mention",
    sessionMiddleware,
    zValidator(
      "json",
      z.object({
        userId: z.string(),
        type: z.string(),
        title: z.string(),
        message: z.string(),
        workspaceId: z.string(),
        taskId: z.string().optional(),
        messageId: z.string().optional(),
        mentionedBy: z.string().optional(),
      })
    ),
    async (c) => {
      const prisma = c.get("prisma");
      const data = c.req.valid("json");

      try {
        // Verify the user creating the notification has access to the workspace
        const member = await getWorkspaceMember(data.workspaceId, c.get("user").id);

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        // Create the notification
        const notification = await prisma.notification.create({
          data: {
            userId: data.userId,
            type: data.type as "MENTION" | "NEW_MESSAGE" | "TASK_ASSIGNED" | "TASK_UPDATE" | "TASK_COMMENT",
            title: data.title,
            message: data.message,
            workspaceId: data.workspaceId,
            taskId: data.taskId,
            messageId: data.messageId,
            mentionedBy: data.mentionedBy,
          },
          include: {
            task: {
              select: {
                id: true,
                name: true,
              },
            },
            taskMessage: {
              select: {
                id: true,
                content: true,
              },
            },
            mentioner: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        });

        return c.json({
          data: notification,
        });
      } catch (error) {
        console.error("Failed to create mention notification:", error);
        return c.json({ error: "Failed to create notification" }, 500);
      }
    }
  );

export default app;