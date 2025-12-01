import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { createRoutinaryTasks } from "@/lib/routinary-tasks";
import { getCronJobStatus } from "@/lib/cron-jobs";
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

    console.log(`[CRON] Manual routinary tasks trigger by user ${session.user.email}`);

    const result = await createRoutinaryTasks();

    return NextResponse.json({
      success: true,
      message: "Routinary tasks creation completed",
      result
    });
  } catch (error) {
    console.error("[CRON] Manual routinary tasks trigger failed:", error);
    return NextResponse.json(
      { error: "Failed to create routinary tasks" },
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

    // Get count of routinary services due for task creation
    const routinaryServicesDueCount = await prisma?.service.count({
      where: {
        isRoutinary: true,
        routinaryFrequency: {
          not: null
        },
        routinaryNextRunDate: {
          lte: today
        }
      }
    });

    // Get all routinary services for overview
    const routinaryServices = await prisma?.service.findMany({
      where: {
        isRoutinary: true
      },
      select: {
        id: true,
        name: true,
        routinaryFrequency: true,
        routinaryStartDate: true,
        routinaryNextRunDate: true,
        routinaryLastRunDate: true,
        workspace: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        routinaryNextRunDate: 'asc'
      }
    });

    // Get cron job status
    const cronStatus = getCronJobStatus();

    const currentTime = new Date().toLocaleString('en-US', {
      timeZone: 'Asia/Manila',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit'
    });

    return NextResponse.json({
      success: true,
      currentTime: `${currentTime} (Asia/Manila)`,
      routinaryServicesDueCount,
      routinaryServices,
      cronJob: cronStatus.routinaryTasks
    });
  } catch (error) {
    console.error("[CRON] Routinary tasks status check failed:", error);
    return NextResponse.json(
      { error: "Failed to get routinary tasks status" },
      { status: 500 }
    );
  }
}
