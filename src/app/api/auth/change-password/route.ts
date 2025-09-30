import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { changePasswordSchema } from "@/features/auth/schemas"

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const result = changePasswordSchema.safeParse(body)
    
    if (!result.success) {
      return NextResponse.json({ error: "Invalid request data" }, { status: 400 })
    }

    const { oldPassword, newPassword } = result.data

    // Get the current user's password from database
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true }
    })

    if (!currentUser || !currentUser.password) {
      return NextResponse.json({ error: "User not found or no password set" }, { status: 400 })
    }

    // Verify old password
    const isOldPasswordValid = await bcrypt.compare(oldPassword, currentUser.password)
    if (!isOldPasswordValid) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12)

    // Update password in database
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedNewPassword }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Change password error:", error)
    return NextResponse.json({ error: "Failed to update password" }, { status: 500 })
  }
}