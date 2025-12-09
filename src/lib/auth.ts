import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Validate critical environment variables at startup (server-side only)
if (typeof window === 'undefined') {
  // In production, NEXTAUTH_SECRET is required
  if (process.env.NODE_ENV === 'production' && !process.env.NEXTAUTH_SECRET) {
    throw new Error('CRITICAL: NEXTAUTH_SECRET must be set in production environment')
  }

  if (process.env.NODE_ENV === 'production' && !process.env.DATABASE_URL) {
    throw new Error('CRITICAL: DATABASE_URL must be set in production environment')
  }
}

// Get secret with build-time fallback (only used during next build, not runtime)
const getAuthSecret = () => {
  if (process.env.NEXTAUTH_SECRET) {
    return process.env.NEXTAUTH_SECRET
  }
  // Only allow fallback during build phase, not runtime
  if (process.env.NODE_ENV === 'production') {
    throw new Error('NEXTAUTH_SECRET is required in production')
  }
  return 'dev-only-secret-do-not-use-in-production'
}

export const authOptions: NextAuthOptions = {
  // No adapter needed for JWT strategy
  secret: getAuthSecret(),
  useSecureCookies: process.env.NODE_ENV === 'production',
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials) {
            return null
          }

          const result = loginSchema.safeParse(credentials)
          if (!result.success) {
            return null
          }

          const { email, password } = result.data

          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user || !user.password) {
            return null
          }

          const isPasswordValid = await bcrypt.compare(password, user.password)

          if (!isPasswordValid) {
            return null
          }

          return {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
            isSuperAdmin: user.isSuperAdmin,
          }
        } catch {
          return null
        }
      }
    })
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id
        token.isAdmin = user.isAdmin
        token.isSuperAdmin = user.isSuperAdmin
      }
      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id || token.sub!
        session.user.isAdmin = token.isAdmin
        session.user.isSuperAdmin = token.isSuperAdmin
      }
      return session
    },
  },
  pages: {
    signIn: "/sign-in",
  },
  debug: process.env.NODE_ENV === 'development',
}