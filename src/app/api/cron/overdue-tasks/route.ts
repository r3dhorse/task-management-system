import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { updateOverdueTasks } from "@/lib/cron-jobs";
import { prisma } from "@/lib/prisma";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userWithDetails = await prisma?.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true }
    });

    if (!userWithDetails?.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admins can manually trigger cron jobs" },
        { status: 403 }
      );
    }

    console.log(`[CRON] Manual trigger by user ${session.user.email}`);

    const result = await updateOverdueTasks();

    return NextResponse.json({
      success: true,
      message: "Overdue tasks update completed",
      result
    });
  } catch (error) {
    console.error("[CRON] Manual trigger failed:", error);
    return NextResponse.json(
      { error: "Failed to update overdue tasks" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const userWithDetails = await prisma?.user.findUnique({
      where: { id: session.user.id },
      select: { isSuperAdmin: true }
    });

    if (!userWithDetails?.isSuperAdmin) {
      return NextResponse.json(
        { error: "Only super admins can view cron job status" },
        { status: 403 }
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const overdueTasksCount = await prisma?.task.count({
      where: {
        AND: [
          {
            status: {
              in: ['TODO', 'IN_PROGRESS', 'IN_REVIEW']
            }
          },
          {
            dueDate: {
              lt: today
            }
          }
        ]
      }
    });

    return NextResponse.json({
      success: true,
      overdueTasksCount,
      nextRun: "Midnight (00:00) Philippine Time",
      timezone: "Asia/Manila"
    });
  } catch (error) {
    console.error("[CRON] Status check failed:", error);
    return NextResponse.json(
      { error: "Failed to get cron job status" },
      { status: 500 }
    );
  }
}