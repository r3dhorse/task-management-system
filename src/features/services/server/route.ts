import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { createServiceSchema, updateServiceSchema } from "../schemas";
import { MemberRole } from "@/features/members/types";

const app = new Hono()

  .post(
    "/",
    sessionMiddleware,
    zValidator("form", createServiceSchema),
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { name, workspaceId, isPublic, slaDays, includeWeekends, isRoutinary, routinaryFrequency, routinaryStartDate } = c.req.valid("form");

        // Check if user is admin of the workspace
        const member = await prisma.member.findUnique({
          where: {
            userId_workspaceId: {
              userId: user.id,
              workspaceId,
            },
          },
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        if (member.role !== MemberRole.ADMIN) {
          return c.json({ error: "Only workspace administrators can create services" }, 403);
        }

        // Check if service name already exists in this workspace
        const existingService = await prisma.service.findFirst({
          where: {
            workspaceId,
            name,
          },
        });

        if (existingService) {
          return c.json({ error: "Service name already exists in this workspace" }, 400);
        }

        const service = await prisma.service.create({
          data: {
            name,
            workspaceId,
            isPublic: isPublic || false,
            slaDays,
            includeWeekends: includeWeekends || false,
            // Routinary fields
            isRoutinary: isRoutinary || false,
            routinaryFrequency: isRoutinary ? routinaryFrequency : null,
            routinaryStartDate: isRoutinary ? routinaryStartDate : null,
            routinaryNextRunDate: isRoutinary && routinaryStartDate ? routinaryStartDate : null,
          },
        });

        return c.json({ data: service });
      } catch (error) {
        console.error("Service creation error:", error);
        return c.json({ error: "Failed to create service" }, 500);
      }
    }
  )

  .get(
    "/",
    sessionMiddleware,
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const user = c.get("user");
      const prisma = c.get("prisma");
      const { workspaceId } = c.req.valid("query");

      if (!workspaceId) {
        return c.json({ error: "Missing workspaceId" }, 400);
      }

      // Check if user is a member of the workspace
      const member = await prisma.member.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId,
          },
        },
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Filter services based on user role
      // Visitors can only see public services
      const whereCondition: { workspaceId: string; isPublic?: boolean } = { workspaceId };
      if (member.role === MemberRole.VISITOR) {
        whereCondition.isPublic = true;
      }

      const services = await prisma.service.findMany({
        where: whereCondition,
        orderBy: { createdAt: 'desc' },
      });

      return c.json({ 
        data: {
          documents: services,
          total: services.length,
        }
      });
    }
  )

  .patch(
    "/:serviceId",
    sessionMiddleware,
    zValidator("form", updateServiceSchema),
    async (c) => {
      const prisma = c.get("prisma");
      const user = c.get("user");
      const { serviceId } = c.req.param();
      const { name, isPublic, slaDays, includeWeekends, isRoutinary, routinaryFrequency, routinaryStartDate } = c.req.valid("form");

      const existingService = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!existingService) {
        return c.json({ error: "Service not found" }, 404);
      }

      // Check if user is admin of the workspace
      const member = await prisma.member.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: existingService.workspaceId,
          },
        },
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      if (member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Only workspace administrators can update services" }, 403);
      }

      // Check if service name already exists in this workspace (excluding current service)
      const duplicateService = await prisma.service.findFirst({
        where: {
          workspaceId: existingService.workspaceId,
          name,
          NOT: { id: serviceId },
        },
      });

      if (duplicateService) {
        return c.json({ error: "Service name already exists in this workspace" }, 400);
      }

      // Determine if routinaryNextRunDate needs to be recalculated
      const shouldRecalculateNextRun =
        isRoutinary &&
        routinaryStartDate &&
        (routinaryStartDate.getTime() !== existingService.routinaryStartDate?.getTime() ||
         !existingService.isRoutinary);

      const service = await prisma.service.update({
        where: { id: serviceId },
        data: {
          name,
          isPublic: isPublic || false,
          slaDays,
          includeWeekends: includeWeekends || false,
          // Routinary fields
          isRoutinary: isRoutinary || false,
          routinaryFrequency: isRoutinary ? routinaryFrequency : null,
          routinaryStartDate: isRoutinary ? routinaryStartDate : null,
          routinaryNextRunDate: shouldRecalculateNextRun
            ? routinaryStartDate
            : (isRoutinary ? existingService.routinaryNextRunDate : null),
        },
      });

      return c.json({ data: service });
    }
  )

  .delete(
    "/:serviceId",
    sessionMiddleware,
    async (c) => {
      const prisma = c.get("prisma");
      const user = c.get("user");
      const { serviceId } = c.req.param();

      const existingService = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!existingService) {
        return c.json({ error: "Service not found" }, 404);
      }

      // Only Super Admins can delete services (cascade deletes all tasks)
      if (!user.isSuperAdmin) {
        return c.json({ error: "Only Super Admins can delete services" }, 403);
      }

      // Get task count for logging
      const taskCount = await prisma.task.count({
        where: { serviceId },
      });

      // Cascade delete: Delete all related records in transaction
      await prisma.$transaction(async (tx) => {
        // Get all task IDs for this service
        const tasks = await tx.task.findMany({
          where: { serviceId },
          select: { id: true },
        });
        const taskIds = tasks.map(t => t.id);

        if (taskIds.length > 0) {
          // Delete task-related records first
          await tx.taskHistory.deleteMany({
            where: { taskId: { in: taskIds } },
          });
          await tx.taskAttachment.deleteMany({
            where: { taskId: { in: taskIds } },
          });
          await tx.notification.deleteMany({
            where: { taskId: { in: taskIds } },
          });
          await tx.taskMessage.deleteMany({
            where: { taskId: { in: taskIds } },
          });
          await tx.taskReview.deleteMany({
            where: { taskId: { in: taskIds } },
          });
          // Delete sub-tasks first (tasks with parentTaskId)
          await tx.task.deleteMany({
            where: { parentTaskId: { in: taskIds } },
          });
          // Delete main tasks
          await tx.task.deleteMany({
            where: { serviceId },
          });
        }

        // Finally delete the service
        await tx.service.delete({
          where: { id: serviceId },
        });
      });

      console.log(`Service ${serviceId} deleted with ${taskCount} associated tasks (cascade)`);

      return c.json({ data: { id: serviceId, deletedTasks: taskCount } });
    }
  );

export default app;