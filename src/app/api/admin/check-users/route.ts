import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Diagnostic endpoint to check user data
export async function GET(request: NextRequest) {
  try {
    // Security check: require a special token
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.DB_SEED_TOKEN;

    if (!expectedToken) {
      return NextResponse.json(
        { error: 'DB_SEED_TOKEN not configured' },
        { status: 503 }
      );
    }

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get all test users
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
        password: true,
      }
    });

    // Test password verification
    const testResults = await Promise.all(users.map(async (user) => {
      const testPassword = user.email === 'superadmin@example.com' ? 'super123'
        : user.email === 'admin@example.com' ? 'admin123'
        : 'member123';

      const isValid = user.password ? await bcrypt.compare(testPassword, user.password) : false;

      return {
        email: user.email,
        name: user.name,
        isAdmin: user.isAdmin,
        isSuperAdmin: user.isSuperAdmin,
        hasPassword: !!user.password,
        passwordLength: user.password?.length || 0,
        passwordStartsWith: user.password?.substring(0, 7) || 'N/A',
        testPassword,
        passwordValid: isValid,
      };
    }));

    return NextResponse.json({
      totalUsers: users.length,
      users: testResults,
      bcryptVersion: 'bcryptjs',
    });

  } catch (error) {
    console.error('❌ Check users error:', error);
    return NextResponse.json(
      {
        error: 'Failed to check users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}