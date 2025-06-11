import { Hono } from "hono";
import { ID, Query } from "node-appwrite";
import { zValidator } from "@hono/zod-validator";
import { MemberRole } from "@/features/members/types";
import { getMember } from "@/features/members/utils";
import { generateInviteCode } from "@/lib/utils";
import { sessionMiddleware } from "@/lib/session-middleware";
import { DATABASE_ID, MEMBERS_ID, WORKSPACES_ID } from "@/config";
import { createWorkspaceSchema, updateWorkspaceSchema } from "../schemas";
import { z } from "zod"
import { Workspace } from "../types";

const app = new Hono()

  .get(
    "/",
    sessionMiddleware,
    async (c) => {
      const user = c.get("user")
      const databases = c.get("databases");

      const members = await databases.listDocuments(
        DATABASE_ID,
        MEMBERS_ID,
        [Query.equal("userId", user.$id)]
      );

      if (members.total === 0) {
        return c.json({ data: { documents: [], total: 0 } })
      }

      const workspaceIds = members.documents.map((member) => member.workspaceId)

      const workspaces = await databases.listDocuments(
        DATABASE_ID,
        WORKSPACES_ID,
        [
          Query.orderDesc("$createdAt"),
          Query.contains("$id", workspaceIds)
        ]
      );

      return c.json({ data: workspaces });
    }
  )

  .get(
    "/:workspaceId",
    sessionMiddleware,
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");
      const { workspaceId } = c.req.param();

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const workspace = await databases.getDocument<Workspace>(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId
      );

      return c.json({ data: workspace });
    }
  )

  .post(
    "/",
    zValidator("json", createWorkspaceSchema),
    sessionMiddleware,
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");
      const { name, description } = c.req.valid("json")

      // Check if user has admin label (required for workspace creation)
      const isAdmin = user.labels && user.labels.includes("admin");
      
      if (!isAdmin) {
        return c.json({ 
          error: "Unauthorized. Only admin users can create workspaces." 
        }, 403);
      }

      const workspace = await databases.createDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        ID.unique(),
        {
          name,
          description: description || undefined,
          userId: user.$id,
          inviteCode: generateInviteCode(10),
        },
      );

      await databases.createDocument(
        DATABASE_ID,
        MEMBERS_ID,
        ID.unique(),
        {
          userId: user.$id,
          workspaceId: workspace.$id,
          role: MemberRole.ADMIN
        }
      )

      return c.json({ data: workspace });
    }
  )

  .patch(
    "/:workspaceId",
    sessionMiddleware,
    zValidator("form", updateWorkspaceSchema),
    async (c) => {
      const databases = c.get("databases")
      const user = c.get("user")

      const { workspaceId } = c.req.param();
      const { name, description } = c.req.valid("form");

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id
      });
      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const workspace = await databases.updateDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId,
        {
          name,
          ...(description !== undefined && { description })
        }
      );
      return c.json({ data: workspace })
    }

  )

  .delete(
    "/:workspaceId",
    sessionMiddleware,
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");
      const { workspaceId } = c.req.param();
      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401)
      }

      await databases.deleteDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId,
      );

      return c.json({ data: { $id: workspaceId } });
    }
  )

  .post(
    "/:workspaceId/reset-invite-code",
    sessionMiddleware,
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");
      const { workspaceId } = c.req.param();
      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id
      });

      if (!member || member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Unauthorized" }, 401)
      }

      const workspace = await databases.updateDocument(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId,
        {
          inviteCode: generateInviteCode(10),
        }
      );

      return c.json({ data: { $id: workspace } });
    }
  )

  .post(
    "/:workspaceId/join",
    sessionMiddleware,
    zValidator("json", z.object({ code: z.string() })),
    async (c) => {
      const { workspaceId } = c.req.param();
      const { code } = c.req.valid("json");
      const databases = c.get("databases");
      const user = c.get("user");
      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id
      });

      if (member) {
        return c.json({ error: "Already a member" }, 400);
      }

      const workspace = await databases.getDocument<Workspace>(
        DATABASE_ID,
        WORKSPACES_ID,
        workspaceId
      );

      if (workspace.inviteCode !== code) {
        return c.json({ error: "Invalid invite code" }, 400);
      }

      await databases.createDocument(
        DATABASE_ID,
        MEMBERS_ID,
        ID.unique(),
        {
          workspaceId,
          userId: user.$id,
          role: MemberRole.MEMBER,
        },
      );

      return c.json({ data: workspace });
    }

  );


export default app;
