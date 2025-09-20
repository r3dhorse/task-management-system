import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUpIcon, Activity, Users,
  Award, BarChart3, Briefcase,
  AlertCircle, Timer
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
}


export const WorkspaceAnalytics = ({
  tasks,
  members,
  services,
  dateFrom: _dateFrom,
  dateTo: _dateTo
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

  // Calculate member analytics
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
          // Count tasks where they are the designated reviewer
          return task.reviewerId === member.id && task.status === TaskStatus.IN_REVIEW;
        });

        // Count completed tasks where member was the reviewer
        const reviewingTasksCompleted = tasks.filter(task => {
          return task.reviewerId === member.id && task.status === TaskStatus.DONE;
        }).length;

        // Formula 1: Completion Rate = (Completed Tasks / Assigned Tasks) × 100
        const completionRate = memberTasks.length > 0
          ? (completedTasks.length / memberTasks.length) * 100
          : 0;

        // Formula 2: Contribution Score
        // Assigned & Completed Task → 1.0 point each
        // Collaborator on Completed Task → 0.5 points
        // Reviewer of Completed Task → 0.3 points
        const assignedPoints = completedTasks.length * 1.0;
        const collaboratorPoints = followingTasksCompleted.length * 0.5;
        const reviewerPoints = reviewingTasksCompleted * 0.3;
        const contributionScore = assignedPoints + collaboratorPoints + reviewerPoints;

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
          productivityScore: 0, // Will be calculated after finding max
          completionRate
        };
      });

    // Find the maximum contribution score in the team
    const maxContributionScore = Math.max(...memberStats.map(m => m.contributionScore), 1);

    // Formula 3: Productivity Score = (Contribution Score / Max Contribution Score) × 100 - (Overdue Tasks × 2)
    // Normalize and calculate final productivity score
    return memberStats.map(member => ({
      ...member,
      productivityScore: Math.max(0, Math.round(
        ((member.contributionScore / maxContributionScore) * 100) - (member.tasksOverdue * 2)
      ))
    }))
    .sort((a, b) => b.productivityScore - a.productivityScore);
  }, [tasks, members]);

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

      {/* Member Performance Table */}
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg">
              <Award className="h-5 w-5 text-white" />
            </div>
            Member Performance Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <div className={`${memberAnalytics.length > 6 ? 'max-h-96 overflow-y-auto' : ''}`}>
              <table className="w-full min-w-[800px] text-xs">
                <thead className="sticky top-0 bg-white">
                  <tr className="border-b">
                    <th className="text-left py-2 px-2 text-xs font-medium text-gray-700">Member</th>
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">Assigned</th>
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">Completed</th>
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">In Progress</th>
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">Overdue</th>
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">Collaborator (Done)</th>
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">Reviewer (Done)</th>
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">Completion Rate</th>
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">Contribution Score</th>
                    <th className="text-center py-2 px-1 text-xs font-medium text-gray-700">Productivity Score</th>
                  </tr>
                </thead>
                <tbody>
                {memberAnalytics.map((member, index) => (
                  <tr key={member.id} className="border-b hover:bg-gray-50">
                    <td className="py-2 px-2">
                      <div className="flex items-center gap-2">
                        {index < 3 && (
                          <div className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white
                            ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'}`}>
                            {index + 1}
                          </div>
                        )}
                        <span className="text-xs font-medium">{member.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-2 px-1 text-xs">{member.tasksAssigned}</td>
                    <td className="text-center py-2 px-1">
                      <span className="text-xs text-green-600 font-medium">{member.tasksCompleted}</span>
                    </td>
                    <td className="text-center py-2 px-1">
                      <span className="text-xs text-yellow-600 font-medium">{member.tasksInProgress}</span>
                    </td>
                    <td className="text-center py-2 px-1">
                      <span className={`text-xs font-medium ${member.tasksOverdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {member.tasksOverdue}
                      </span>
                    </td>
                    <td className="text-center py-3 px-1">
                      <span className="text-sm font-medium text-blue-600">
                        {member.tasksFollowingCompleted}
                      </span>
                    </td>
                    <td className="text-center py-3 px-1">
                      <span className="text-sm font-medium text-purple-600">
                        {member.tasksReviewingCompleted}
                      </span>
                    </td>
                    <td className="text-center py-3 px-1">
                      <div className="flex items-center justify-center gap-1">
                        <Progress value={member.completionRate} className="w-12 h-2" />
                        <span className="text-xs font-medium">
                          {member.tasksAssigned > 0 ? member.completionRate.toFixed(0) + '%' : 'N/A'}
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-1">
                      <div className="flex flex-col items-center">
                        <span className="text-sm font-bold text-blue-600">
                          {member.contributionScore.toFixed(1)}
                        </span>
                        <span className="text-xs text-gray-500">
                          {member.contributionBreakdown.assigned.toFixed(1)} + {member.contributionBreakdown.collaborator.toFixed(1)} + {member.contributionBreakdown.reviewer.toFixed(1)}
                        </span>
                      </div>
                    </td>
                    <td className="text-center py-2 px-1">
                      <Badge className={`text-xs ${member.productivityScore >= 70 ? 'bg-green-100 text-green-800' :
                                         member.productivityScore >= 40 ? 'bg-yellow-100 text-yellow-800' :
                                         'bg-red-100 text-red-800'}`}>
                        {member.productivityScore}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {memberAnalytics.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center py-8 text-gray-500">
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