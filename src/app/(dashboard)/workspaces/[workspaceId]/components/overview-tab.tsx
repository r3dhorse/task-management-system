"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UsersIcon,
  CheckCircle2Icon,
  Clock3Icon,
  ListTodoIcon,
  Activity,
  Briefcase,
  Trophy,
} from "@/lib/lucide-icons";
import { TaskStatus, PopulatedTask } from "@/features/tasks/types";
import { Member, MemberRole } from "@/features/members/types";
import { cn } from "@/lib/utils";
import { TASK_STATUS_CONFIG } from "@/lib/constants/task-constants";

// ============================================================================
// TYPES
// ============================================================================

interface ServiceType {
  id: string;
  name: string;
  workspaceId: string;
  isPublic?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
}

interface MemberPerformance {
  id: string;
  name: string;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksOverdue: number;
  tasksFollowing: number;
  tasksFollowingCompleted: number;
  tasksReviewingCompleted: number;
  contributionScore: number;
  contributionBreakdown: {
    assigned: number;
    collaborator: number;
    reviewer: number;
  };
  productivityScore: number;
  completionRate: number;
}

interface ServicePerformance {
  id: string;
  name: string;
  tasksCompleted: number;
  tasksInProgress: number;
  totalTasks: number;
  completionRate: number;
  healthScore: number;
}

interface OverviewTabProps {
  tasks: PopulatedTask[];
  members: Member[];
  services: ServiceType[];
  workspaceName?: string;
  onNavigateToTasks?: () => void;
  onNavigateToMembers?: () => void;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function calculateMemberPerformance(
  tasks: PopulatedTask[],
  members: Member[]
): MemberPerformance[] {
  const memberStats = members
    .filter((member) => member.role !== MemberRole.VISITOR)
    .map((member) => {
      const memberTasks = tasks.filter((task) => task.assigneeId === member.id);
      const completedTasks = memberTasks.filter(
        (task) => task.status === TaskStatus.DONE
      );
      const activeTasks = memberTasks.filter(
        (task) =>
          task.status !== TaskStatus.TODO &&
          task.status !== TaskStatus.DONE &&
          task.status !== TaskStatus.ARCHIVED
      );
      const overdueTasks = memberTasks.filter((task) => {
        if (!task.dueDate || task.status === TaskStatus.DONE) return false;
        return new Date(task.dueDate) < new Date();
      });

      // Following tasks
      const followingTasks = tasks.filter((task) => {
        if (task.assigneeId === member.id) return false;
        if (task.followers && Array.isArray(task.followers)) {
          return task.followers.some(
            (follower: { id: string }) => follower.id === member.id
          );
        }
        return false;
      });
      const followingTasksCompleted = followingTasks.filter(
        (task) => task.status === TaskStatus.DONE
      );

      // Reviewed tasks
      const reviewingTasksCompleted = tasks.filter(
        (task) => task.reviewerId === member.id && task.status === TaskStatus.DONE
      ).length;

      // Calculations
      const completionRate =
        memberTasks.length > 0
          ? (completedTasks.length / memberTasks.length) * 100
          : 0;

      const assignedPoints = completedTasks.length * 1.0;
      const collaboratorPoints = followingTasksCompleted.length * 0.5;
      const reviewerPoints = reviewingTasksCompleted * 0.3;
      const contributionScore =
        assignedPoints + collaboratorPoints + reviewerPoints;

      return {
        id: member.id,
        name: member.name,
        tasksAssigned: memberTasks.length,
        tasksCompleted: completedTasks.length,
        tasksInProgress: activeTasks.length,
        tasksOverdue: overdueTasks.length,
        tasksFollowing: followingTasks.length,
        tasksFollowingCompleted: followingTasksCompleted.length,
        tasksReviewingCompleted: reviewingTasksCompleted,
        contributionScore,
        contributionBreakdown: {
          assigned: assignedPoints,
          collaborator: collaboratorPoints,
          reviewer: reviewerPoints,
        },
        productivityScore: 0,
        completionRate,
      };
    });

  const maxContributionScore = Math.max(
    ...memberStats.map((m) => m.contributionScore),
    1
  );

  return memberStats
    .map((member) => ({
      ...member,
      productivityScore: Math.max(
        0,
        Math.round(
          (member.contributionScore / maxContributionScore) * 100 -
            member.tasksOverdue * 2
        )
      ),
    }))
    .sort((a, b) => b.productivityScore - a.productivityScore);
}

function calculateServicePerformance(
  tasks: PopulatedTask[],
  services: ServiceType[]
): ServicePerformance[] {
  return services
    .map((service) => {
      const serviceTasks = tasks.filter((task) => task.serviceId === service.id);
      const serviceCompletedTasks = serviceTasks.filter(
        (task) => task.status === TaskStatus.DONE
      ).length;
      const serviceActiveTasks = serviceTasks.filter(
        (task) =>
          task.status !== TaskStatus.TODO &&
          task.status !== TaskStatus.DONE &&
          task.status !== TaskStatus.ARCHIVED
      ).length;
      const serviceTotalTasks = serviceTasks.length;

      const completionRate =
        serviceTotalTasks > 0
          ? (serviceCompletedTasks / serviceTotalTasks) * 100
          : 0;
      const progressRate =
        serviceTotalTasks > 0
          ? ((serviceCompletedTasks + serviceActiveTasks) / serviceTotalTasks) *
            100
          : 0;

      const healthScore = Math.round(completionRate * 0.6 + progressRate * 0.4);

      return {
        id: service.id,
        name: service.name,
        tasksCompleted: serviceCompletedTasks,
        tasksInProgress: serviceActiveTasks,
        totalTasks: serviceTotalTasks,
        completionRate,
        healthScore,
      };
    })
    .sort((a, b) => {
      if (b.healthScore !== a.healthScore) {
        return b.healthScore - a.healthScore;
      }
      return b.totalTasks - a.totalTasks;
    });
}

// ============================================================================
// STAT CARD COMPONENT
// ============================================================================

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  gradient: string;
  iconBg: string;
}

