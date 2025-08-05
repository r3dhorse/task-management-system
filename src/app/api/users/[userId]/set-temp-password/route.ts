import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import bcrypt from "bcryptjs";

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic';

const setTempPasswordSchema = z.object({
  temporaryPassword: z.string().min(6, "Password must be at least 6 characters"),
});

// POST /api/users/[userId]/set-temp-password - Set temporary password (SUPERADMIN only)
export async function POST(
  req: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is superadmin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true },
    });

    if (!currentUser?.isSuperAdmin) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();
    const { temporaryPassword } = setTempPasswordSchema.parse(body);

    // Check if target user exists
    const targetUser = await prisma.user.findUnique({
      where: { id: params.userId },
      select: {
        id: true,
        email: true,
        name: true,
      },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Hash the temporary password
    const hashedPassword = await bcrypt.hash(temporaryPassword, 12);

    // Update user's password
    await prisma.user.update({
      where: { id: params.userId },
      data: {
        password: hashedPassword,
      },
    });

    return NextResponse.json({ 
      success: true, 
      message: `Temporary password set for ${targetUser.email}`,
      temporaryPassword: temporaryPassword // Return the plain password so admin can share it
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid input", details: error.errors },
        { status: 400 }
      );
    }

    console.error("Error setting temporary password:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}