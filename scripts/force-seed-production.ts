import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  console.log('🌱 Force seeding production database...')

  // Delete existing users first to ensure clean state
  console.log('🗑️  Deleting existing test users...')
  await prisma.user.deleteMany({
    where: {
      email: {
        in: ['superadmin@example.com', 'admin@example.com', 'member@example.com']
      }
    }
  })

  // Create superadmin user
  console.log('👤 Creating superadmin user...')
  const superAdminPassword = await bcrypt.hash('super123', 12)
  const superAdminUser = await prisma.user.create({
    data: {
      email: 'superadmin@example.com',
      name: 'System Admin',
      password: superAdminPassword,
      isAdmin: true,
      isSuperAdmin: true,
    },
  })
  console.log('✅ Super admin user created:', superAdminUser.email)

  // Create admin user for testing
  console.log('👤 Creating admin user...')
  const adminPassword = await bcrypt.hash('admin123', 12)
  const adminUser = await prisma.user.create({
    data: {
      email: 'admin@example.com',
      name: 'Admin User',
      password: adminPassword,
      isAdmin: true,
      isSuperAdmin: false,
    },
  })
  console.log('✅ Admin user created:', adminUser.email)

  // Create regular member user for testing
  console.log('👤 Creating member user...')
  const memberPassword = await bcrypt.hash('member123', 12)
  const memberUser = await prisma.user.create({
    data: {
      email: 'member@example.com',
      name: 'Member User',
      password: memberPassword,
      isAdmin: false,
      isSuperAdmin: false,
    },
  })
  console.log('✅ Member user created:', memberUser.email)

  console.log('\n🎉 Database force-seeded successfully!')
  console.log('\n📝 Login credentials:')
  console.log('   - SuperAdmin: superadmin@example.com / super123')
  console.log('   - Admin: admin@example.com / admin123')
  console.log('   - Member: member@example.com / member123')
  console.log('\n⚠️  Change passwords immediately after first login!')
}

main()
  .then(async () => {
    await prisma.$disconnect()
  })
  .catch(async (e) => {
    console.error('❌ Error:', e)
    await prisma.$disconnect()
    process.exit(1)
  })