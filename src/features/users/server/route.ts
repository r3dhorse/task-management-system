import { Hono } from "hono";
import { sessionMiddleware } from "@/lib/session-middleware";
import { createAdminClient } from "@/lib/appwrite";
import { Query } from "node-appwrite";

const app = new Hono()
  .get("/",
    sessionMiddleware,
    async (c) => {
      try {
        const { users } = await createAdminClient();
        
        // Get all users with a reasonable limit
        const userList = await users.list([
          Query.limit(100), // Adjust limit as needed
          Query.orderDesc("$createdAt")
        ]);

        // Format the response to only include necessary user data
        const formattedUsers = userList.users.map(user => ({
          $id: user.$id,
          name: user.name,
          email: user.email,
          status: user.status,
        }));

        return c.json({ 
          data: {
            users: formattedUsers,
            total: userList.total
          }
        });
      } catch (error) {
        console.error("Failed to fetch users:", error);
        return c.json({ error: "Failed to fetch users" }, 500);
      }
    }
  );

export default app;