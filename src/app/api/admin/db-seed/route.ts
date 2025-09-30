import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

export const dynamic = 'force-dynamic';

// This endpoint should be protected and only used for initial setup
export async function POST(request: NextRequest) {
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

    // Check if database already has users
    const userCount = await prisma.user.count();
    if (userCount > 0) {
      return NextResponse.json(
        {
          message: 'Database already seeded',
          userCount
        },
        { status: 200 }
      );
    }

    // Create super admin user
    const hashedPassword = await bcrypt.hash('admin123', 10);

    const superAdmin = await prisma.user.create({
      data: {
        email: 'admin@example.com',
        password: hashedPassword,
        name: 'Super Admin',
        isAdmin: true,
        isSuperAdmin: true,
      },
    });

    // Create a default workspace
    const workspace = await prisma.workspace.create({
      data: {
        name: 'Default Workspace',
        description: 'Default workspace for the organization',
        userId: superAdmin.id,
      },
    });

    // Add super admin as workspace member
    await prisma.member.create({
      data: {
        userId: superAdmin.id,
        workspaceId: workspace.id,
        role: 'ADMIN',
      },
    });

    // Create a default service
    await prisma.service.create({
      data: {
        name: 'General',
        workspaceId: workspace.id,
        slaDays: 1,
        includeWeekends: false,
      },
    });

    return NextResponse.json({
      message: 'Database seeded successfully',
      superAdmin: {
        email: superAdmin.email,
        note: 'Default password: admin123 - Please change immediately!'
      },
      workspace: {
        id: workspace.id,
        name: workspace.name,
      }
    });

  } catch (error) {
    console.error('Database seed error:', error);
    return NextResponse.json(
      {
        error: 'Failed to seed database',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}