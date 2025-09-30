import { NextAuthOptions } from "next-auth"
import { Adapter } from "next-auth/adapters"
import CredentialsProvider from "next-auth/providers/credentials"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "./prisma"
import bcrypt from "bcryptjs"
import { z } from "zod"

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

// Validate required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  console.error('❌ NEXTAUTH_SECRET is not set')
  throw new Error('NEXTAUTH_SECRET environment variable is required')
}

if (!process.env.NEXTAUTH_URL) {
  console.error('❌ NEXTAUTH_URL is not set')
}

if (!process.env.DATABASE_URL) {
  console.error('❌ DATABASE_URL is not set')
  throw new Error('DATABASE_URL environment variable is required')
}

export const authOptions: NextAuthOptions = {
  adapter: PrismaAdapter(prisma) as Adapter,
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          if (!credentials) return null

          const result = loginSchema.safeParse(credentials)
          if (!result.success) return null

          const { email, password } = result.data

          const user = await prisma.user.findUnique({
            where: { email },
          })

          if (!user || !user.password) return null

          const isPasswordValid = await bcrypt.compare(password, user.password)
          if (!isPasswordValid) return null

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