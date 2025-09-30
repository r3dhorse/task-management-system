import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Log environment variable status for debugging
if (typeof window === 'undefined') {
  const hasDbUrl = !!process.env.DATABASE_URL
  console.log('🔍 Prisma initialization:', {
    hasDatabaseUrl: hasDbUrl,
    nodeEnv: process.env.NODE_ENV,
  })

  if (!hasDbUrl) {
    console.warn('⚠️ DATABASE_URL not set - database operations will fail')
  }
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient()

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma