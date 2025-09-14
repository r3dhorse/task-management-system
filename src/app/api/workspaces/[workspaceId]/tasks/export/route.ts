import { NextRequest, NextResponse } from "next/server";
import { getCurrent } from "@/features/auth/queries";
import { MemberRole } from "@/features/members/types";
import { TaskStatus } from "@/features/tasks/types";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: NextRequest,
  { params }: { params: { workspaceId: string } }
) {
  try {
    const user = await getCurrent();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { workspaceId } = params;

    // Check if user is a member of the workspace
    const member = await prisma.member.findUnique({
      where: {
        userId_workspaceId: {
          userId: user.id,
          workspaceId,
        },
      },
    });

    if (!member) {
      return NextResponse.json({ error: "Not a member of this workspace" }, { status: 403 });
    }

    // Check if user has admin privileges (workspace admin or super admin)
    const hasExportPermission = user.isSuperAdmin ||
                               user.isAdmin ||
                               member.role === MemberRole.ADMIN;

    if (!hasExportPermission) {
      return NextResponse.json({ error: "Insufficient permissions to export tasks" }, { status: 403 });
    }

    // Get URL parameters for filtering
    const { searchParams } = new URL(request.url);
    const serviceId = searchParams.get("serviceId");
    const assigneeId = searchParams.get("assigneeId");
    const status = searchParams.get("status") as TaskStatus | null;
    const search = searchParams.get("search");
    const dueDate = searchParams.get("dueDate");

    // Build where clause for filtering
    const whereClause: {
      workspaceId: string;
      status?: { not?: TaskStatus } | TaskStatus;
      serviceId?: string;
      assigneeId?: string | null;
      OR?: Array<{
        name?: { contains: string; mode: 'insensitive' };
        description?: { contains: string; mode: 'insensitive' };
        taskNumber?: { contains: string; mode: 'insensitive' };
      }>;
      dueDate?: {
        gte: Date;
        lt: Date;
      };
    } = {
      workspaceId,
      status: {
        not: TaskStatus.ARCHIVED // Exclude archived tasks
      }
    };

    if (serviceId) {
      whereClause.serviceId = serviceId;
    }

    if (assigneeId && assigneeId !== "unassigned") {
      whereClause.assigneeId = assigneeId;
    } else if (assigneeId === "unassigned") {
      whereClause.assigneeId = null;
    }

    if (status && Object.values(TaskStatus).includes(status)) {
      whereClause.status = status;
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { taskNumber: { contains: search, mode: 'insensitive' } }
      ];
    }

    if (dueDate) {
      const date = new Date(dueDate);
      const nextDay = new Date(date);
      nextDay.setDate(date.getDate() + 1);

      whereClause.dueDate = {
        gte: date,
        lt: nextDay
      };
    }

    // Fetch ALL tasks matching the criteria (no pagination for export)
    const tasks = await prisma.task.findMany({
      where: whereClause,
      include: {
        service: {
          select: {
            id: true,
            name: true
          }
        },
        assignee: {
          select: {
            id: true,
            user: {
              select: {
                name: true,
                email: true
              }
            }
          }
        },
        creator: {
          select: {
            id: true,
            name: true,
            email: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' }
      ]
    });

    // Transform tasks for export
    const exportTasks = tasks.map(task => ({
      id: task.id,
      taskNumber: task.taskNumber,
      name: task.name,
      description: task.description,
      status: task.status as TaskStatus,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
      dueDate: task.dueDate?.toISOString(),
      serviceName: task.service?.name,
      assigneeName: task.assignee?.user?.name,
      creatorName: task.creator?.name,
      isConfidential: task.isConfidential || false
    }));

    return NextResponse.json({
      tasks: exportTasks,
      total: exportTasks.length
    });

  } catch (error) {
    console.error("Export tasks error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}