import { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Log environment variable status (server-side only)
if (typeof window === 'undefined') {
  console.log('🔍 Auth Configuration Check:')
  console.log('  - NEXTAUTH_SECRET:', process.env.NEXTAUTH_SECRET ? '✅ Set' : '❌ Missing')
  console.log('  - NEXTAUTH_URL:', process.env.NEXTAUTH_URL || '❌ Missing')
  console.log('  - DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing')
  console.log('  - NODE_ENV:', process.env.NODE_ENV)

  if (!process.env.NEXTAUTH_SECRET) {
    console.warn('⚠️  WARNING: NEXTAUTH_SECRET is not set - authentication will not work properly')
  }

  if (!process.env.DATABASE_URL) {
    console.warn('⚠️  WARNING: DATABASE_URL is not set - database operations will fail')
  }
}

export const authOptions: NextAuthOptions = {
  // No adapter needed for JWT strategy
  secret: process.env.NEXTAUTH_SECRET || 'fallback-secret-for-build-time',
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
          console.log('🔐 Auth attempt starting...')

          if (!credentials) {
            console.log('❌ No credentials provided')
            return null
          }

          const result = loginSchema.safeParse(credentials)
          if (!result.success) {
            console.log('❌ Invalid credentials format:', result.error)
            return null
          }

          const { email, password } = result.data
          console.log('🔍 Looking up user:', email)

          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user) {
            console.log('❌ User not found:', email)
            return null
          }

          if (!user.password) {
            console.log('❌ User has no password set:', email)
            return null
          }

          console.log('🔑 Verifying password for user:', email)
          const isPasswordValid = await bcrypt.compare(password, user.password)

          if (!isPasswordValid) {
            console.log('❌ Invalid password for user:', email)
            return null
          }

          console.log('✅ Auth successful for user:', email)
          return {
            id: user.id,
            email: user.email,
            name: user.name,
            isAdmin: user.isAdmin,
            isSuperAdmin: user.isSuperAdmin,
          }
        } catch (error) {
          console.error('❌ Auth error:', error)
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