const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

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

  console.log('⏭️ No workspaces created - all users will route to /no-workspace')

  console.log('\n🎉 Database seeded successfully!')
  console.log('\n📝 Test users created (all will route to /no-workspace):')
  console.log('   - SuperAdmin: superadmin@example.com / super123')
  console.log('   - Admin: admin@example.com / admin123')
  console.log('   - Member: member@example.com / member123')
  console.log('   - No Workspace: noworkspace@example.com / test123')
  console.log('\n📍 All users have no workspace memberships and will be redirected to /no-workspace')
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
  