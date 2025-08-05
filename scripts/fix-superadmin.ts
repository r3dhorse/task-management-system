import { prisma } from "../src/lib/prisma";
import bcrypt from "bcryptjs";

async function fixSuperAdmin() {
  const email = "jun@mail.com";
  const password = "Shithappen1s";

  try {
    // First, let's check the current user
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (!existingUser) {
      console.log("User not found, creating new user...");
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const newUser = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          name: "Jun Suganob",
          isAdmin: true,
          isSuperAdmin: true,
        },
      });
      
      console.log("✅ SuperAdmin user created:", newUser.email);
      console.log("   ID:", newUser.id);
      console.log("   Password hash:", newUser.password ? "Set" : "Not set");
    } else {
      console.log("Existing user found:");
      console.log("   ID:", existingUser.id);
      console.log("   Email:", existingUser.email);
      console.log("   Name:", existingUser.name);
      console.log("   isAdmin:", existingUser.isAdmin);
      console.log("   isSuperAdmin:", existingUser.isSuperAdmin);
      console.log("   Password hash:", existingUser.password ? "Set" : "Not set");
      
      // Update the user with new password and ensure isAdmin is true
      const hashedPassword = await bcrypt.hash(password, 10);
      
      const updatedUser = await prisma.user.update({
        where: { email },
        data: {
          password: hashedPassword,
          isAdmin: true,
          isSuperAdmin: true,
          name: existingUser.name || "Jun Suganob",
        },
      });
      
      console.log("\n✅ User updated:");
      console.log("   isAdmin:", updatedUser.isAdmin);
      console.log("   isSuperAdmin:", updatedUser.isSuperAdmin);
      console.log("   Password: Reset");
    }
  } catch (error) {
    console.error("Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

fixSuperAdmin();