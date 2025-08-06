import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Seeding database...')

  // Create admin user
  const adminPassword = await bcrypt.hash('admin123', 12)
  const adminUser = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      isAdmin: true,
    },
  })

  console.log('✅ Admin user created:', adminUser.email)

  // Create superadmin user
  const superAdminPassword = await bcrypt.hash('super123', 12)
  const superAdminUser = await prisma.user.upsert({
    where: { email: 'superadmin@example.com' },
    update: {},
    create: {
      email: 'superadmin@example.com',
      name: 'Super Admin',
      password: superAdminPassword,
      isAdmin: true,
      isSuperAdmin: true,
    },
  })

  console.log('✅ Super admin user created:', superAdminUser.email)

  // Create regular user
  const userPassword = await bcrypt.hash('user123', 12)
  const regularUser = await prisma.user.upsert({
    where: { email: 'user@example.com' },
    update: {},
    create: {
      email: 'user@example.com',
      name: 'Regular User',
      password: userPassword,
      isAdmin: false,
    },
  })

  console.log('✅ Regular user created:', regularUser.email)

  // Create a sample workspace
  const workspace = await prisma.workspace.upsert({
    where: { inviteCode: 'SAMPLE123' },
    update: {},
    create: {
      name: 'Sample Workspace',
      description: 'A sample workspace for testing',
      inviteCode: 'SAMPLE123',
      userId: adminUser.id,
    },
  })

  console.log('✅ Sample workspace created:', workspace.name)

  // Add admin as workspace member
  const adminMember = await prisma.member.upsert({
    where: {
      userId_workspaceId: {
        userId: adminUser.id,
        workspaceId: workspace.id,
      },
    },
    update: {},
    create: {
      userId: adminUser.id,
      workspaceId: workspace.id,
      role: 'ADMIN',
    },
  })

  // Add regular user as workspace member
  const regularMember = await prisma.member.upsert({
    where: {
      userId_workspaceId: {
        userId: regularUser.id,
        workspaceId: workspace.id,
      },
    },
    update: {},
    create: {
      userId: regularUser.id,
      workspaceId: workspace.id,
      role: 'MEMBER',
    },
  })

  console.log('✅ Workspace members added')

  // Create a sample service
  const service = await prisma.service.upsert({
    where: { id: 'sample-service' },
    update: {},
    create: {
      id: 'sample-service',
      name: 'Sample Service',
      workspaceId: workspace.id,
    },
  })

  console.log('✅ Sample service created:', service.name)

  // Create sample tasks
  const tasks = [
    {
      name: 'Setup Project',
      description: 'Initialize the project structure and dependencies',
      status: 'DONE',
      position: 1,
    },
    {
      name: 'Design Database Schema',
      description: 'Create the database models and relationships',
      status: 'IN_PROGRESS',
      position: 2,
    },
    {
      name: 'Implement Authentication',
      description: 'Set up user authentication and authorization',
      status: 'TODO',
      position: 3,
    },
  ]

  for (const [index, taskData] of tasks.entries()) {
    await prisma.task.upsert({
      where: { id: `sample-task-${index + 1}` },
      update: {},
      create: {
        id: `sample-task-${index + 1}`,
        ...taskData,
        workspaceId: workspace.id,
        serviceId: service.id,
        creatorId: adminUser.id,
        assigneeId: index === 1 ? regularMember.id : adminMember.id, // Assign second task to regular member
        status: taskData.status as any,
      },
    })
  }

  console.log('✅ Sample tasks created')

  console.log('\n🎉 Database seeded successfully!')
  console.log('\n📝 Test users created:')
  console.log('   SuperAdmin: superadmin@example.com / super123')
  console.log('   Admin: admin@example.com / admin123')
  console.log('   User:  user@example.com / user123')
  console.log('\n🏢 Sample workspace: "Sample Workspace" (invite code: SAMPLE123)')
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