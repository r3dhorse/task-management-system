import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { MemberRole } from "@/features/members/types";
import { generateInviteCode } from "@/lib/utils";
import { sessionMiddleware } from "@/lib/session-middleware";
import { createWorkspaceSchema, updateWorkspaceSchema } from "../schemas";
import { z } from "zod";

const app = new Hono()

  .get(
    "/",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const prisma = c.get("prisma");

      const workspaceMembers = await prisma.member.findMany({
        where: {
          userId: user.id,
        },
        include: {
          workspace: true,
        },
        orderBy: {
          workspace: {
            createdAt: 'desc',
          },
        },
      });

      const workspaces = workspaceMembers.map(member => member.workspace);
      
      return c.json({ 
        data: { 
          documents: workspaces, 
          total: workspaces.length 
        } 
      });
    }
  )

  .get(
    "/:workspaceId",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const prisma = c.get("prisma");
      const { workspaceId } = c.req.param();

      // Check if user is a member of this workspace
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

      const workspace = await prisma.workspace.findUnique({
        where: {
          id: workspaceId,
        },
      });

      if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      return c.json({ data: workspace });
    }
  )

  .post(
    "/",
    zValidator("json", createWorkspaceSchema),
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const prisma = c.get("prisma");
      const { name, description } = c.req.valid("json");

      // Check if user is admin (required for workspace creation)
      if (!user.isAdmin) {
        return c.json({ 
          error: "Unauthorized. Only admin users can create workspaces." 
        }, 403);
      }

      // Create workspace and add creator as admin member in a transaction
      const result = await prisma.$transaction(async (tx) => {
        const workspace = await tx.workspace.create({
          data: {
            name,
            description: description || null,
            userId: user.id,
            inviteCode: generateInviteCode(10),
          },
        });

        await tx.member.create({
          data: {
            userId: user.id,
            workspaceId: workspace.id,
            role: MemberRole.ADMIN,
          },
        });

        return workspace;
      });

      return c.json({ data: result });
    }
  )

  .patch(
    "/:workspaceId",
    sessionMiddleware,
    zValidator("form", updateWorkspaceSchema),
    async (c) => {
      const user = c.get("user");
      const prisma = c.get("prisma");
      const { workspaceId } = c.req.param();
      const { name, description } = c.req.valid("form");

      // Check if user is admin of this workspace
      const member = await prisma.member.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId,
          },
        },
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const workspace = await prisma.workspace.update({
        where: {
          id: workspaceId,
        },
        data: {
          name,
          ...(description !== undefined && { description }),
        },
      });

      return c.json({ data: workspace });
    }
  )

  .delete(
    "/:workspaceId",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const prisma = c.get("prisma");
      const { workspaceId } = c.req.param();

      // Check if user is admin of this workspace
      const member = await prisma.member.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId,
          },
        },
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      await prisma.workspace.delete({
        where: {
          id: workspaceId,
        },
      });

      return c.json({ data: { id: workspaceId } });
    }
  )

  .post(
    "/:workspaceId/reset-invite-code",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user");
      const prisma = c.get("prisma");
      const { workspaceId } = c.req.param();

      // Check if user is admin of this workspace
      const member = await prisma.member.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId,
          },
        },
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const workspace = await prisma.workspace.update({
        where: {
          id: workspaceId,
        },
        data: {
          inviteCode: generateInviteCode(10),
        },
      });

      return c.json({ data: workspace });
    }
  )

  .post(
    "/:workspaceId/join",
    sessionMiddleware,
    zValidator("json", z.object({ code: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.param();
      const { code } = c.req.valid("json");
      const user = c.get("user");
      const prisma = c.get("prisma");

      // Check if user is already a member
      const existingMember = await prisma.member.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId,
          },
        },
      });

      if (existingMember) {
        return c.json({ error: "Already a member" }, 400);
      }

      // Get workspace and validate invite code
      const workspace = await prisma.workspace.findUnique({
        where: {
          id: workspaceId,
        },
      });

      if (!workspace) {
        return c.json({ error: "Workspace not found" }, 404);
      }

      if (workspace.inviteCode !== code) {
        return c.json({ error: "Invalid invite code" }, 400);
      }

      // Add user as member
      await prisma.member.create({
        data: {
          workspaceId,
          userId: user.id,
          role: MemberRole.MEMBER,
        },
      });

      return c.json({ data: workspace });
    }
  );


export default app;
