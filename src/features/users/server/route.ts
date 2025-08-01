import { Hono } from "hono";
import { sessionMiddleware } from "@/lib/session-middleware";

const app = new Hono()
  .get("/",
    sessionMiddleware,
    async (c) => {
      try {
        const prisma = c.get("prisma");
        
        // Get all users with a reasonable limit
        const users = await prisma.user.findMany({
          take: 100, // Limit to 100 users
          orderBy: {
            createdAt: 'desc'
          },
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          }
        });

        // Format the response to match expected format
        const formattedUsers = users.map(user => ({
          id: user.id,
          name: user.name,
          email: user.email,
          status: true, // All users in the database are considered active
        }));

        return c.json({ 
          data: {
            users: formattedUsers,
            total: formattedUsers.length
          }
        });
      } catch (error) {
        console.error("Failed to fetch users:", error);
        return c.json({ error: "Failed to fetch users" }, 500);
      }
    }
  );

export default app;