function StatCard({ title, value, subtitle, icon, gradient, iconBg }: StatCardProps) {
  return (
    <Card className={cn("border-0 shadow-lg", gradient)}>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-xs opacity-80">{subtitle}</p>}
          </div>
          <div className={cn("p-3 rounded-full", iconBg)}>{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function OverviewTab({
  tasks,
  members,
  services,
  workspaceName: _workspaceName,
  onNavigateToTasks,
  onNavigateToMembers,
}: OverviewTabProps) {
  // Calculate statistics
  const stats = useMemo(() => {
    const totalTasks = tasks.length;
    const completedTasks = tasks.filter(
      (task) => task.status === TaskStatus.DONE
    ).length;
    const inProgressTasks = tasks.filter(
      (task) => task.status === TaskStatus.IN_PROGRESS
    ).length;
    const memberCount = members.filter(
      (m) => m.role === MemberRole.MEMBER || m.role === MemberRole.ADMIN
    ).length;
    const visitorCount = members.filter(
      (m) => m.role === MemberRole.VISITOR
    ).length;

    const taskStatusCount = {
      [TaskStatus.BACKLOG]: tasks.filter(
        (task) => task.status === TaskStatus.BACKLOG
      ).length,
      [TaskStatus.TODO]: tasks.filter((task) => task.status === TaskStatus.TODO)
        .length,
      [TaskStatus.IN_PROGRESS]: inProgressTasks,
      [TaskStatus.IN_REVIEW]: tasks.filter(
        (task) => task.status === TaskStatus.IN_REVIEW
      ).length,
      [TaskStatus.DONE]: completedTasks,
    };

    return {
      totalTasks,
      completedTasks,
      inProgressTasks,
      memberCount,
      visitorCount,
      totalMembers: members.length,
      taskStatusCount,
    };
  }, [tasks, members]);

  // Calculate performance metrics
  const memberPerformance = useMemo(
    () => calculateMemberPerformance(tasks, members),
    [tasks, members]
  );

  const servicePerformance = useMemo(
    () => calculateServicePerformance(tasks, services),
    [tasks, services]
  );

  const topPerformers = memberPerformance.slice(0, 3);
  const topServices = servicePerformance.slice(0, 3);

  return (
    <div className="space-y-6">
      {/* Quick Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Members"
          value={stats.memberCount}
          subtitle={
            stats.visitorCount > 0
              ? `+ ${stats.visitorCount} visitors`
              : undefined
          }
          icon={<UsersIcon className="h-5 w-5 text-blue-600" />}
          gradient="bg-gradient-to-br from-blue-50 to-indigo-50"
          iconBg="bg-blue-100"
        />
        <StatCard
          title="Total Tasks"
          value={stats.totalTasks}
          subtitle="in date range"
          icon={<ListTodoIcon className="h-5 w-5 text-purple-600" />}
          gradient="bg-gradient-to-br from-purple-50 to-pink-50"
          iconBg="bg-purple-100"
        />
        <StatCard
          title="Completed"
          value={stats.completedTasks}
          subtitle={`${
            stats.totalTasks > 0
              ? Math.round((stats.completedTasks / stats.totalTasks) * 100)
              : 0
          }% completion`}
          icon={<CheckCircle2Icon className="h-5 w-5 text-emerald-600" />}
          gradient="bg-gradient-to-br from-emerald-50 to-teal-50"
          iconBg="bg-emerald-100"
        />
        <StatCard
          title="In Progress"
          value={stats.inProgressTasks}
          subtitle="active tasks"
          icon={<Clock3Icon className="h-5 w-5 text-amber-600" />}
          gradient="bg-gradient-to-br from-amber-50 to-orange-50"
          iconBg="bg-amber-100"
        />
      </div>

      {/* Task Status Breakdown & Top Performers */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Breakdown */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Activity className="h-5 w-5 text-white" />
              </div>
              Task Status Breakdown
            </CardTitle>
            {onNavigateToTasks && (
              <Button variant="outline" size="sm" onClick={onNavigateToTasks}>
                View Tasks
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(stats.taskStatusCount).map(([status, count]) => {
                const config = TASK_STATUS_CONFIG[status as TaskStatus];
                const percentage =
                  stats.totalTasks > 0 ? (count / stats.totalTasks) * 100 : 0;

                return (
                  <div key={status} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm">{config.emoji}</span>
                      <span className="text-sm font-medium">{config.label}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={cn("h-full rounded-full", config.color)}
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600 w-16 text-right">
                        {count} ({Math.round(percentage)}%)
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg">
                <Trophy className="h-5 w-5 text-white" />
              </div>
              Top Performers
            </CardTitle>
            {onNavigateToMembers && (
              <Button variant="outline" size="sm" onClick={onNavigateToMembers}>
                View All
              </Button>
            )}
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topPerformers.length > 0 ? (
                topPerformers.map((performer, index) => (
                  <div
                    key={performer.id}
                    className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold text-white",
                          index === 0
                            ? "bg-gradient-to-r from-yellow-400 to-yellow-600"
                            : index === 1
                            ? "bg-gradient-to-r from-gray-300 to-gray-500"
                            : "bg-gradient-to-r from-amber-500 to-amber-700"
                        )}
                      >
                        {index + 1}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {performer.name}
                        </p>
                        <p className="text-xs text-gray-500">
                          {performer.tasksCompleted}/{performer.tasksAssigned}{" "}
                          tasks
                        </p>
                      </div>
                    </div>
                    <Badge
                      className={cn(
                        "font-bold",
                        performer.productivityScore >= 80
                          ? "bg-green-100 text-green-700"
                          : performer.productivityScore >= 60
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {performer.productivityScore}%
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No performance data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Top Services */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
              <Briefcase className="h-5 w-5 text-white" />
            </div>
            Service Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topServices.length > 0 ? (
              topServices.map((service) => (
                <div
                  key={service.id}
                  className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-sm font-bold text-white">
                        {service.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="font-medium truncate max-w-[120px]">
                        {service.name}
                      </span>
                    </div>
                    <Badge
                      className={cn(
                        service.healthScore >= 70
                          ? "bg-green-100 text-green-700"
                          : service.healthScore >= 50
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"
                      )}
                    >
                      {service.healthScore}%
                    </Badge>
                  </div>
                  <div className="space-y-1 text-sm text-gray-600">
                    <div className="flex justify-between">
                      <span>Total Tasks:</span>
                      <span className="font-medium">{service.totalTasks}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Completed:</span>
                      <span className="font-medium text-green-600">
                        {service.tasksCompleted}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>In Progress:</span>
                      <span className="font-medium text-amber-600">
                        {service.tasksInProgress}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-full text-center py-8 text-gray-500">
                No services found
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default OverviewTab;
