import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// Default regular users by role
const defaultUsers = [
  // Security Officers
  { email: 'security1@mail.com', name: 'Security Officer 1', role: 'Security Officer' },
  { email: 'security2@mail.com', name: 'Security Officer 2', role: 'Security Officer' },
  { email: 'security3@mail.com', name: 'Security Officer 3', role: 'Security Officer' },
  // Safety Officers
  { email: 'safety1@mail.com', name: 'Safety Officer 1', role: 'Safety Officer' },
  { email: 'safety2@mail.com', name: 'Safety Officer 2', role: 'Safety Officer' },
  { email: 'safety3@mail.com', name: 'Safety Officer 3', role: 'Safety Officer' },
  // Investigators
  { email: 'investigator1@mail.com', name: 'Investigator 1', role: 'Investigator' },
  { email: 'investigator2@mail.com', name: 'Investigator 2', role: 'Investigator' },
  { email: 'investigator3@mail.com', name: 'Investigator 3', role: 'Investigator' },
  // CCTV Operators
  { email: 'cctv1@mail.com', name: 'CCTV Operator 1', role: 'CCTV Operator' },
  { email: 'cctv2@mail.com', name: 'CCTV Operator 2', role: 'CCTV Operator' },
  { email: 'cctv3@mail.com', name: 'CCTV Operator 3', role: 'CCTV Operator' },
]

async function main() {
  console.log('🌱 Seeding database...')

  // Create superadmin user
  const superAdminPassword = await bcrypt.hash('super123', 12)
  const superAdminUser = await prisma.user.upsert({
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
  })

  console.log('✅ Super admin user created:', superAdminUser.email)

  // Create admin user for testing
  const adminPassword = await bcrypt.hash('admin123', 12)
  const adminUser = await prisma.user.upsert({
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
  })

  console.log('✅ Admin user created:', adminUser.email)

  // Create default regular users (all with password: user123)
  const userPassword = await bcrypt.hash('user123', 12)

  console.log('\n👥 Creating default regular users...')

  for (const userData of defaultUsers) {
    const user = await prisma.user.upsert({
      where: { email: userData.email },
      update: {
        password: userPassword,
        name: userData.name,
        isAdmin: false,
        isSuperAdmin: false,
      },
      create: {
        email: userData.email,
        name: userData.name,
        password: userPassword,
        isAdmin: false,
        isSuperAdmin: false,
      },
    })
    console.log(`   ✅ ${userData.role}: ${user.email}`)
  }

  console.log('\n⏭️ No workspaces created - all users will route to /no-workspace')

  console.log('\n🎉 Database seeded successfully!')
  console.log('\n📝 Users created (all will route to /no-workspace):')
  console.log('   - SuperAdmin: superadmin@example.com / super123')
  console.log('   - Admin: admin@example.com / admin123')
  console.log('\n   Regular Users (all use password: user123):')
  console.log('   - Security Officers: security1@mail.com, security2@mail.com, security3@mail.com')
  console.log('   - Safety Officers: safety1@mail.com, safety2@mail.com, safety3@mail.com')
  console.log('   - Investigators: investigator1@mail.com, investigator2@mail.com, investigator3@mail.com')
  console.log('   - CCTV Operators: cctv1@mail.com, cctv2@mail.com, cctv3@mail.com')
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