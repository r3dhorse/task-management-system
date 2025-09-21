import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import { MemberRole } from "../types";

const app = new Hono()

  .get(
    "/search-users",
    sessionMiddleware,
    zValidator("query", z.object({ 
      workspaceId: z.string(),
      search: z.string().min(1).max(50)
    })),
    async (c) => {
      const prisma = c.get("prisma");
      const user = c.get("user");
      const { workspaceId, search } = c.req.valid("query");

      // Check if user is admin of the workspace
      const member = await prisma.member.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId,
          },
        },
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized - Admin access required" }, 401);
      }

      try {
        // Get existing workspace members to exclude them from search
        const existingMembers = await prisma.member.findMany({
          where: { workspaceId },
          select: { userId: true },
        });
        
        const existingUserIds = existingMembers.map(m => m.userId);

        // Search users by email or name
        const searchResults = await prisma.user.findMany({
          where: {
            AND: [
              {
                id: {
                  notIn: [...existingUserIds, user.id], // Exclude existing members and current user
                },
              },
              {
                OR: [
                  { email: { contains: search, mode: 'insensitive' } },
                  { name: { contains: search, mode: 'insensitive' } },
                ],
              },
            ],
          },
          take: 10,
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
          },
        });

        return c.json({ data: searchResults });
      } catch (error) {
        console.error("User search error:", error);
        return c.json({ error: "Failed to search users" }, 500);
      }
    }
  )

  .post(
    "/add-user",
    sessionMiddleware,
    zValidator("json", z.object({ 
      workspaceId: z.string(),
      userId: z.string(),
      role: z.nativeEnum(MemberRole).optional().default(MemberRole.MEMBER)
    })),
    async (c) => {
      const prisma = c.get("prisma");
      const user = c.get("user");
      const { workspaceId, userId, role } = c.req.valid("json");

      // Check if current user is admin of the workspace
      const member = await prisma.member.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId,
          },
        },
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized - Admin access required" }, 401);
      }

      try {
        // Check if user exists
        const targetUser = await prisma.user.findUnique({
          where: { id: userId },
        });
        
        if (!targetUser) {
          return c.json({ error: "User not found" }, 404);
        }

        // Check if user is already a member
        const existingMember = await prisma.member.findUnique({
          where: {
            userId_workspaceId: {
              userId,
              workspaceId,
            },
          },
        });

        if (existingMember) {
          return c.json({ error: "User is already a member of this workspace" }, 400);
        }

        // Add user as member
        const newMember = await prisma.member.create({
          data: {
            userId,
            workspaceId,
            role,
          },
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        });

        // Return populated member data
        return c.json({ 
          data: {
            id: newMember.id,
            userId: newMember.userId,
            workspaceId: newMember.workspaceId,
            role: newMember.role,
            joinedAt: newMember.joinedAt,
            name: newMember.user.name,
            email: newMember.user.email,
          }
        });
      } catch (error) {
        console.error("Add member error:", error);
        return c.json({ error: "Failed to add user to workspace" }, 500);
      }
    }
  )

  .get(
    "/",
    sessionMiddleware,
    zValidator("query", z.object({
      workspaceId: z.string(),
      page: z.coerce.number().min(1).default(1).optional(),
      limit: z.coerce.number().min(1).max(100).default(6).optional(),
      role: z.nativeEnum(MemberRole).optional(),
    })),
    async (c) => {
      const prisma = c.get("prisma");
      const user = c.get("user");
      const { workspaceId, page = 1, limit = 6, role } = c.req.valid("query");

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

      // Build where clause with optional role filter
      const whereClause: { workspaceId: string; role?: MemberRole } = { workspaceId };
      if (role) {
        whereClause.role = role;
      }

      // Get total count for pagination
      const totalCount = await prisma.member.count({
        where: whereClause,
      });

      // Calculate pagination values
      const skip = (page - 1) * limit;
      const totalPages = Math.ceil(totalCount / limit);

      const members = await prisma.member.findMany({
        where: whereClause,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          joinedAt: 'asc',
        },
        skip,
        take: limit,
      });

      const populatedMembers = members.map((member) => ({
        id: member.id,
        userId: member.userId,
        workspaceId: member.workspaceId,
        role: member.role,
        joinedAt: member.joinedAt,
        name: member.user.name || "Unknown",
        email: member.user.email,
      }));

      return c.json({
        data: {
          documents: populatedMembers,
          total: totalCount,
          page,
          limit,
          totalPages,
          hasMore: page < totalPages,
        },
      });
    }
  )

  .delete(
    "/:memberId",
    sessionMiddleware,
    async (c) => {
      const { memberId } = c.req.param();
      const user = c.get("user");
      const prisma = c.get("prisma");

      const memberToDelete = await prisma.member.findUnique({
        where: { id: memberId },
      });

      if (!memberToDelete) {
        return c.json({ error: "Member not found" }, 404);
      }

      // Check if current user is authorized
      const currentMember = await prisma.member.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: memberToDelete.workspaceId,
          },
        },
      });

      if (!currentMember) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Only admins can delete other members, members can delete themselves
      if (currentMember.id !== memberToDelete.id && currentMember.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Check if this is the last member
      const memberCount = await prisma.member.count({
        where: { workspaceId: memberToDelete.workspaceId },
      });

      if (memberCount === 1) {
        return c.json({ error: "Cannot delete the only member" }, 400);
      }

      // Check if this is the last admin
      if (memberToDelete.role === MemberRole.ADMIN) {
        const adminCount = await prisma.member.count({
          where: {
            workspaceId: memberToDelete.workspaceId,
            role: MemberRole.ADMIN,
          },
        });

        if (adminCount === 1) {
          return c.json({ error: "Cannot delete the only admin" }, 400);
        }
      }

      await prisma.member.delete({
        where: { id: memberId },
      });

      return c.json({ data: { id: memberId } });
    }
  )

  .patch(
    "/:memberId",
    sessionMiddleware,
    zValidator("json", z.object({ role: z.nativeEnum(MemberRole) })),
    async (c) => {
      const { memberId } = c.req.param();
      const { role } = c.req.valid("json");
      const user = c.get("user");
      const prisma = c.get("prisma");

      const memberToUpdate = await prisma.member.findUnique({
        where: { id: memberId },
      });

      if (!memberToUpdate) {
        return c.json({ error: "Member not found" }, 404);
      }

      // Check if current user is admin
      const currentMember = await prisma.member.findUnique({
        where: {
          userId_workspaceId: {
            userId: user.id,
            workspaceId: memberToUpdate.workspaceId,
          },
        },
      });

      if (!currentMember || currentMember.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized - Admin access required" }, 401);
      }

      // Prevent downgrading the last admin
      if (memberToUpdate.role === MemberRole.ADMIN && role !== MemberRole.ADMIN) {
        const adminCount = await prisma.member.count({
          where: {
            workspaceId: memberToUpdate.workspaceId,
            role: MemberRole.ADMIN,
          },
        });

        if (adminCount === 1) {
          return c.json({ error: "Cannot downgrade the only admin" }, 400);
        }
      }

      const updatedMember = await prisma.member.update({
        where: { id: memberId },
        data: { role },
      });

      return c.json({ data: { id: updatedMember.id } });
    }
  );

export default app;