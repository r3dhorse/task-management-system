import { createAdminClient } from "@/lib/appwrite";
import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono"
import { z } from "zod"
import { getMember } from "../utils";
import { DATABASE_ID, MEMBERS_ID } from "@/config";
import { Query, ID } from "node-appwrite";
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
      const { users } = await createAdminClient();
      const databases = c.get("databases");
      const user = c.get("user");
      const { workspaceId, search } = c.req.valid("query");

      // Check if user is admin of the workspace
      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized - Admin access required" }, 401);
      }

      try {
        // Get existing workspace members to exclude them from search
        const existingMembers = await databases.listDocuments(
          DATABASE_ID,
          MEMBERS_ID,
          [Query.equal("workspaceId", workspaceId)]
        );
        
        const existingUserIds = existingMembers.documents.map(m => m.userId);

        // Search users by email or name (Appwrite doesn't have great search, so we'll get a broader list)
        const searchResults = await users.list([
          Query.limit(50) // Limit to prevent too many results
        ]);

        // Filter and search client-side for better control
        const filteredUsers = searchResults.users
          .filter(u => 
            !existingUserIds.includes(u.$id) && // Not already a member
            u.$id !== user.$id && // Not current user
            (u.email.toLowerCase().includes(search.toLowerCase()) ||
             u.name.toLowerCase().includes(search.toLowerCase()))
          )
          .slice(0, 10) // Limit to 10 results for better UX
          .map(u => ({
            $id: u.$id,
            name: u.name,
            email: u.email,
            avatar: u.prefs?.avatar || null
          }));

        return c.json({ data: filteredUsers });
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
      const { users } = await createAdminClient();
      const databases = c.get("databases");
      const user = c.get("user");
      const { workspaceId, userId, role } = c.req.valid("json");

      // Check if current user is admin of the workspace
      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized - Admin access required" }, 401);
      }

      try {
        // Check if user exists in Appwrite
        const targetUser = await users.get(userId);
        
        // Check if user is already a member
        const existingMember = await databases.listDocuments(
          DATABASE_ID,
          MEMBERS_ID,
          [
            Query.equal("workspaceId", workspaceId),
            Query.equal("userId", userId)
          ]
        );

        if (existingMember.total > 0) {
          return c.json({ error: "User is already a member of this workspace" }, 400);
        }

        // Add user as member
        const newMember = await databases.createDocument(
          DATABASE_ID,
          MEMBERS_ID,
          ID.unique(),
          {
            userId,
            workspaceId,
            role
          }
        );

        // Return populated member data
        return c.json({ 
          data: {
            ...newMember,
            name: targetUser.name,
            email: targetUser.email
          }
        });
      } catch (error) {
        console.error("Add member error:", error);
        if (error && typeof error === 'object' && 'type' in error && error.type === 'user_not_found') {
          return c.json({ error: "User not found" }, 404);
        }
        return c.json({ error: "Failed to add user to workspace" }, 500);
      }
    }
  )

  .get(
    "/",
    sessionMiddleware,
    zValidator("query", z.object({ workspaceId: z.string() })),
    async (c) => {
      const { users } = await createAdminClient();
      const databases = c.get("databases");
      const user = c.get("user");
      const { workspaceId } = c.req.valid("query");

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401)
      }

      const members = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_ID,
        [Query.equal("workspaceId", workspaceId)]
      );

      const populatedMembers = await Promise.all(
        members.documents.map(async (member) => {
          try {
            const user = await users.get(member.userId);
            return {
              ...member,
              name: user.name,
              email: user.email,
            };
          } catch {
            return {
              ...member,
              name: "Unknown",
              email: "Unavailable",
            };
          }
        })
      );



      return c.json({
        data: {
          ...members,
          documents: populatedMembers,
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
      const databases = c.get("databases");

      const memberToDelete = await databases.getDocument(
        DATABASE_ID,
        MEMBERS_ID,
        memberId
      );

      const allMembersInWorkspace = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_ID,
        [Query.equal("workspaceId", memberToDelete.workspaceId)]
      );

      const member = await getMember({
        databases,
        workspaceId: memberToDelete.workspaceId,
        userId: user.$id
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      if (member.$id !== memberToDelete.$id && member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      if (allMembersInWorkspace.total === 1) {
        return c.json({ error: "Cannot delete the only member" }, 400);
      }

      await databases.deleteDocument(
        DATABASE_ID,
        MEMBERS_ID,
        memberId,
      );

      return c.json({ data: { $id: memberToDelete.$id } });
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
      const databases = c.get("databases");

      const memberToUpdate = await databases.getDocument(
        DATABASE_ID,
        MEMBERS_ID,
        memberId
      );

      const allMembersInWorkspace = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_ID,
        [Query.equal("workspaceId", memberToUpdate.workspaceId)]
      );

      const member = await getMember({
        databases,
        workspaceId: memberToUpdate.workspaceId,
        userId: user.$id
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      if (member.$id !== memberToUpdate.$id && member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      if (allMembersInWorkspace.total === 1) {
        return c.json({ error: "Cannot downgrade the only member" }, 400);
      }

      await databases.updateDocument(
        DATABASE_ID,
        MEMBERS_ID,
        memberId,
        {
          role
        }
      );

      return c.json({ data: { $id: memberToUpdate.$id } });
    }
  )

export default app;