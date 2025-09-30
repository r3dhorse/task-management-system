import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Temporary diagnostic endpoint - REMOVE IN PRODUCTION
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      where: {
        email: {
          in: ['superadmin@example.com', 'admin@example.com', 'member@example.com']
        }
      },
      select: {
        id: true,
        email: true,
        name: true,
        isAdmin: true,
        isSuperAdmin: true,
        createdAt: true,
      }
    });

    return NextResponse.json({
      found: users.length,
      users,
      env: {
        hasDbSeedToken: !!process.env.DB_SEED_TOKEN,
        hasNextAuthSecret: !!process.env.NEXTAUTH_SECRET,
        nextAuthUrl: process.env.NEXTAUTH_URL || 'not set',
        nodeEnv: process.env.NODE_ENV,
      }
    });

  } catch (error) {
    console.error('❌ Debug users error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}