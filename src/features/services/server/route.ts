import { DATABASE_ID, SERVICES_ID } from "@/config";
import { getMember } from "@/features/members/utils";
import { sessionMiddleware } from "@/lib/session-middleware";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { ID, Query } from "node-appwrite";
import { z } from "zod";
import { createServiceSchema, updateServiceSchema } from "../schemas"
import { Service } from "../types";
import { MemberRole } from "@/features/members/types";


const app = new Hono()

  .post(
    "/",
    sessionMiddleware,
    zValidator("form", createServiceSchema),
    async (c) => {
      try {
        const databases = c.get("databases");
        const user = c.get("user");
        const { name, workspaceId } = c.req.valid("form")

        const member = await getMember({
          databases,
          workspaceId,
          userId: user.$id
        });

        if (!member) {
          return c.json({ error: "Unauthorized" }, 401)
        }

        if (member.role !== MemberRole.ADMIN) {
          return c.json({ error: "Only workspace administrators can create services" }, 403)
        }

        // Check if service name already exists in this workspace
        const existingServices = await databases.listDocuments(
          DATABASE_ID,
          SERVICES_ID,
          [
            Query.equal("workspaceId", workspaceId),
            Query.equal("name", name),
          ],
        );

        if (existingServices.documents.length > 0) {
          return c.json({ error: "Service name already exists in this workspace" }, 400);
        }

        const service = await databases.createDocument(
          DATABASE_ID,
          SERVICES_ID,
          ID.unique(),
          {
            name,
            workspaceId,
          },
        );

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
      const databases = c.get("databases");

      const { workspaceId } = c.req.valid("query");

      if (!workspaceId) {
        return c.json({ error: "Missing workspaceId" }, 400);
      }

      const member = await getMember({
        databases,
        workspaceId,
        userId: user.$id,
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const services = await databases.listDocuments(
        DATABASE_ID,
        SERVICES_ID,
        [
          Query.equal("workspaceId", workspaceId),
          Query.orderDesc("$createdAt"),
        ],
      );

      return c.json({ data: services });
    }
  )

  .patch(
    "/:serviceId",
    sessionMiddleware,
    zValidator("form", updateServiceSchema),
    async (c) => {
      const databases = c.get("databases")
      const user = c.get("user")

      const { serviceId } = c.req.param();
      const { name } = c.req.valid("form");

      const existingService = await databases.getDocument<Service>(
        DATABASE_ID,
        SERVICES_ID,
        serviceId,
      );

      const member = await getMember({
        databases,
        workspaceId: existingService.workspaceId,
        userId: user.$id
      });
      if (!member) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      if (member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Only workspace administrators can update services" }, 403);
      }

      // Check if service name already exists in this workspace (excluding current service)
      const existingServices = await databases.listDocuments(
        DATABASE_ID,
        SERVICES_ID,
        [
          Query.equal("workspaceId", existingService.workspaceId),
          Query.equal("name", name),
          Query.notEqual("$id", serviceId),
        ],
      );

      if (existingServices.documents.length > 0) {
        return c.json({ error: "Service name already exists in this workspace" }, 400);
      }

      const service = await databases.updateDocument(
        DATABASE_ID,
        SERVICES_ID,
        serviceId,
        {
          name
        }
      );
      return c.json({ data: service })
    }

  )

  .delete(
    "/:serviceId",
    sessionMiddleware,
    async (c) => {
      const databases = c.get("databases");
      const user = c.get("user");
      const { serviceId } = c.req.param();

      const existingService = await databases.getDocument<Service>(
        DATABASE_ID,
        SERVICES_ID,
        serviceId,
      );

      const member = await getMember({
        databases,
        workspaceId: existingService.workspaceId,
        userId: user.$id
      });

      if (!member) {
        return c.json({ error: "Unauthorized" }, 401)
      }

      if (member.role !== MemberRole.ADMIN) {
        return c.json({ error: "Only workspace administrators can delete services" }, 403)
      }

      await databases.deleteDocument(
        DATABASE_ID,
        SERVICES_ID,
        serviceId,
      );

      return c.json({ data: { $id: existingService.$id } });
    }
  )
export default app;