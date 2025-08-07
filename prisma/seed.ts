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
  console.log('\n🎉 Database seeded successfully!')
  console.log('\n📝 Superadmin user created:')
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