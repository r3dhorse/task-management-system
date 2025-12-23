import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  createChecklistSchema,
  createChecklistItemSchema,
  updateChecklistItemSchema,
  reorderChecklistItemsSchema
} from "../schemas";
import { MemberRole } from "@/features/members/types";

const app = new Hono()

  // Get checklist for a service
  .get(
    "/",
    sessionMiddleware,
    zValidator("query", z.object({ serviceId: z.string() })),
    async (c) => {
      const user = c.get("user");
      const prisma = c.get("prisma");
      const { serviceId } = c.req.valid("query");

      if (!serviceId) {
        return c.json({ error: "Missing serviceId" }, 400);
      }

      // Get the service to check workspace membership
      const service = await prisma.service.findUnique({
        where: { id: serviceId },
      });

      if (!service) {
        return c.json({ error: "Service not found" }, 404);
      }

      // Check if user is a member of the workspace
      const member = await prisma.member.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: service.workspaceId,
          },
        },
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Get checklist with items
      const checklist = await prisma.checklist.findUnique({
        where: { serviceId },
        include: {
          items: {
            orderBy: { order: 'asc' },
          },
        },
      });

      return c.json({ data: checklist });
    }
  )

  // Create checklist for a service
  .post(
    "/",
    sessionMiddleware,
    zValidator("json", createChecklistSchema),
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { serviceId } = c.req.valid("json");

        // Get the service to check workspace membership
        const service = await prisma.service.findUnique({
          where: { id: serviceId },
        });

        if (!service) {
          return c.json({ error: "Service not found" }, 404);
        }

        // Check if user is admin of the workspace
        const member = await prisma.member.findUnique({
          where: {
            userId_workspaceId: {
              userId: user.id,
              workspaceId: service.workspaceId,
            },
          },
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        if (member.role !== MemberRole.ADMIN && !user.isSuperAdmin) {
          return c.json({ error: "Only workspace administrators can create checklists" }, 403);
        }

        // Check if checklist already exists for this service
        const existingChecklist = await prisma.checklist.findUnique({
          where: { serviceId },
        });

        if (existingChecklist) {
          return c.json({ error: "Checklist already exists for this service" }, 400);
        }

        const checklist = await prisma.checklist.create({
          data: {
            serviceId,
          },
          include: {
            items: true,
          },
        });

        return c.json({ data: checklist });
      } catch (error) {
        console.error("Checklist creation error:", error);
        return c.json({ error: "Failed to create checklist" }, 500);
      }
    }
  )

  // Add item to checklist
  .post(
    "/:checklistId/items",
    sessionMiddleware,
    zValidator("json", createChecklistItemSchema),
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { checklistId } = c.req.param();
        const { title, description } = c.req.valid("json");

        // Get checklist with service
        const checklist = await prisma.checklist.findUnique({
          where: { id: checklistId },
          include: { service: true },
        });

        if (!checklist) {
          return c.json({ error: "Checklist not found" }, 404);
        }

        // Check if user is admin of the workspace
        const member = await prisma.member.findUnique({
          where: {
            userId_workspaceId: {
              userId: user.id,
              workspaceId: checklist.service.workspaceId,
            },
          },
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        if (member.role !== MemberRole.ADMIN && !user.isSuperAdmin) {
          return c.json({ error: "Only workspace administrators can add checklist items" }, 403);
        }

        // Get max order for the checklist
        const maxOrderItem = await prisma.checklistItem.findFirst({
          where: { checklistId },
          orderBy: { order: 'desc' },
        });
        const nextOrder = (maxOrderItem?.order ?? -1) + 1;

        const item = await prisma.checklistItem.create({
          data: {
            checklistId,
            title,
            description,
            order: nextOrder,
          },
        });

        return c.json({ data: item });
      } catch (error) {
        console.error("Checklist item creation error:", error);
        return c.json({ error: "Failed to create checklist item" }, 500);
      }
    }
  )

  // Update checklist item
  .patch(
    "/:checklistId/items/:itemId",
    sessionMiddleware,
    zValidator("json", updateChecklistItemSchema),
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { checklistId, itemId } = c.req.param();
        const updates = c.req.valid("json");

        // Get checklist with service
        const checklist = await prisma.checklist.findUnique({
          where: { id: checklistId },
          include: { service: true },
        });

        if (!checklist) {
          return c.json({ error: "Checklist not found" }, 404);
        }

        // Check if user is admin of the workspace
        const member = await prisma.member.findUnique({
          where: {
            userId_workspaceId: {
              userId: user.id,
              workspaceId: checklist.service.workspaceId,
            },
          },
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        if (member.role !== MemberRole.ADMIN && !user.isSuperAdmin) {
          return c.json({ error: "Only workspace administrators can update checklist items" }, 403);
        }

        // Check if item exists
        const existingItem = await prisma.checklistItem.findUnique({
          where: { id: itemId },
        });

        if (!existingItem || existingItem.checklistId !== checklistId) {
          return c.json({ error: "Checklist item not found" }, 404);
        }

        const item = await prisma.checklistItem.update({
          where: { id: itemId },
          data: updates,
        });

        return c.json({ data: item });
      } catch (error) {
        console.error("Checklist item update error:", error);
        return c.json({ error: "Failed to update checklist item" }, 500);
      }
    }
  )

  // Delete checklist item
  .delete(
    "/:checklistId/items/:itemId",
    sessionMiddleware,
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { checklistId, itemId } = c.req.param();

        // Get checklist with service
        const checklist = await prisma.checklist.findUnique({
          where: { id: checklistId },
          include: { service: true },
        });

        if (!checklist) {
          return c.json({ error: "Checklist not found" }, 404);
        }

        // Check if user is admin of the workspace
        const member = await prisma.member.findUnique({
          where: {
            userId_workspaceId: {
              userId: user.id,
              workspaceId: checklist.service.workspaceId,
            },
          },
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        if (member.role !== MemberRole.ADMIN && !user.isSuperAdmin) {
          return c.json({ error: "Only workspace administrators can delete checklist items" }, 403);
        }

        // Check if item exists
        const existingItem = await prisma.checklistItem.findUnique({
          where: { id: itemId },
        });

        if (!existingItem || existingItem.checklistId !== checklistId) {
          return c.json({ error: "Checklist item not found" }, 404);
        }

        await prisma.checklistItem.delete({
          where: { id: itemId },
        });

        return c.json({ data: { id: itemId } });
      } catch (error) {
        console.error("Checklist item delete error:", error);
        return c.json({ error: "Failed to delete checklist item" }, 500);
      }
    }
  )

  // Reorder checklist items
  .put(
    "/:checklistId/items/reorder",
    sessionMiddleware,
    zValidator("json", reorderChecklistItemsSchema),
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { checklistId } = c.req.param();
        const { itemIds } = c.req.valid("json");

        // Get checklist with service
        const checklist = await prisma.checklist.findUnique({
          where: { id: checklistId },
          include: { service: true },
        });

        if (!checklist) {
          return c.json({ error: "Checklist not found" }, 404);
        }

        // Check if user is admin of the workspace
        const member = await prisma.member.findUnique({
          where: {
            userId_workspaceId: {
              userId: user.id,
              workspaceId: checklist.service.workspaceId,
            },
          },
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        if (member.role !== MemberRole.ADMIN && !user.isSuperAdmin) {
          return c.json({ error: "Only workspace administrators can reorder checklist items" }, 403);
        }

        // Update order for each item
        await prisma.$transaction(
          itemIds.map((itemId, index) =>
            prisma.checklistItem.update({
              where: { id: itemId },
              data: { order: index },
            })
          )
        );

        // Fetch updated checklist
        const updatedChecklist = await prisma.checklist.findUnique({
          where: { id: checklistId },
          include: {
            items: {
              orderBy: { order: 'asc' },
            },
          },
        });

        return c.json({ data: updatedChecklist });
      } catch (error) {
        console.error("Checklist reorder error:", error);
        return c.json({ error: "Failed to reorder checklist items" }, 500);
      }
    }
  )

  // Delete checklist
  .delete(
    "/:checklistId",
    sessionMiddleware,
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { checklistId } = c.req.param();

        // Get checklist with service
        const checklist = await prisma.checklist.findUnique({
          where: { id: checklistId },
          include: { service: true },
        });

        if (!checklist) {
          return c.json({ error: "Checklist not found" }, 404);
        }

        // Check if user is admin of the workspace
        const member = await prisma.member.findUnique({
          where: {
            userId_workspaceId: {
              userId: user.id,
              workspaceId: checklist.service.workspaceId,
            },
          },
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401);
        }

        if (member.role !== MemberRole.ADMIN && !user.isSuperAdmin) {
          return c.json({ error: "Only workspace administrators can delete checklists" }, 403);
        }

        // Delete checklist (cascade deletes items)
        await prisma.checklist.delete({
          where: { id: checklistId },
        });

        return c.json({ data: { id: checklistId } });
      } catch (error) {
        console.error("Checklist delete error:", error);
        return c.json({ error: "Failed to delete checklist" }, 500);
      }
    }
  );

export default app;
