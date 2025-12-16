import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { MemberRole } from "@/features/members/types";
import { TaskStatus } from "@/features/tasks/types";

// Force dynamic rendering since this route uses headers (auth)
export const dynamic = 'force-dynamic';

interface WorkspaceKPI {
  workspaceId: string;
  workspaceName: string;
  kpiScore: number;
  tasksAssigned: number;
  tasksCompleted: number;
  weight: number;
}

interface TeamMemberKPI {
  memberId: string;
  userId: string;
  userName: string;
  userEmail: string;
  overallKPI: number;
  workspaceBreakdown: WorkspaceKPI[];
  totalTasksAcrossWorkspaces: number;
  totalCompletedAcrossWorkspaces: number;
  workspaceCount: number;
}

interface TeamOverallKPIResponse {
  members: TeamMemberKPI[];
  adminWorkspaces: Array<{
    id: string;
    name: string;
    memberCount: number;
  }>;
  teamStats: {
    totalMembers: number;
    averageKPI: number;
    highPerformers: number; // KPI >= 60
    totalTasks: number;
    totalCompleted: number;
  };
  pagination: {
    page: number;
    limit: number;
    totalMembers: number;
    totalPages: number;
    hasMore: boolean;
  };
  dateRange: {
    startDate: string | null;
    endDate: string | null;
  };
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

  // SLA Compliance - percentage of tasks meeting SLA
  // A task is within SLA if: completed on time OR not yet overdue
  const tasksWithDueDate = memberTasks.filter(task => task.dueDate);
  const now = new Date();
  const tasksWithinSLA = tasksWithDueDate.filter(task => {
    const dueDate = new Date(task.dueDate!);
    if (task.status === TaskStatus.DONE) {
      // Completed task: check if completed on or before due date
      const completedDate = new Date(task.updatedAt);
      return completedDate <= dueDate;
    } else {
      // Incomplete task: check if not yet overdue
      return dueDate >= now;
    }
  });
  const slaCompliance = tasksWithDueDate.length > 0
    ? tasksWithinSLA.length / tasksWithDueDate.length
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

