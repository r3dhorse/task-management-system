import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: {
      nodeEnv: process.env.NODE_ENV,
      hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
      hasNextAuthUrl: !!process.env.NEXTAUTH_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      nextAuthUrl: process.env.NEXTAUTH_URL || 'NOT SET',
    },
    database: {
      connected: false,
      error: null as string | null,
    }
  };

  // Test database connection
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database.connected = true;
  } catch (error) {
    checks.status = 'error';
    checks.database.error = error instanceof Error ? error.message : 'Unknown database error';
  }

  const statusCode = checks.status === 'ok' ? 200 : 503;
  return NextResponse.json(checks, { status: statusCode });
}