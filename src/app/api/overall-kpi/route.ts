import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberRole } from "@/features/members/types";
import { TaskStatus } from "@/features/tasks/types";

interface WorkspaceKPI {
  workspaceId: string;
  workspaceName: string;
  kpiScore: number;
  tasksAssigned: number;
  tasksCompleted: number;
  weight: number;
}

interface MemberOverallKPI {
  userId: string;
  userName: string;
  userEmail: string;
  overallKPI: number;
  workspaceBreakdown: WorkspaceKPI[];
  totalTasksAcrossWorkspaces: number;
  totalCompletedAcrossWorkspaces: number;
  workspaceCount: number;
}

/**
 * Calculate KPI score for a member in a specific workspace
 */
function calculateMemberKPI(
  memberId: string,
  tasks: Array<{
    id: string;
    status: string;
    assignees: Array<{ id: string }>;
    reviewerId: string | null;
    dueDate: Date | null;
    updatedAt: Date;
    followers: Array<{ id: string }>;
  }>,
  weights: {
    kpiCompletionWeight: number;
    kpiProductivityWeight: number;
    kpiSlaWeight: number;
    kpiCollaborationWeight: number;
    kpiReviewWeight: number;
  },
  withReviewStage: boolean
): { kpiScore: number; tasksAssigned: number; tasksCompleted: number } {
  // Assigned tasks - member is one of the assignees (each assignee gets FULL credit)
  const memberTasks = tasks.filter(task => task.assignees.some(a => a.id === memberId));
  const completedTasks = memberTasks.filter(task => task.status === TaskStatus.DONE);

  // Tasks where member is a follower/collaborator (not assigned)
  const followingTasks = tasks.filter(task => {
    if (task.assignees.some(a => a.id === memberId)) return false;
    return task.followers.some(f => f.id === memberId);
  });
  const followingTasksCompleted = followingTasks.filter(task => task.status === TaskStatus.DONE);

  // Tasks where member is the reviewer
  const reviewingTasksCompleted = tasks.filter(task =>
    task.reviewerId === memberId && task.status === TaskStatus.DONE
  ).length;
  const reviewingTasksInReview = tasks.filter(task =>
    task.reviewerId === memberId && task.status === TaskStatus.IN_REVIEW
  ).length;

  // Completion Rate
  const completionRate = memberTasks.length > 0
    ? completedTasks.length / memberTasks.length
    : 0;

  // Contribution Score for productivity
  const assignedPoints = completedTasks.length * 1.0;
  const collaboratorPoints = followingTasksCompleted.length * 0.5;
  const reviewerPoints = reviewingTasksCompleted * 0.3;
  const contributionScore = assignedPoints + collaboratorPoints + reviewerPoints;

  // SLA Compliance
  const tasksWithDueDate = memberTasks.filter(task => task.dueDate);
  const tasksCompletedOnTime = completedTasks.filter(task => {
    if (!task.dueDate) return true;
    return new Date(task.updatedAt) <= new Date(task.dueDate);
  });
  const slaCompliance = tasksWithDueDate.length > 0
    ? tasksCompletedOnTime.length / tasksWithDueDate.length
    : 1;

  // Collaboration Score
  const collaborationScore = followingTasks.length > 0
    ? followingTasksCompleted.length / followingTasks.length
    : 0;

  // Review Score
  const totalReviewedTasks = reviewingTasksCompleted + reviewingTasksInReview;
  const reviewScore = withReviewStage && totalReviewedTasks > 0
    ? reviewingTasksCompleted / totalReviewedTasks
    : 0;

  // Normalize productivity (assuming max contribution of 10 for normalization)
  const normalizedProductivity = Math.min(contributionScore / 10, 1);

  // Calculate weighted KPI
  const kpiScore = (
    completionRate * (weights.kpiCompletionWeight / 100) +
    normalizedProductivity * (weights.kpiProductivityWeight / 100) +
    slaCompliance * (weights.kpiSlaWeight / 100) +
    collaborationScore * (weights.kpiCollaborationWeight / 100) +
    (withReviewStage ? reviewScore * (weights.kpiReviewWeight / 100) : 0)
  );

  return {
    kpiScore: Math.round(kpiScore * 100),
    tasksAssigned: memberTasks.length,
    tasksCompleted: completedTasks.length,
  };
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const workspaceId = searchParams.get("workspaceId");

    if (!workspaceId) {
      return NextResponse.json({ error: "Workspace ID is required" }, { status: 400 });
    }

    // Check if current user is admin of the workspace or super admin
    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, isSuperAdmin: true },
    });

    const currentMember = await prisma.member.findUnique({
      where: {
        userId_workspaceId: {
          userId: session.user.id,
          workspaceId,
        },
      },
    });

    if (!currentMember || (currentMember.role !== MemberRole.ADMIN && !currentUser?.isSuperAdmin)) {
      return NextResponse.json({ error: "Admin access required" }, { status: 403 });
    }

    // Get all members of the current workspace (excluding customers)
    const workspaceMembers = await prisma.member.findMany({
      where: {
        workspaceId,
        role: { not: MemberRole.CUSTOMER },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const overallKPIData: MemberOverallKPI[] = [];

    // For each member, calculate their overall KPI across all workspaces
    for (const member of workspaceMembers) {
      // Get all workspaces this user belongs to
      const userMemberships = await prisma.member.findMany({
        where: {
          userId: member.userId,
          role: { not: MemberRole.CUSTOMER },
        },
        include: {
          workspace: {
            select: {
              id: true,
              name: true,
              withReviewStage: true,
              kpiCompletionWeight: true,
              kpiProductivityWeight: true,
              kpiSlaWeight: true,
              kpiCollaborationWeight: true,
              kpiReviewWeight: true,
            },
          },
        },
      });

      const workspaceBreakdown: WorkspaceKPI[] = [];
      let totalTasksAcrossWorkspaces = 0;
      let totalCompletedAcrossWorkspaces = 0;

      // Calculate KPI for each workspace
      for (const membership of userMemberships) {
        const workspace = membership.workspace;

        // Get tasks for this workspace
        const tasks = await prisma.task.findMany({
          where: {
            workspaceId: workspace.id,
            status: { not: TaskStatus.ARCHIVED },
          },
          select: {
            id: true,
            status: true,
            assignees: {
              select: { id: true },
            },
            reviewerId: true,
            dueDate: true,
            updatedAt: true,
            followers: {
              select: { id: true },
            },
          },
        });

        const kpiResult = calculateMemberKPI(
          membership.id,
          tasks,
          {
            kpiCompletionWeight: workspace.kpiCompletionWeight,
            kpiProductivityWeight: workspace.kpiProductivityWeight,
            kpiSlaWeight: workspace.kpiSlaWeight,
            kpiCollaborationWeight: workspace.kpiCollaborationWeight,
            kpiReviewWeight: workspace.kpiReviewWeight,
          },
          workspace.withReviewStage
        );

        totalTasksAcrossWorkspaces += kpiResult.tasksAssigned;
        totalCompletedAcrossWorkspaces += kpiResult.tasksCompleted;

        workspaceBreakdown.push({
          workspaceId: workspace.id,
          workspaceName: workspace.name,
          kpiScore: kpiResult.kpiScore,
          tasksAssigned: kpiResult.tasksAssigned,
          tasksCompleted: kpiResult.tasksCompleted,
          weight: 0, // Will be calculated after
        });
      }

      // Calculate weights based on task involvement
      const totalInvolvement = workspaceBreakdown.reduce((sum, w) => sum + w.tasksAssigned, 0);

      workspaceBreakdown.forEach(w => {
        w.weight = totalInvolvement > 0 ? w.tasksAssigned / totalInvolvement : 1 / workspaceBreakdown.length;
      });

      // Calculate weighted average overall KPI
      const overallKPI = workspaceBreakdown.reduce((sum, w) => {
        return sum + (w.kpiScore * w.weight);
      }, 0);

      overallKPIData.push({
        userId: member.userId,
        userName: member.user.name || "Unknown",
        userEmail: member.user.email,
        overallKPI: Math.round(overallKPI),
        workspaceBreakdown,
        totalTasksAcrossWorkspaces,
        totalCompletedAcrossWorkspaces,
        workspaceCount: workspaceBreakdown.length,
      });
    }

    // Sort by overall KPI descending
    overallKPIData.sort((a, b) => b.overallKPI - a.overallKPI);

    return NextResponse.json({ data: overallKPIData });
  } catch (error) {
    console.error("Overall KPI API error:", error);
    return NextResponse.json({ error: "Failed to calculate overall KPI" }, { status: 500 });
  }
}
