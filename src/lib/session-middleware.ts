import "server-only";
import { createMiddleware } from "hono/factory";
import { getCurrentUser } from "@/lib/auth-utils";
import { prisma } from "@/lib/prisma";

type AdditionalContext = {
  Variables: {
    user: {
      id: string;
      email: string;
      name?: string;
      isAdmin?: boolean;
      isSuperAdmin?: boolean;
    };
    prisma: typeof prisma;
  };
};

export const sessionMiddleware = createMiddleware<AdditionalContext>(
  async (c, next) => {
    try {
      const user = await getCurrentUser();

      if (!user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      c.set("user", {
        ...user,
        name: user.name || undefined
      });
      c.set("prisma", prisma);

      await next();
    } catch (error) {
      console.error("Session middleware error:", error);
      return c.json({ error: "Invalid session" }, 401);
    }
  },
);