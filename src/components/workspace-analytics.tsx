import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  TrendingUpIcon, Activity, Users,
  Award, BarChart3, Briefcase,
  AlertCircle, Timer, Info,
  CheckCircle2, Clock, UserCheck,
  Target
} from "@/lib/lucide-icons";
import { TaskStatus, PopulatedTask } from "@/features/tasks/types";
import { Member, MemberRole } from "@/features/members/types";

interface ServiceType {
  id: string;
  name: string;
  workspaceId: string;
  isPublic: boolean;
  createdAt: string | Date;
  updatedAt: string | Date;
}

interface WorkspaceAnalyticsProps {
  tasks: PopulatedTask[];
  members: Member[];
  services: ServiceType[];
  dateFrom?: Date;
  dateTo?: Date;
  withReviewStage?: boolean;
}


export const WorkspaceAnalytics = ({
  tasks,
  members,
  services,
  dateFrom: _dateFrom,
  dateTo: _dateTo,
  withReviewStage = true
}: WorkspaceAnalyticsProps) => {

  // Calculate productivity metrics
  const productivityMetrics = useMemo(() => {
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
    };
  }, [tasks]);

  // Calculate member analytics with enhanced KPI metrics
  const memberAnalytics = useMemo(() => {
    const memberStats = members
      .filter(member => member.role !== MemberRole.VISITOR) // Exclude visitors from performance metrics
      .map(member => {
        // Assigned tasks
        const memberTasks = tasks.filter(task => task.assigneeId === member.id);
        const completedTasks = memberTasks.filter(task => task.status === TaskStatus.DONE);
        const inProgressTasks = memberTasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
        const overdueTasks = memberTasks.filter(task => {
          if (!task.dueDate || task.status === TaskStatus.DONE) return false;
          return new Date(task.dueDate) < new Date();
        });

        // Tasks where member is a follower/collaborator (excluding where they are assignee)
        const followingTasks = tasks.filter(task => {
          if (task.assigneeId === member.id) return false;
          if (task.followers && Array.isArray(task.followers)) {
            return task.followers.some((follower: { id: string }) => follower.id === member.id);
          }
          return false;
        });
        const followingTasksCompleted = followingTasks.filter(task => task.status === TaskStatus.DONE);

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

        // KPI Metric 2: Productivity Score (PS) - based on contribution formula
        // Assigned & Completed Task → 1.0 point each
        // Collaborator on Completed Task → 0.5 points
        // Reviewer of Completed Task → 0.3 points
        const assignedPoints = completedTasks.length * 1.0;
        const collaboratorPoints = followingTasksCompleted.length * 0.5;
        const reviewerPoints = reviewingTasksCompleted * 0.3;
        const contributionScore = assignedPoints + collaboratorPoints + reviewerPoints;

        // KPI Metric 3: SLA Compliance (SLA) - tasks completed before due date
        const tasksWithDueDate = memberTasks.filter(task => task.dueDate);
        const tasksCompletedOnTime = completedTasks.filter(task => {
          if (!task.dueDate) return true; // Count tasks without due dates as compliant
          const dueDate = new Date(task.dueDate);
          const completedDate = new Date(task.updatedAt);
          return completedDate <= dueDate;
        });
        const slaCompliance = tasksWithDueDate.length > 0
          ? tasksCompletedOnTime.length / tasksWithDueDate.length
          : 1; // If no tasks with due dates, consider fully compliant

        // KPI Metric 4: Follower Score (FS) - collaboration effectiveness
        const followerScore = followingTasks.length > 0
          ? followingTasksCompleted.length / followingTasks.length
          : 0;

        // KPI Metric 5: Review Score (RS) - for tasks reviewed
        const totalReviewedTasks = reviewingTasksCompleted + reviewingTasks.length;
        const reviewScore = totalReviewedTasks > 0
          ? reviewingTasksCompleted / totalReviewedTasks
          : 0;

        const contributionBreakdown = {
          assigned: assignedPoints,
          collaborator: collaboratorPoints,
          reviewer: reviewerPoints,
        };

        return {
          id: member.id,
          name: member.name,
          tasksAssigned: memberTasks.length,
          tasksCompleted: completedTasks.length,
          tasksInProgress: inProgressTasks.length,
          tasksOverdue: overdueTasks.length,
          tasksFollowing: followingTasks.length,
          tasksFollowingCompleted: followingTasksCompleted.length,
          tasksReviewing: reviewingTasks.length,
          tasksReviewingCompleted: reviewingTasksCompleted,
          contributionScore,
          contributionBreakdown,
          productivityScore: 0, // Will be calculated after normalizing
          completionRate,
          slaCompliance,
          followerScore,
          reviewScore,
          kpiScore: 0 // Will be calculated based on weighted formula
        };
      });

    // Find the maximum contribution score in the team for normalization
    const maxContributionScore = Math.max(...memberStats.map(m => m.contributionScore), 1);

    // Normalize productivity score and calculate weighted KPI
    return memberStats.map(member => {
      // Normalize productivity score (PS) to 0-1 scale
      const normalizedProductivityScore = member.contributionScore / maxContributionScore;

      // Calculate weighted KPI based on workspace configuration
      let kpiScore: number;

      if (withReviewStage) {
        // With Reviewer Workspace weights
        kpiScore = (
          member.completionRate * 0.30 +        // 30% Completion Rate
          normalizedProductivityScore * 0.20 +   // 20% Productivity
          member.slaCompliance * 0.20 +          // 20% SLA Compliance
          member.followerScore * 0.15 +          // 15% Follower Contribution
          member.reviewScore * 0.15               // 15% Review Score
        );
      } else {
        // Without Reviewer Workspace weights (no review score)
        kpiScore = (
          member.completionRate * 0.35 +        // 35% Completion Rate
          normalizedProductivityScore * 0.25 +   // 25% Productivity
          member.slaCompliance * 0.25 +          // 25% SLA Compliance
          member.followerScore * 0.15             // 15% Follower Contribution
        );
      }

      // Legacy productivity score for backward compatibility
      const productivityScore = Math.max(0, Math.round(
        (normalizedProductivityScore * 100) - (member.tasksOverdue * 2)
      ));

      return {
        ...member,
        productivityScore,
        normalizedProductivityScore,
        kpiScore: Math.round(kpiScore * 100) // Convert to percentage
      };
    })
    .sort((a, b) => b.kpiScore - a.kpiScore); // Sort by KPI score instead of productivity
  }, [tasks, members, withReviewStage]);

  // Calculate service analytics
  const serviceAnalytics = useMemo(() => {
    return services.map(service => {
      const serviceTasks = tasks.filter(task => task.serviceId === service.id);
      const completedTasks = serviceTasks.filter(task => task.status === TaskStatus.DONE);
      const inProgressTasks = serviceTasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
      const backlogTasks = serviceTasks.filter(task => task.status === TaskStatus.BACKLOG);

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
        healthScore
      };
    }).sort((a, b) => b.healthScore - a.healthScore);
  }, [tasks, services]);

  // Calculate task distribution by status
  const statusDistribution = useMemo(() => {
    const distribution = {
      [TaskStatus.BACKLOG]: tasks.filter(t => t.status === TaskStatus.BACKLOG).length,
      [TaskStatus.TODO]: tasks.filter(t => t.status === TaskStatus.TODO).length,
      [TaskStatus.IN_PROGRESS]: tasks.filter(t => t.status === TaskStatus.IN_PROGRESS).length,
      [TaskStatus.IN_REVIEW]: tasks.filter(t => t.status === TaskStatus.IN_REVIEW).length,
      [TaskStatus.DONE]: tasks.filter(t => t.status === TaskStatus.DONE).length,
    };
    return distribution;
  }, [tasks]);



  return (
    <div className="space-y-6">
      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-0 shadow-lg bg-gradient-to-br from-blue-50 to-indigo-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-blue-900">Productivity Score</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-blue-600">
                  {Math.round(productivityMetrics.completionRate)}%
                </p>
                <p className="text-xs text-blue-600">Completion Rate</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <TrendingUpIcon className="h-5 w-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-green-900">Avg Completion Time</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-green-600">
                  {productivityMetrics.averageCompletionTime} days
                </p>
                <p className="text-xs text-green-600">Per Task</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <Timer className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-purple-50 to-pink-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-purple-900">Active Members</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-purple-600">
                  {memberAnalytics.filter(m => m.tasksAssigned > 0).length}
                </p>
                <p className="text-xs text-purple-600">of {members.length} total</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <Users className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg bg-gradient-to-br from-orange-50 to-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-orange-900">Overdue Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold text-orange-600">
                  {productivityMetrics.overdueRate.toFixed(1)}%
                </p>
                <p className="text-xs text-orange-600">Tasks Overdue</p>
              </div>
              <div className="p-3 bg-orange-100 rounded-full">
                <AlertCircle className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Task Status Breakdown & Weekly Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Task Status Breakdown */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <BarChart3 className="h-5 w-5 text-white" />
              </div>
              Task Status Breakdown
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(statusDistribution).map(([status, count]) => {
                const percentage = tasks.length > 0 ? (count / tasks.length) * 100 : 0;
                const colors: Record<string, string> = {
                  [TaskStatus.BACKLOG]: "bg-gray-500",
                  [TaskStatus.TODO]: "bg-blue-500",
                  [TaskStatus.IN_PROGRESS]: "bg-yellow-500",
                  [TaskStatus.IN_REVIEW]: "bg-purple-500",
                  [TaskStatus.DONE]: "bg-green-500"
                };

                return (
                  <div key={status}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">
                        {status === TaskStatus.IN_PROGRESS ? 'In Progress' :
                         status === TaskStatus.IN_REVIEW ? 'In Review' :
                         status.charAt(0) + status.slice(1).toLowerCase()}
                      </span>
                      <span className="text-sm text-gray-600">
                        {count} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <Progress value={percentage} className="h-2">
                      <div className={`h-full ${colors[status] || "bg-gray-500"} rounded-full`}
                           style={{ width: `${percentage}%` }} />
                    </Progress>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Service Metrics */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              Service Metrics
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`space-y-3 ${serviceAnalytics.length > 5 ? 'max-h-80 overflow-y-auto' : ''}`}>
              {serviceAnalytics.map(service => {
                return (
                  <div key={service.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{service.name}</p>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                        <span>{service.totalTasks} total</span>
                        <span>{service.completedTasks} completed</span>
                        <span>{service.inProgressTasks} in progress</span>
                        <span>{service.backlogTasks} backlog</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-blue-600">
                        {service.totalTasks > 0 ? Math.round((service.completedTasks / service.totalTasks) * 100) : 0}%
                      </p>
                      <p className="text-xs text-gray-500">completion</p>
                    </div>
                  </div>
                );
              })}
              {serviceAnalytics.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No service data available
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <Card className="border-0 shadow-md bg-gradient-to-br from-blue-50 to-blue-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-blue-900 flex items-center gap-1">
              <Target className="h-3 w-3" />
              Avg KPI Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-blue-600">
              {memberAnalytics.length > 0
                ? Math.round(memberAnalytics.reduce((sum, m) => sum + m.kpiScore, 0) / memberAnalytics.length)
                : 0}%
            </p>
            <p className="text-xs text-blue-600 mt-1">Team Average</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-green-50 to-green-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-green-900 flex items-center gap-1">
              <CheckCircle2 className="h-3 w-3" />
              Avg Completion
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-green-600">
              {memberAnalytics.length > 0
                ? Math.round(memberAnalytics.reduce((sum, m) => sum + m.completionRate, 0) / memberAnalytics.length * 100)
                : 0}%
            </p>
            <p className="text-xs text-green-600 mt-1">Tasks Completed</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-purple-50 to-purple-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-purple-900 flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Avg SLA
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-purple-600">
              {memberAnalytics.length > 0
                ? Math.round(memberAnalytics.reduce((sum, m) => sum + m.slaCompliance, 0) / memberAnalytics.length * 100)
                : 0}%
            </p>
            <p className="text-xs text-purple-600 mt-1">On-Time Delivery</p>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-md bg-gradient-to-br from-yellow-50 to-yellow-100">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs font-medium text-yellow-900 flex items-center gap-1">
              <Users className="h-3 w-3" />
              Collaboration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold text-yellow-700">
              {memberAnalytics.length > 0
                ? Math.round(memberAnalytics.reduce((sum, m) => sum + m.followerScore, 0) / memberAnalytics.length * 100)
                : 0}%
            </p>
            <p className="text-xs text-yellow-700 mt-1">Follower Score</p>
          </CardContent>
        </Card>

        {withReviewStage && (
          <Card className="border-0 shadow-md bg-gradient-to-br from-indigo-50 to-indigo-100">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-medium text-indigo-900 flex items-center gap-1">
                <UserCheck className="h-3 w-3" />
                Review Score
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold text-indigo-600">
                {memberAnalytics.length > 0
                  ? Math.round(memberAnalytics.reduce((sum, m) => sum + m.reviewScore, 0) / memberAnalytics.length * 100)
                  : 0}%
              </p>
              <p className="text-xs text-indigo-600 mt-1">Avg Review Rate</p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Member Performance Table with Enhanced KPI */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg">
                <Award className="h-5 w-5 text-white" />
              </div>
              Member Performance Analytics - KPI Dashboard
            </div>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <div className="flex items-center gap-1 text-sm text-gray-500 cursor-help">
                    <Info className="h-4 w-4" />
                    <span>KPI Weights: {withReviewStage ? 'With Review Stage' : 'Without Review Stage'}</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent className="max-w-md p-3">
                  <div className="space-y-2 text-xs">
                    <p className="font-semibold mb-2">⚖️ Weight Distribution:</p>
                    {withReviewStage ? (
                      <div className="space-y-1">
                        <div>• Completion Rate (CR): 30%</div>
                        <div>• Productivity (PS): 20%</div>
                        <div>• SLA Compliance (SLA): 20%</div>
                        <div>• Follower Contribution (FS): 15%</div>
                        <div>• Review Score (RS): 15%</div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        <div>• Completion Rate (CR): 35%</div>
                        <div>• Productivity (PS): 25%</div>
                        <div>• SLA Compliance (SLA): 25%</div>
                        <div>• Follower Contribution (FS): 15%</div>
                      </div>
                    )}
                  </div>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className={`${memberAnalytics.length > 6 ? 'max-h-96 overflow-y-auto' : ''}`}>
              <table className="w-full min-w-[1200px] text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-700">Rank</th>
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-700">Member</th>
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">KPI Score</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Overall performance score (0-100%)</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">CR</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Completion Rate: Completed/Assigned Tasks</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">PS</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Productivity Score: Contribution relative to team</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">SLA</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>SLA Compliance: Tasks completed on time</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <span className="cursor-help">FS</span>
                          </TooltipTrigger>
                          <TooltipContent>
                            <p>Follower Score: Collaboration effectiveness</p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </th>
                    {withReviewStage && (
                      <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="cursor-help">RS</span>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p>Review Score: Review completion rate</p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </th>
                    )}
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">Tasks</th>
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                {memberAnalytics.map((member, index) => {
                  const kpiBreakdown = withReviewStage
                    ? `(${(member.completionRate * 100).toFixed(0)}×0.30) + (${(member.normalizedProductivityScore * 100).toFixed(0)}×0.20) + (${(member.slaCompliance * 100).toFixed(0)}×0.20) + (${(member.followerScore * 100).toFixed(0)}×0.15) + (${(member.reviewScore * 100).toFixed(0)}×0.15)`
                    : `(${(member.completionRate * 100).toFixed(0)}×0.35) + (${(member.normalizedProductivityScore * 100).toFixed(0)}×0.25) + (${(member.slaCompliance * 100).toFixed(0)}×0.25) + (${(member.followerScore * 100).toFixed(0)}×0.15)`;

                  return (
                    <tr key={member.id} className="border-b hover:bg-gray-50">
                      <td className="py-2 px-2">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white
                          ${index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                            index === 1 ? 'bg-gradient-to-r from-gray-300 to-gray-500' :
                            index === 2 ? 'bg-gradient-to-r from-amber-500 to-amber-700' :
                            'bg-gray-200 text-gray-600'}`}>
                          {index + 1}
                        </div>
                      </td>
                      <td className="py-2 px-2">
                        <span className="text-xs font-medium">{member.name}</span>
                      </td>
                      <td className="text-center py-2 px-1">
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <div className="inline-flex flex-col items-center cursor-help">
                                <Badge className={`text-xs font-bold ${member.kpiScore >= 80 ? 'bg-gradient-to-r from-green-500 to-green-600 text-white' :
                                                   member.kpiScore >= 60 ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white' :
                                                   member.kpiScore >= 40 ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' :
                                                   'bg-gradient-to-r from-red-500 to-red-600 text-white'}`}>
                                  {member.kpiScore}%
                                </Badge>
                                <span className={`text-[10px] mt-0.5 font-medium ${
                                  member.kpiScore >= 80 ? 'text-green-600' :
                                  member.kpiScore >= 60 ? 'text-blue-600' :
                                  member.kpiScore >= 40 ? 'text-yellow-600' :
                                  'text-red-600'
                                }`}>
                                  {member.kpiScore >= 80 ? 'Excellent' :
                                   member.kpiScore >= 60 ? 'Good' :
                                   member.kpiScore >= 40 ? 'Average' :
                                   'Needs Improvement'}
                                </span>
                              </div>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <div className="space-y-2 text-xs">
                                <p className="font-semibold">📊KPI Calculation:</p>
                                <p className="font-mono text-[10px] bg-gray-100 p-1 rounded">{kpiBreakdown}</p>
                                <p className="font-semibold mt-1">= {member.kpiScore}%</p>
                                <div className="mt-2 pt-2 border-t">
                                  <p className="font-semibold mb-1">Score Breakdown:</p>
                                  <div className="space-y-0.5 text-[11px]">
                                    <div>CR: {(member.completionRate * 100).toFixed(0)}% × {withReviewStage ? '30%' : '35%'} = {(member.completionRate * (withReviewStage ? 30 : 35)).toFixed(1)}%</div>
                                    <div>PS: {(member.normalizedProductivityScore * 100).toFixed(0)}% × {withReviewStage ? '20%' : '25%'} = {(member.normalizedProductivityScore * (withReviewStage ? 20 : 25)).toFixed(1)}%</div>
                                    <div>SLA: {(member.slaCompliance * 100).toFixed(0)}% × {withReviewStage ? '20%' : '25%'} = {(member.slaCompliance * (withReviewStage ? 20 : 25)).toFixed(1)}%</div>
                                    <div>FS: {(member.followerScore * 100).toFixed(0)}% × 15% = {(member.followerScore * 15).toFixed(1)}%</div>
                                    {withReviewStage && <div>RS: {(member.reviewScore * 100).toFixed(0)}% × 15% = {(member.reviewScore * 15).toFixed(1)}%</div>}
                                  </div>
                                </div>
                              </div>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </td>
                      <td className="text-center py-2 px-1">
                        <div className="flex items-center justify-center gap-1">
                          <Progress value={member.completionRate * 100} className="w-12 h-2" />
                          <span className="text-xs font-medium">
                            {(member.completionRate * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-2 px-1">
                        <div className="flex items-center justify-center gap-1">
                          <Progress value={member.normalizedProductivityScore * 100} className="w-12 h-2" />
                          <span className="text-xs font-medium">
                            {(member.normalizedProductivityScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-2 px-1">
                        <div className="flex items-center justify-center gap-1">
                          <Progress value={member.slaCompliance * 100} className="w-12 h-2" />
                          <span className="text-xs font-medium">
                            {(member.slaCompliance * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-2 px-1">
                        <div className="flex items-center justify-center gap-1">
                          <Progress value={member.followerScore * 100} className="w-12 h-2" />
                          <span className="text-xs font-medium">
                            {(member.followerScore * 100).toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      {withReviewStage && (
                        <td className="text-center py-2 px-1">
                          <div className="flex items-center justify-center gap-1">
                            <Progress value={member.reviewScore * 100} className="w-12 h-2" />
                            <span className="text-xs font-medium">
                              {(member.reviewScore * 100).toFixed(0)}%
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="text-center py-2 px-1">
                        <div className="flex flex-col items-center">
                          <span className="text-xs">
                            <span className="text-green-600 font-medium">{member.tasksCompleted}</span>
                            <span className="text-gray-400">/</span>
                            <span className="text-gray-600">{member.tasksAssigned}</span>
                          </span>
                        </div>
                      </td>
                      <td className="text-center py-2 px-1">
                        <span className={`text-xs font-medium ${member.tasksOverdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                          {member.tasksOverdue}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {memberAnalytics.length === 0 && (
                  <tr>
                    <td colSpan={withReviewStage ? 10 : 9} className="text-center py-8 text-gray-500">
                      No member performance data available
                    </td>
                  </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Summary */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Workspace Summary
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Overall Productivity</p>
              <p className="text-3xl font-bold text-indigo-600">
                {Math.round(productivityMetrics.completionRate)}%
              </p>
              <p className="text-xs text-gray-500 mt-1">
                {productivityMetrics.tasksCompleted} of {productivityMetrics.tasksCreated} tasks completed
              </p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Team Efficiency</p>
              <p className="text-3xl font-bold text-purple-600">
                {memberAnalytics.filter(m => m.productivityScore >= 60).length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                high-performing members
              </p>
            </div>
            <div className="text-center p-4 bg-white rounded-lg">
              <p className="text-sm text-gray-600 mb-2">Service Health</p>
              <p className="text-3xl font-bold text-green-600">
                {serviceAnalytics.filter(s => s.healthScore >= 60).length}
              </p>
              <p className="text-xs text-gray-500 mt-1">
                healthy services
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};