import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { loginSchema, changePasswordSchema, forgotPasswordSchema, resetPasswordSchema } from "../schemas";
import { createAdminClient } from "@/lib/appwrite";
import { deleteCookie, setCookie } from "hono/cookie"
import { AUTH_COOKIE } from "../constants";
import { sessionMiddleware } from "@/lib/session-middleware";
import { forgotPasswordRateLimiter, formatRemainingTime } from "@/lib/rate-limiter";

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
      try {
        const { email, password } = c.req.valid("json");
        const { account } = await createAdminClient();
        const session = await account.createEmailPasswordSession(
          email,
          password,
        );

        setCookie(c, AUTH_COOKIE, session.secret, {
          path: "/",
          httpOnly: true,
          secure: process.env.NODE_ENV === "production",
          sameSite: "strict",
          maxAge: 60 * 60 * 24 * 30,
        });

        return c.json({ success: true })
      } catch {
        return c.json({ error: "Invalid email or password" }, 401)
      }
    }
  )


  .post("/logout",
    sessionMiddleware,
    async (c) => {
      const account = c.get("account")
      deleteCookie(c, AUTH_COOKIE);
      await account.deleteSession("current")

      return c.json({ success: true });
    }
  )

  .post("/change-password",
    sessionMiddleware,
    zValidator("json", changePasswordSchema),
    async (c) => {
      try {
        const { oldPassword, newPassword } = c.req.valid("json");
        const account = c.get("account");

        await account.updatePassword(newPassword, oldPassword);

        return c.json({ success: true });
      } catch {
        return c.json({ error: "Invalid current password or failed to update password" }, 400);
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
        
        const { account } = await createAdminClient();
        
        const redirectUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reset-password`;
        await account.createRecovery(email, redirectUrl);

        return c.json({ success: true, message: "Password recovery email sent" });
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
        const { userId, secret, password } = c.req.valid("json");
        const { account } = await createAdminClient();
        
        await account.updateRecovery(userId, secret, password);

        return c.json({ success: true, message: "Password reset successfully" });
      } catch (error) {
        console.error("Reset password error:", error);
        return c.json({ error: "Failed to reset password. The link may be expired or invalid." }, 400);
      }
    }
  );

export default app;