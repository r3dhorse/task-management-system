import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import {
  createChecklistSchema,
  createChecklistSectionSchema,
  updateChecklistSectionSchema,
  reorderChecklistSectionsSchema,
  createChecklistItemSchema,
  updateChecklistItemSchema,
  reorderChecklistItemsSchema,
  moveChecklistItemSchema,
} from "../schemas";
import { MemberRole } from "@/features/members/types";

const app = new Hono()

  // Get checklist for a service (with sections and items)
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

      // Get checklist with sections and items
      const checklist = await prisma.checklist.findUnique({
        where: { serviceId },
        include: {
          sections: {
            orderBy: { order: 'asc' },
            include: {
              items: {
                orderBy: { order: 'asc' },
              },
            },
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
            sections: {
              include: {
                items: true,
              },
            },
          },
        });

        return c.json({ data: checklist });
      } catch (error) {
        console.error("Checklist creation error:", error);
        return c.json({ error: "Failed to create checklist" }, 500);
      }
    }
  )

  // ============ Section Endpoints ============

  // Create section
  .post(
    "/:checklistId/sections",
    sessionMiddleware,
    zValidator("json", createChecklistSectionSchema),
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { checklistId } = c.req.param();
        const { name } = c.req.valid("json");

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
          return c.json({ error: "Only workspace administrators can create sections" }, 403);
        }

        // Get max order for sections
        const maxOrderSection = await prisma.checklistSection.findFirst({
          where: { checklistId },
          orderBy: { order: 'desc' },
        });
        const nextOrder = (maxOrderSection?.order ?? -1) + 1;

        const section = await prisma.checklistSection.create({
          data: {
            checklistId,
            name,
            order: nextOrder,
          },
          include: {
            items: true,
          },
        });

        return c.json({ data: section });
      } catch (error) {
        console.error("Section creation error:", error);
        return c.json({ error: "Failed to create section" }, 500);
      }
    }
  )

  // Update section
  .patch(
    "/:checklistId/sections/:sectionId",
    sessionMiddleware,
    zValidator("json", updateChecklistSectionSchema),
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { checklistId, sectionId } = c.req.param();
        const { name } = c.req.valid("json");

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
          return c.json({ error: "Only workspace administrators can update sections" }, 403);
        }

        // Check if section exists
        const existingSection = await prisma.checklistSection.findUnique({
          where: { id: sectionId },
        });

        if (!existingSection || existingSection.checklistId !== checklistId) {
          return c.json({ error: "Section not found" }, 404);
        }

        const section = await prisma.checklistSection.update({
          where: { id: sectionId },
          data: { name },
          include: {
            items: {
              orderBy: { order: 'asc' },
            },
          },
        });

        return c.json({ data: section });
      } catch (error) {
        console.error("Section update error:", error);
        return c.json({ error: "Failed to update section" }, 500);
      }
    }
  )

  // Delete section (cascade deletes items)
  .delete(
    "/:checklistId/sections/:sectionId",
    sessionMiddleware,
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { checklistId, sectionId } = c.req.param();

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
          return c.json({ error: "Only workspace administrators can delete sections" }, 403);
        }

        // Check if section exists
        const existingSection = await prisma.checklistSection.findUnique({
          where: { id: sectionId },
        });

        if (!existingSection || existingSection.checklistId !== checklistId) {
          return c.json({ error: "Section not found" }, 404);
        }

        await prisma.checklistSection.delete({
          where: { id: sectionId },
        });

        return c.json({ data: { id: sectionId } });
      } catch (error) {
        console.error("Section delete error:", error);
        return c.json({ error: "Failed to delete section" }, 500);
      }
    }
  )

  // Reorder sections
  .put(
    "/:checklistId/sections/reorder",
    sessionMiddleware,
    zValidator("json", reorderChecklistSectionsSchema),
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { checklistId } = c.req.param();
        const { sectionIds } = c.req.valid("json");

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
          return c.json({ error: "Only workspace administrators can reorder sections" }, 403);
        }

        // Update order for each section
        await prisma.$transaction(
          sectionIds.map((sectionId, index) =>
            prisma.checklistSection.update({
              where: { id: sectionId },
              data: { order: index },
            })
          )
        );

        // Fetch updated checklist
        const updatedChecklist = await prisma.checklist.findUnique({
          where: { id: checklistId },
          include: {
            sections: {
              orderBy: { order: 'asc' },
              include: {
                items: {
                  orderBy: { order: 'asc' },
                },
              },
            },
          },
        });

        return c.json({ data: updatedChecklist });
      } catch (error) {
        console.error("Section reorder error:", error);
        return c.json({ error: "Failed to reorder sections" }, 500);
      }
    }
  )

  // ============ Item Endpoints ============

  // Add item to section
  .post(
    "/:checklistId/sections/:sectionId/items",
    sessionMiddleware,
    zValidator("json", createChecklistItemSchema),
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { checklistId, sectionId } = c.req.param();
        const { title, description, requirePhoto, requireRemarks } = c.req.valid("json");

        // Get checklist with service
        const checklist = await prisma.checklist.findUnique({
          where: { id: checklistId },
          include: { service: true },
        });

        if (!checklist) {
          return c.json({ error: "Checklist not found" }, 404);
        }

        // Verify section belongs to this checklist
        const section = await prisma.checklistSection.findUnique({
          where: { id: sectionId },
        });

        if (!section || section.checklistId !== checklistId) {
          return c.json({ error: "Section not found" }, 404);
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

        // Get max order for items in this section
        const maxOrderItem = await prisma.checklistItem.findFirst({
          where: { sectionId },
          orderBy: { order: 'desc' },
        });
        const nextOrder = (maxOrderItem?.order ?? -1) + 1;

        const item = await prisma.checklistItem.create({
          data: {
            sectionId,
            title,
            description,
            order: nextOrder,
            requirePhoto: requirePhoto ?? false,
            requireRemarks: requireRemarks ?? false,
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
    "/:checklistId/sections/:sectionId/items/:itemId",
    sessionMiddleware,
    zValidator("json", updateChecklistItemSchema),
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { checklistId, sectionId, itemId } = c.req.param();
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

        // Check if item exists and belongs to the section
        const existingItem = await prisma.checklistItem.findUnique({
          where: { id: itemId },
        });

        if (!existingItem || existingItem.sectionId !== sectionId) {
          return c.json({ error: "Checklist item not found" }, 404);
        }

        // Filter out undefined values to prevent Prisma errors
        const updateData: Record<string, unknown> = {};
        if (updates.title !== undefined) updateData.title = updates.title;
        if (updates.description !== undefined) updateData.description = updates.description;
        if (updates.order !== undefined) updateData.order = updates.order;
        if (updates.requirePhoto !== undefined) updateData.requirePhoto = updates.requirePhoto;
        if (updates.requireRemarks !== undefined) updateData.requireRemarks = updates.requireRemarks;

        const item = await prisma.checklistItem.update({
          where: { id: itemId },
          data: updateData,
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
    "/:checklistId/sections/:sectionId/items/:itemId",
    sessionMiddleware,
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { checklistId, sectionId, itemId } = c.req.param();

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

        // Check if item exists and belongs to the section
        const existingItem = await prisma.checklistItem.findUnique({
          where: { id: itemId },
        });

        if (!existingItem || existingItem.sectionId !== sectionId) {
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

  // Reorder items within a section
  .put(
    "/:checklistId/sections/:sectionId/items/reorder",
    sessionMiddleware,
    zValidator("json", reorderChecklistItemsSchema),
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { checklistId, sectionId } = c.req.param();
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

        // Fetch updated section
        const updatedSection = await prisma.checklistSection.findUnique({
          where: { id: sectionId },
          include: {
            items: {
              orderBy: { order: 'asc' },
            },
          },
        });

        return c.json({ data: updatedSection });
      } catch (error) {
        console.error("Checklist item reorder error:", error);
        return c.json({ error: "Failed to reorder checklist items" }, 500);
      }
    }
  )

  // Move item between sections
  .put(
    "/:checklistId/items/:itemId/move",
    sessionMiddleware,
    zValidator("json", moveChecklistItemSchema),
    async (c) => {
      try {
        const prisma = c.get("prisma");
        const user = c.get("user");
        const { checklistId, itemId } = c.req.param();
        const { targetSectionId, newOrder } = c.req.valid("json");

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
          return c.json({ error: "Only workspace administrators can move checklist items" }, 403);
        }

        // Verify target section belongs to this checklist
        const targetSection = await prisma.checklistSection.findUnique({
          where: { id: targetSectionId },
        });

        if (!targetSection || targetSection.checklistId !== checklistId) {
          return c.json({ error: "Target section not found" }, 404);
        }

        // Check if item exists
        const existingItem = await prisma.checklistItem.findUnique({
          where: { id: itemId },
          include: { section: true },
        });

        if (!existingItem || existingItem.section.checklistId !== checklistId) {
          return c.json({ error: "Checklist item not found" }, 404);
        }

        // Move item to new section with new order
        const item = await prisma.checklistItem.update({
          where: { id: itemId },
          data: {
            sectionId: targetSectionId,
            order: newOrder,
          },
        });

        return c.json({ data: item });
      } catch (error) {
        console.error("Checklist item move error:", error);
        return c.json({ error: "Failed to move checklist item" }, 500);
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

        // Delete checklist (cascade deletes sections and items)
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
