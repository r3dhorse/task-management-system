import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "../schemas";
import { deleteCookie } from "hono/cookie"
import { AUTH_COOKIE } from "../constants";
import { sessionMiddleware } from "@/lib/session-middleware";
import { forgotPasswordRateLimiter, formatRemainingTime } from "@/lib/rate-limiter";
import bcrypt from "bcryptjs";

const app = new Hono()

  .get("/current",
    sessionMiddleware,
    (c) => {
      const user = c.get("user");
      return c.json({ data: user })
    }
  )

  .post("/login",
    zValidator("json", loginSchema),
    async (c) => {
      // Legacy Appwrite login - now handled by NextAuth
      return c.json({ error: "This endpoint is deprecated. Please use NextAuth." }, 410)
    }
  )


  .post("/logout",
    sessionMiddleware,
    async (c) => {
      deleteCookie(c, AUTH_COOKIE);

      return c.json({ success: true });
    }
  )

  .post("/change-password",
    sessionMiddleware,
    zValidator("json", changePasswordSchema),
    async (c) => {
      try {
        const { oldPassword, newPassword } = c.req.valid("json");
        const prisma = c.get("prisma");
        const user = c.get("user");

        // Get the current user's password from database
        const currentUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: { password: true }
        });

        if (!currentUser || !currentUser.password) {
          return c.json({ error: "User not found or no password set" }, 400);
        }

        // Verify old password
        const isOldPasswordValid = await bcrypt.compare(oldPassword, currentUser.password);
        if (!isOldPasswordValid) {
          return c.json({ error: "Current password is incorrect" }, 400);
        }

        // Hash new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 12);

        // Update password in database
        await prisma.user.update({
          where: { id: user.id },
          data: { password: hashedNewPassword }
        });

        return c.json({ success: true });
      } catch (error) {
        console.error("Change password error:", error);
        return c.json({ error: "Failed to update password" }, 500);
      }
    }
  )

  .post("/forgot-password",
    zValidator("json", forgotPasswordSchema),
    async (c) => {
      try {
        const { email } = c.req.valid("json");
        
        // Check rate limit
        const emailLower = email.toLowerCase();
        if (!forgotPasswordRateLimiter.isAllowed(emailLower)) {
          const remainingTime = forgotPasswordRateLimiter.getRemainingTime(emailLower);
          const formattedTime = formatRemainingTime(remainingTime);
          return c.json({ 
            error: `You can only request a password reset once per day. Please try again in ${formattedTime}.` 
          }, 429);
        }
        
        // Legacy Appwrite recovery - now handled by NextAuth
        return c.json({ error: "This endpoint is deprecated. Password recovery is not available." }, 410);
      } catch (error) {
        console.error("Forgot password error:", error);
        
        // If the request fails, reset the rate limit for this email
        const { email } = c.req.valid("json");
        forgotPasswordRateLimiter.reset(email.toLowerCase());
        
        return c.json({ error: "Failed to send recovery email. Please check your email address." }, 400);
      }
    }
  )

  .post("/reset-password",
    zValidator("json", resetPasswordSchema),
    async (c) => {
      try {
        // Legacy Appwrite reset - now handled by NextAuth
        return c.json({ error: "This endpoint is deprecated. Password reset is not available." }, 410);
      } catch (error) {
        console.error("Reset password error:", error);
        return c.json({ error: "Failed to reset password. The link may be expired or invalid." }, 400);
      }
    }
  );

export default app;