import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create superadmin user
  const superAdminPassword = await bcrypt.hash('super123', 12)
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      name: 'System Admin',
      password: superAdminPassword,
      isAdmin: true,
      isSuperAdmin: true,
    },
  })

  console.log('✅ Super admin user created:', superAdminUser.email)

  // Create a workspace for superadmin
  const workspace = await prisma.workspace.upsert({
    where: { inviteCode: 'SYSADMIN123' },
    update: {},
    create: {
      name: 'System Admin',
      description: 'System administration workspace',
      inviteCode: 'SYSADMIN123',
      userId: superAdminUser.id,
    },
  })

  console.log('✅ System admin workspace created:', workspace.name)

  // Add superadmin as workspace member
  await prisma.member.upsert({
    where: {
      userId_workspaceId: {
        userId: superAdminUser.id,
        workspaceId: workspace.id,
      },
    },
    update: {},
    create: {
      userId: superAdminUser.id,
      workspaceId: workspace.id,
      role: 'ADMIN',
    },
  })

  console.log('✅ Superadmin added as workspace admin')

  // Create admin user for testing
  const adminPassword = await bcrypt.hash('admin123', 12)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      isAdmin: true,
      isSuperAdmin: false,
    },
  })

  console.log('✅ Admin user created:', adminUser.email)

  // Create regular member user for testing
  const memberPassword = await bcrypt.hash('member123', 12)
  const memberUser = await prisma.user.upsert({
    where: { email: 'member@example.com' },
    update: {},
    create: {
      email: 'member@example.com',
      name: 'Member User',
      password: memberPassword,
      isAdmin: false,
      isSuperAdmin: false,
    },
  })

  console.log('✅ Member user created:', memberUser.email)

  // Create test workspace
  const testWorkspace = await prisma.workspace.upsert({
    where: { inviteCode: 'TEST123' },
    update: {},
    create: {
      name: 'Test Workspace',
      description: 'Test workspace for E2E testing',
      inviteCode: 'TEST123',
      userId: adminUser.id,
    },
  })

  console.log('✅ Test workspace created:', testWorkspace.name)

  // Add admin as workspace admin
  const adminMember = await prisma.member.upsert({
    where: {
      userId_workspaceId: {
        userId: adminUser.id,
        workspaceId: testWorkspace.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      workspaceId: testWorkspace.id,
      role: 'ADMIN',
    },
  })

  // Add member to workspace
  const regularMember = await prisma.member.upsert({
    where: {
      userId_workspaceId: {
        userId: memberUser.id,
        workspaceId: testWorkspace.id,
      },
    },
    update: {},
    create: {
      userId: memberUser.id,
      workspaceId: testWorkspace.id,
      role: 'MEMBER',
    },
  })

  // Create test service
  const testService = await prisma.service.create({
    data: {
      name: 'Test Service',
      workspaceId: testWorkspace.id,
    },
  })

  console.log('✅ Test service created:', testService.name)

  // Create sample tasks
  const task1 = await prisma.task.create({
    data: {
      workspaceId: testWorkspace.id,
      serviceId: testService.id,
      name: 'Sample Task 1',
      description: 'This is a sample task for testing',
      status: 'TODO',
      assigneeId: adminMember.id,
      creatorId: adminUser.id,
    },
  })

  const task2 = await prisma.task.create({
    data: {
      workspaceId: testWorkspace.id,
      serviceId: testService.id,
      name: 'Sample Task 2',
      description: 'Another sample task',
      status: 'IN_PROGRESS',
      assigneeId: regularMember.id,
      creatorId: adminUser.id,
    },
  })

  console.log('✅ Sample tasks created')

  console.log('\n🎉 Database seeded successfully!')
  console.log('\n📝 Test users created:')
  console.log('   - SuperAdmin: superadmin@example.com / super123')
  console.log('   - Admin: admin@example.com / admin123')
  console.log('   - Member: member@example.com / member123')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error(e)
    await prisma.$disconnect()
    process.exit(1)
  })