    // Parse query params
    const { searchParams } = new URL(request.url);
    const filterWorkspaceId = searchParams.get("workspaceId"); // Optional filter
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));

    // Parse date range params
    const startDateParam = searchParams.get("startDate");
    const endDateParam = searchParams.get("endDate");

    let startDate: Date | null = null;
    let endDate: Date | null = null;

    if (startDateParam) {
      startDate = new Date(startDateParam);
      startDate.setHours(0, 0, 0, 0); // Start of day
    }
    if (endDateParam) {
      endDate = new Date(endDateParam);
      endDate.setHours(23, 59, 59, 999); // End of day
    }

    const currentUser = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, isSuperAdmin: true },
    });

    if (!currentUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get all workspaces where current user is ADMIN
    const adminMemberships = await prisma.member.findMany({
      where: {
        userId: currentUser.id,
        role: MemberRole.ADMIN,
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

    // For super admins, also get workspaces they own (that they're not already admin of)
    let additionalWorkspaces: Array<{
      id: string;
      name: string;
      withReviewStage: boolean;
      kpiCompletionWeight: number;
      kpiProductivityWeight: number;
      kpiSlaWeight: number;
      kpiCollaborationWeight: number;
      kpiReviewWeight: number;
    }> = [];

    if (currentUser.isSuperAdmin) {
      const ownedWorkspaces = await prisma.workspace.findMany({
        where: { userId: currentUser.id },
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
      });

      // Filter out workspaces already in admin memberships
      additionalWorkspaces = ownedWorkspaces.filter(
        ws => !adminMemberships.some(m => m.workspace.id === ws.id)
      );
    }

    if (adminMemberships.length === 0 && additionalWorkspaces.length === 0) {
      return NextResponse.json({
        data: {
          members: [],
          adminWorkspaces: [],
          teamStats: {
            totalMembers: 0,
            averageKPI: 0,
            highPerformers: 0,
            totalTasks: 0,
            totalCompleted: 0,
          },
          pagination: {
            page: 1,
            limit,
            totalMembers: 0,
            totalPages: 0,
            hasMore: false,
          },
          dateRange: {
            startDate: startDate?.toISOString() || null,
            endDate: endDate?.toISOString() || null,
          },
        },
      });
    }

    // Combine workspace IDs from both sources
    const allAdminWorkspaceIds = [
      ...adminMemberships.map(m => m.workspace.id),
      ...additionalWorkspaces.map(ws => ws.id),
    ];

    // Combine workspace info for later use
    const allAdminWorkspaceInfo = [
      ...adminMemberships.map(m => m.workspace),
      ...additionalWorkspaces,
    ];

    // Determine which workspace IDs to use for filtering members
    let targetWorkspaceIds = allAdminWorkspaceIds;
    if (filterWorkspaceId && allAdminWorkspaceIds.includes(filterWorkspaceId)) {
      targetWorkspaceIds = [filterWorkspaceId];
    }

    // Get all unique members from target workspaces (only regular members - exclude customers and admins)
    const allMembers = await prisma.member.findMany({
      where: {
        workspaceId: { in: targetWorkspaceIds },
        role: MemberRole.MEMBER, // Only get regular members (exclude admins and customers)
      },
      include: {
        user: {
          select: { id: true, name: true, email: true },
        },
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

    // Group members by userId to get unique users
    const userMembersMap = new Map<string, typeof allMembers>();
    for (const member of allMembers) {
      const existing = userMembersMap.get(member.userId) || [];
      existing.push(member);
      userMembersMap.set(member.userId, existing);
    }

    const teamMemberKPIs: TeamMemberKPI[] = [];

    // Calculate KPI for each unique user across all their workspaces (within admin's scope)
    for (const [userId, userMemberships] of userMembersMap) {
      const workspaceBreakdown: WorkspaceKPI[] = [];
      let totalTasksAcrossWorkspaces = 0;
      let totalCompletedAcrossWorkspaces = 0;

      for (const membership of userMemberships) {
        const workspace = membership.workspace;

        // Build task query with date range filter
        // Get tasks for this workspace
        const tasks = await prisma.task.findMany({
          where: {
            workspaceId: workspace.id,
            status: { not: TaskStatus.ARCHIVED },
            ...(startDate || endDate ? {
              createdAt: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
              },
            } : {}),
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

      const firstMembership = userMemberships[0];
      teamMemberKPIs.push({
        memberId: firstMembership.id,
        userId,
        userName: firstMembership.user.name || "Unknown",
        userEmail: firstMembership.user.email,
        overallKPI: Math.round(overallKPI),
        workspaceBreakdown,
        totalTasksAcrossWorkspaces,
        totalCompletedAcrossWorkspaces,
        workspaceCount: workspaceBreakdown.length,
      });
    }

    // Sort by overall KPI descending
    teamMemberKPIs.sort((a, b) => b.overallKPI - a.overallKPI);

    // Calculate team stats (before pagination)
    const totalMembersCount = teamMemberKPIs.length;
    const averageKPI = totalMembersCount > 0
      ? Math.round(teamMemberKPIs.reduce((sum, m) => sum + m.overallKPI, 0) / totalMembersCount)
      : 0;
    const highPerformers = teamMemberKPIs.filter(m => m.overallKPI >= 60).length;
    const totalTasks = teamMemberKPIs.reduce((sum, m) => sum + m.totalTasksAcrossWorkspaces, 0);
    const totalCompleted = teamMemberKPIs.reduce((sum, m) => sum + m.totalCompletedAcrossWorkspaces, 0);

    // Apply pagination
    const totalPages = Math.ceil(totalMembersCount / limit);
    const startIndex = (page - 1) * limit;
    const paginatedMembers = teamMemberKPIs.slice(startIndex, startIndex + limit);

    // Get workspace info for ALL admin workspaces (not filtered)
    const adminWorkspaces = await Promise.all(
      allAdminWorkspaceIds.map(async (wsId) => {
        const memberCount = await prisma.member.count({
          where: {
            workspaceId: wsId,
            role: { not: MemberRole.CUSTOMER },
          },
        });
        const ws = allAdminWorkspaceInfo.find(w => w.id === wsId);
        return {
          id: wsId,
          name: ws?.name || "Unknown",
          memberCount,
        };
      })
    );

    const response: TeamOverallKPIResponse = {
      members: paginatedMembers,
      adminWorkspaces,
      teamStats: {
        totalMembers: totalMembersCount,
        averageKPI,
        highPerformers,
        totalTasks,
        totalCompleted,
      },
      pagination: {
        page,
        limit,
        totalMembers: totalMembersCount,
        totalPages,
        hasMore: page < totalPages,
      },
      dateRange: {
        startDate: startDate?.toISOString() || null,
        endDate: endDate?.toISOString() || null,
      },
    };

    return NextResponse.json({ data: response });
  } catch (error) {
    console.error("Team Overall KPI API error:", error);
    return NextResponse.json({ error: "Failed to calculate team KPI" }, { status: 500 });
  }
}
