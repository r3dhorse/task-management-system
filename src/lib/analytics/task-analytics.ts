/**
 * Task Analytics Utilities
 *
 * Centralized analytics calculation functions for task performance metrics.
 * Used by workspace analytics, dashboards, and reporting components.
 */

import { TaskStatus, PopulatedTask } from "@/features/tasks/types";
import { Member, MemberRole } from "@/features/members/types";

// ============================================================================
// TYPES
// ============================================================================

export interface ServiceType {
  id: string;
  name: string;
  workspaceId: string;
  isPublic?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

export interface KPIWeights {
  /** Weight for completion rate (percentage) */
  kpiCompletionWeight: number;
  /** Weight for productivity score (percentage) */
  kpiProductivityWeight: number;
  /** Weight for SLA compliance (percentage) */
  kpiSlaWeight: number;
  /** Weight for collaboration contribution (percentage) */
  kpiCollaborationWeight: number;
  /** Weight for review score (percentage) */
  kpiReviewWeight: number;
}

export interface ContributionBreakdown {
  assigned: number;
  collaborator: number;
  reviewer: number;
}

export interface MemberAnalytics {
  id: string;
  name: string;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksOverdue: number;
  tasksFollowing: number;
  tasksFollowingCompleted: number;
  tasksReviewing: number;
  tasksReviewingCompleted: number;
  contributionScore: number;
  contributionBreakdown: ContributionBreakdown;
  productivityScore: number;
  normalizedProductivityScore: number;
  completionRate: number;
  slaCompliance: number;
  collaborationScore: number;
  reviewScore: number;
  kpiScore: number;
}

export interface ServiceAnalytics {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  backlogTasks: number;
  todoTasks: number;
  inReviewTasks: number;
  healthScore: number;
  completionRate: number;
  progressRate: number;
}

export interface ProductivityMetrics {
  tasksCreated: number;
  tasksCompleted: number;
  averageCompletionTime: number;
  completionRate: number;
  overdueRate: number;
  overdueTasks: number;
}

export interface StatusDistribution {
  [TaskStatus.BACKLOG]: number;
  [TaskStatus.TODO]: number;
  [TaskStatus.IN_PROGRESS]: number;
  [TaskStatus.IN_REVIEW]: number;
  [TaskStatus.DONE]: number;
  [TaskStatus.ARCHIVED]?: number;
}

export interface TeamSummary {
  avgKpiScore: number;
  avgCompletionRate: number;
  avgSlaCompliance: number;
  avgCollaborationScore: number;
  avgReviewScore: number;
  highPerformers: number;
  totalMembers: number;
  healthyServices: number;
  totalServices: number;
}

// ============================================================================
// DEFAULT CONFIGURATIONS
// ============================================================================

/**
 * Get default KPI weights based on whether review stage is enabled
 */
export function getDefaultKPIWeights(withReviewStage: boolean = true): KPIWeights {
  return {
    kpiCompletionWeight: withReviewStage ? 30.0 : 35.0,
    kpiProductivityWeight: withReviewStage ? 20.0 : 25.0,
    kpiSlaWeight: withReviewStage ? 20.0 : 25.0,
    kpiCollaborationWeight: 15.0,
    kpiReviewWeight: withReviewStage ? 15.0 : 0.0,
  };
}

// ============================================================================
// PRODUCTIVITY METRICS CALCULATION
// ============================================================================

/**
 * Calculate overall productivity metrics for a set of tasks
 */
export function calculateProductivityMetrics(tasks: PopulatedTask[]): ProductivityMetrics {
  const completedTasks = tasks.filter(task => task.status === TaskStatus.DONE);
  const overdueTasks = tasks.filter(task => {
    if (!task.dueDate || task.status === TaskStatus.DONE) return false;
    return new Date(task.dueDate) < new Date();
  });

  // Calculate average completion time (in days)
  const avgCompletionTime = completedTasks.reduce((acc, task) => {
    const created = new Date(task.createdAt);
    const completed = new Date(task.updatedAt);
    const days = Math.ceil((completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
    return acc + days;
  }, 0) / (completedTasks.length || 1);

  return {
    tasksCreated: tasks.length,
    tasksCompleted: completedTasks.length,
    averageCompletionTime: Math.round(avgCompletionTime),
    completionRate: tasks.length > 0 ? (completedTasks.length / tasks.length) * 100 : 0,
    overdueRate: tasks.length > 0 ? (overdueTasks.length / tasks.length) * 100 : 0,
    overdueTasks: overdueTasks.length,
  };
}

// ============================================================================
// MEMBER ANALYTICS CALCULATION
// ============================================================================

/**
 * Calculate comprehensive analytics for a single member
 */
export function calculateMemberMetrics(
  member: Member,
  tasks: PopulatedTask[],
  withReviewStage: boolean = true
): Omit<MemberAnalytics, 'productivityScore' | 'normalizedProductivityScore' | 'kpiScore'> {
  // Assigned tasks - member is one of the assignees (each assignee gets FULL credit)
  const memberTasks = tasks.filter(task =>
    task.assignees && task.assignees.some(a => a.id === member.id)
  );
  const completedTasks = memberTasks.filter(task => task.status === TaskStatus.DONE);
  const inProgressTasks = memberTasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
  const overdueTasks = memberTasks.filter(task => {
    if (!task.dueDate || task.status === TaskStatus.DONE) return false;
    return new Date(task.dueDate) < new Date();
  });

  // Tasks where member is a collaborator (excluding where they are assignee)
  // Collaborators are team members who work on the task but are not primary assignees
  const collaboratingTasks = tasks.filter(task => {
    if (task.assignees && task.assignees.some(a => a.id === member.id)) return false;
    if (task.collaborators && Array.isArray(task.collaborators)) {
      return task.collaborators.some((collaborator: { id: string }) => collaborator.id === member.id);
    }
    return false;
  });
  const collaboratingTasksCompleted = collaboratingTasks.filter(task => task.status === TaskStatus.DONE);

  // Tasks where member is the designated reviewer
  const reviewingTasks = tasks.filter(task => {
    return task.reviewerId === member.id && task.status === TaskStatus.IN_REVIEW;
  });

  // Count completed tasks where member was the reviewer
  const reviewingTasksCompleted = tasks.filter(task => {
    return task.reviewerId === member.id && task.status === TaskStatus.DONE;
  }).length;

  // KPI Metric 1: Completion Rate (CR) = (Completed Tasks / Assigned Tasks)
  const completionRate = memberTasks.length > 0
    ? completedTasks.length / memberTasks.length
    : 0;

  // KPI Metric 2: Contribution points for productivity score
  // Assigned & Completed Task → 1.0 point each
  // Collaborator on Completed Task → 0.5 points
  // Reviewer of Completed Task → 0.3 points
  const assignedPoints = completedTasks.length * 1.0;
  const collaboratorPoints = collaboratingTasksCompleted.length * 0.5;
  const reviewerPoints = reviewingTasksCompleted * 0.3;
  const contributionScore = assignedPoints + collaboratorPoints + reviewerPoints;

  // KPI Metric 3: SLA Compliance (SLA) - percentage of tasks meeting SLA
  // A task meets SLA if:
  // - It's completed and was completed on or before the due date, OR
  // - It's not completed but the due date hasn't passed yet
  const tasksWithDueDate = memberTasks.filter(task => task.dueDate);
  const now = new Date();
  const tasksWithinSLA = tasksWithDueDate.filter(task => {
    const dueDate = new Date(task.dueDate!);
    if (task.status === TaskStatus.DONE) {
      // Completed task: check if it was completed on time
      const completedDate = new Date(task.updatedAt);
      return completedDate <= dueDate;
    } else {
      // Not completed: check if due date hasn't passed yet
      return dueDate >= now;
    }
  });
  const slaCompliance = tasksWithDueDate.length > 0
    ? tasksWithinSLA.length / tasksWithDueDate.length
    : 1; // If no tasks with due dates, consider fully compliant

  // KPI Metric 4: Collaboration Score (CS) - collaboration effectiveness
  const collaborationScore = collaboratingTasks.length > 0
    ? collaboratingTasksCompleted.length / collaboratingTasks.length
    : 0;

  // KPI Metric 5: Review Score (RS) - for tasks reviewed
  const totalReviewedTasks = reviewingTasksCompleted + reviewingTasks.length;
  const reviewScore = withReviewStage && totalReviewedTasks > 0
    ? reviewingTasksCompleted / totalReviewedTasks
    : 0;

  return {
    id: member.id,
    name: member.name,
    tasksAssigned: memberTasks.length,
    tasksCompleted: completedTasks.length,
    tasksInProgress: inProgressTasks.length,
    tasksOverdue: overdueTasks.length,
    tasksFollowing: collaboratingTasks.length,
    tasksFollowingCompleted: collaboratingTasksCompleted.length,
    tasksReviewing: reviewingTasks.length,
    tasksReviewingCompleted: reviewingTasksCompleted,
    contributionScore,
    contributionBreakdown: {
      assigned: assignedPoints,
      collaborator: collaboratorPoints,
      reviewer: reviewerPoints,
    },
    completionRate,
    slaCompliance,
    collaborationScore,
    reviewScore,
  };
}

/**
 * Calculate analytics for all members with KPI normalization
 */
export function calculateMemberAnalytics(
  members: Member[],
  tasks: PopulatedTask[],
  weights: KPIWeights,
  withReviewStage: boolean = true
): MemberAnalytics[] {
  // Calculate base metrics for each member (excluding customers)
  const memberStats = members
    .filter(member => member.role !== MemberRole.CUSTOMER)
    .map(member => calculateMemberMetrics(member, tasks, withReviewStage));

  // Find the maximum contribution score in the team for normalization
  const maxContributionScore = Math.max(...memberStats.map(m => m.contributionScore), 1);

  // Normalize productivity score and calculate weighted KPI
  return memberStats.map(member => {
    // Normalize productivity score (PS) to 0-1 scale
    const normalizedProductivityScore = member.contributionScore / maxContributionScore;

    // Calculate weighted KPI using weights (converted from percentage to decimal)
    const kpiScore = (
      member.completionRate * (weights.kpiCompletionWeight / 100) +
      normalizedProductivityScore * (weights.kpiProductivityWeight / 100) +
      member.slaCompliance * (weights.kpiSlaWeight / 100) +
      member.collaborationScore * (weights.kpiCollaborationWeight / 100) +
      (withReviewStage ? member.reviewScore * (weights.kpiReviewWeight / 100) : 0)
    );

    // Legacy productivity score for backward compatibility
    const productivityScore = Math.max(0, Math.round(
      (normalizedProductivityScore * 100) - (member.tasksOverdue * 2)
    ));

    return {
      ...member,
      productivityScore,
      normalizedProductivityScore,
      kpiScore: Math.round(kpiScore * 100), // Convert to percentage
    };
  }).sort((a, b) => b.kpiScore - a.kpiScore); // Sort by KPI score
}

// ============================================================================
// SERVICE ANALYTICS CALCULATION
// ============================================================================

/**
 * Calculate analytics for all services
 */
export function calculateServiceAnalytics(
  services: ServiceType[],
  tasks: PopulatedTask[]
): ServiceAnalytics[] {
  return services.map(service => {
    const serviceTasks = tasks.filter(task => task.serviceId === service.id);
    const completedTasks = serviceTasks.filter(task => task.status === TaskStatus.DONE);
    const inProgressTasks = serviceTasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
    const backlogTasks = serviceTasks.filter(task => task.status === TaskStatus.BACKLOG);
    const todoTasks = serviceTasks.filter(task => task.status === TaskStatus.TODO);
    const inReviewTasks = serviceTasks.filter(task => task.status === TaskStatus.IN_REVIEW);

    // Calculate health score based on completion rate and progress
    const completionRate = serviceTasks.length > 0
      ? (completedTasks.length / serviceTasks.length) * 100
      : 0;
    const progressRate = serviceTasks.length > 0
      ? ((completedTasks.length + inProgressTasks.length) / serviceTasks.length) * 100
      : 0;

    const healthScore = Math.round((completionRate * 0.6) + (progressRate * 0.4));

    return {
      id: service.id,
      name: service.name,
      totalTasks: serviceTasks.length,
      completedTasks: completedTasks.length,
      inProgressTasks: inProgressTasks.length,
      backlogTasks: backlogTasks.length,
      todoTasks: todoTasks.length,
      inReviewTasks: inReviewTasks.length,
      healthScore,
      completionRate,
      progressRate,
    };
  }).sort((a, b) => b.healthScore - a.healthScore);
}

// ============================================================================
// STATUS DISTRIBUTION CALCULATION
// ============================================================================

/**
 * Calculate task distribution by status
 */
export function calculateStatusDistribution(
  tasks: PopulatedTask[],
  includeArchived: boolean = false
): StatusDistribution {
  const distribution: StatusDistribution = {
    [TaskStatus.BACKLOG]: tasks.filter(t => t.status === TaskStatus.BACKLOG).length,
    [TaskStatus.TODO]: tasks.filter(t => t.status === TaskStatus.TODO).length,
    [TaskStatus.IN_PROGRESS]: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
    [TaskStatus.IN_REVIEW]: tasks.filter(t => t.status === TaskStatus.IN_REVIEW).length,
    [TaskStatus.DONE]: tasks.filter(t => t.status === TaskStatus.DONE).length,
  };

  if (includeArchived) {
    distribution[TaskStatus.ARCHIVED] = tasks.filter(t => t.status === TaskStatus.ARCHIVED).length;
  }

  return distribution;
}

// ============================================================================
// TEAM SUMMARY CALCULATION
// ============================================================================

/**
 * Calculate team-level summary metrics
 */
export function calculateTeamSummary(
  memberAnalytics: MemberAnalytics[],
  serviceAnalytics: ServiceAnalytics[],
  withReviewStage: boolean = true
): TeamSummary {
  const memberCount = memberAnalytics.length;

  return {
    avgKpiScore: memberCount > 0
      ? Math.round(memberAnalytics.reduce((sum, m) => sum + m.kpiScore, 0) / memberCount)
      : 0,
    avgCompletionRate: memberCount > 0
      ? Math.round(memberAnalytics.reduce((sum, m) => sum + m.completionRate, 0) / memberCount * 100)
      : 0,
    avgSlaCompliance: memberCount > 0
      ? Math.round(memberAnalytics.reduce((sum, m) => sum + m.slaCompliance, 0) / memberCount * 100)
      : 0,
    avgCollaborationScore: memberCount > 0
      ? Math.round(memberAnalytics.reduce((sum, m) => sum + m.collaborationScore, 0) / memberCount * 100)
      : 0,
    avgReviewScore: memberCount > 0 && withReviewStage
      ? Math.round(memberAnalytics.reduce((sum, m) => sum + m.reviewScore, 0) / memberCount * 100)
      : 0,
    highPerformers: memberAnalytics.filter(m => m.productivityScore >= 60).length,
    totalMembers: memberCount,
    healthyServices: serviceAnalytics.filter(s => s.healthScore >= 60).length,
    totalServices: serviceAnalytics.length,
  };
}

// ============================================================================
// KPI SCORE HELPERS
// ============================================================================

/**
 * Get KPI score rating label
 */
export function getKPIRating(kpiScore: number): {
  label: string;
  colorClass: string;
  bgClass: string;
} {
  if (kpiScore >= 80) {
    return { label: "Excellent", colorClass: "text-green-600", bgClass: "bg-green-500" };
  }
  if (kpiScore >= 60) {
    return { label: "Good", colorClass: "text-blue-600", bgClass: "bg-blue-500" };
  }
  if (kpiScore >= 40) {
    return { label: "Average", colorClass: "text-yellow-600", bgClass: "bg-yellow-500" };
  }
  return { label: "Needs Improvement", colorClass: "text-red-600", bgClass: "bg-red-500" };
}

/**
 * Format KPI breakdown string for tooltips
 */
export function formatKPIBreakdown(
  member: MemberAnalytics,
  weights: KPIWeights,
  withReviewStage: boolean = true
): string {
  const parts = [
    `(${(member.completionRate * 100).toFixed(0)}×${(weights.kpiCompletionWeight / 100).toFixed(2)})`,
    `(${(member.normalizedProductivityScore * 100).toFixed(0)}×${(weights.kpiProductivityWeight / 100).toFixed(2)})`,
    `(${(member.slaCompliance * 100).toFixed(0)}×${(weights.kpiSlaWeight / 100).toFixed(2)})`,
    `(${(member.collaborationScore * 100).toFixed(0)}×${(weights.kpiCollaborationWeight / 100).toFixed(2)})`,
  ];

  if (withReviewStage) {
    parts.push(`(${(member.reviewScore * 100).toFixed(0)}×${(weights.kpiReviewWeight / 100).toFixed(2)})`);
  }

  return parts.join(' + ');
}

// ============================================================================
// TASK FILTERING UTILITIES
// ============================================================================

/**
 * Filter tasks by date range
 */
export function filterTasksByDateRange(
  tasks: PopulatedTask[],
  dateFrom?: Date,
  dateTo?: Date
): PopulatedTask[] {
  return tasks.filter(task => {
    const taskDate = new Date(task.createdAt);
    if (dateFrom && taskDate < dateFrom) return false;
    if (dateTo && taskDate > dateTo) return false;
    return true;
  });
}

/**
 * Filter tasks by member (returns tasks where member is an assignee)
 */
export function filterTasksByMember(
  tasks: PopulatedTask[],
  memberId: string
): PopulatedTask[] {
  return tasks.filter(task =>
    task.assignees && task.assignees.some(a => a.id === memberId)
  );
}

/**
 * Filter tasks by service
 */
export function filterTasksByService(
  tasks: PopulatedTask[],
  serviceId: string
): PopulatedTask[] {
  return tasks.filter(task => task.serviceId === serviceId);
}

/**
 * Filter tasks by status
 */
export function filterTasksByStatus(
  tasks: PopulatedTask[],
  statuses: TaskStatus[]
): PopulatedTask[] {
  return tasks.filter(task => statuses.includes(task.status));
}

/**
 * Get overdue tasks
 */
export function getOverdueTasks(tasks: PopulatedTask[]): PopulatedTask[] {
  const now = new Date();
  return tasks.filter(task => {
    if (!task.dueDate || task.status === TaskStatus.DONE) return false;
    return new Date(task.dueDate) < now;
  });
}

/**
 * Get tasks due soon (within specified days)
 */
export function getTasksDueSoon(
  tasks: PopulatedTask[],
  daysAhead: number = 7
): PopulatedTask[] {
  const now = new Date();
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + daysAhead);

  return tasks.filter(task => {
    if (!task.dueDate || task.status === TaskStatus.DONE) return false;
    const dueDate = new Date(task.dueDate);
    return dueDate >= now && dueDate <= futureDate;
  });
}
