import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function createSuperAdmin() {
  const email = process.argv[2];
  const password = process.argv[3];
  const name = process.argv[4];

  if (!email || !password) {
    console.error("Usage: npm run create-superadmin <email> <password> [name]");
    process.exit(1);
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await prisma.user.upsert({
      where: { email },
      update: { 
        isSuperAdmin: true,
        name: name || undefined,
      },
      create: {
        email,
        password: hashedPassword,
        name: name || null,
        isAdmin: true,
        isSuperAdmin: true,
      },
    });

    console.log(`✅ SuperAdmin user created/updated: ${user.email}`);
    console.log(`   ID: ${user.id}`);
    console.log(`   Name: ${user.name || "(no name)"}`);
    console.log(`   Admin: ${user.isAdmin}`);
    console.log(`   SuperAdmin: ${user.isSuperAdmin}`);
  } catch (error) {
    console.error("Error creating superadmin:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

createSuperAdmin();