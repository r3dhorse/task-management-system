import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';

// Emergency endpoint to reset default user passwords
export async function POST(request: NextRequest) {
  try {
    // Security check: require a special token
    const authHeader = request.headers.get('authorization');
    const expectedToken = process.env.DB_SEED_TOKEN;

    if (!expectedToken) {
      return NextResponse.json(
        { error: 'DB_SEED_TOKEN not configured. Set this in Amplify environment variables.' },
        { status: 503 }
      );
    }

    if (authHeader !== `Bearer ${expectedToken}`) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('🔄 Force resetting default user passwords...');

    // Reset superadmin password
    const superAdminPassword = await bcrypt.hash('super123', 12);
    const superAdmin = await prisma.user.upsert({
      where: { email: 'superadmin@example.com' },
      update: {
        password: superAdminPassword,
        isAdmin: true,
        isSuperAdmin: true,
      },
      create: {
        email: 'superadmin@example.com',
        name: 'System Admin',
        password: superAdminPassword,
        isAdmin: true,
        isSuperAdmin: true,
      },
    });
    console.log('✅ Super admin reset:', superAdmin.email);

    // Reset admin password
    const adminPassword = await bcrypt.hash('admin123', 12);
    const admin = await prisma.user.upsert({
      where: { email: 'admin@example.com' },
      update: {
        password: adminPassword,
        isAdmin: true,
        isSuperAdmin: false,
      },
      create: {
        email: 'admin@example.com',
        name: 'Admin User',
        password: adminPassword,
        isAdmin: true,
        isSuperAdmin: false,
      },
    });
    console.log('✅ Admin reset:', admin.email);

    // Reset member password
    const memberPassword = await bcrypt.hash('member123', 12);
    const member = await prisma.user.upsert({
      where: { email: 'member@example.com' },
      update: {
        password: memberPassword,
        isAdmin: false,
        isSuperAdmin: false,
      },
      create: {
        email: 'member@example.com',
        name: 'Member User',
        password: memberPassword,
        isAdmin: false,
        isSuperAdmin: false,
      },
    });
    console.log('✅ Member reset:', member.email);

    return NextResponse.json({
      success: true,
      message: 'Default user passwords have been reset',
      users: [
        { email: superAdmin.email, role: 'Super Admin', password: 'super123' },
        { email: admin.email, role: 'Admin', password: 'admin123' },
        { email: member.email, role: 'Member', password: 'member123' },
      ],
      warning: 'Change these passwords immediately after login!'
    });

  } catch (error) {
    console.error('❌ Force reset error:', error);
    return NextResponse.json(
      {
        error: 'Failed to reset passwords',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}