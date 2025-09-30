import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

async function checkUsers() {
  try {
    console.log('🔍 Connecting to database...')
    console.log('📊 Database URL:', process.env.DATABASE_URL?.replace(/:[^:@]+@/, ':****@'))

    // Check total user count
    const totalUsers = await prisma.user.count()
    console.log(`\n👥 Total users in database: ${totalUsers}`)

    // Check for seed users
    const seedUsers = await prisma.user.findMany({
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
        createdAt: true,
      }
    })

    console.log(`\n🌱 Seed users found: ${seedUsers.length}`)

    for (const user of seedUsers) {
      console.log(`\n📧 Email: ${user.email}`)
      console.log(`   Name: ${user.name}`)
      console.log(`   Is Admin: ${user.isAdmin}`)
      console.log(`   Is Super Admin: ${user.isSuperAdmin}`)
      console.log(`   Has Password: ${!!user.password}`)
      console.log(`   Password Hash Length: ${user.password?.length || 0}`)
      console.log(`   Created: ${user.createdAt}`)

      // Test password verification
      if (user.password) {
        const testPassword = user.email === 'superadmin@example.com' ? 'super123'
          : user.email === 'admin@example.com' ? 'admin123'
          : 'member123'

        const isValid = await bcrypt.compare(testPassword, user.password)
        console.log(`   ✅ Password "${testPassword}" valid: ${isValid}`)
      }
    }

    // Check all users (limit to 10)
    const allUsers = await prisma.user.findMany({
      take: 10,
      select: {
        email: true,
        name: true,
        isAdmin: true,
        isSuperAdmin: true,
      }
    })

    console.log(`\n📋 All users (max 10):`)
    allUsers.forEach(u => {
      console.log(`   - ${u.email} (${u.name}) - Admin: ${u.isAdmin}, SuperAdmin: ${u.isSuperAdmin}`)
    })

  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

checkUsers()