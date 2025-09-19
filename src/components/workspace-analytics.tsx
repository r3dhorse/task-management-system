import { useMemo } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, subMonths, startOfWeek, endOfWeek } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUpIcon, Activity, Users, Target, Zap,
  Award, Clock, CheckCircle2, BarChart3, Calendar, Briefcase,
  AlertCircle, ListTodo, Timer, ArrowDown
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

interface ProductivityMetrics {
  tasksCreated: number;
  tasksCompleted: number;
  averageCompletionTime: number;
  completionRate: number;
  overdueRate: number;
}

interface MemberAnalytics {
  id: string;
  name: string;
  tasksAssigned: number;
  tasksCompleted: number;
  tasksInProgress: number;
  tasksOverdue: number;
  productivityScore: number;
  completionRate: number;
}

interface ServiceAnalytics {
  id: string;
  name: string;
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  backlogTasks: number;
  healthScore: number;
}

export const WorkspaceAnalytics = ({
  tasks,
  members,
  services,
  dateFrom,
  dateTo
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
    return members
      .filter(member => member.role !== MemberRole.VISITOR)
      .map(member => {
        const memberTasks = tasks.filter(task => task.assigneeId === member.id);
        const completedTasks = memberTasks.filter(task => task.status === TaskStatus.DONE);
        const inProgressTasks = memberTasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
        const overdueTasks = memberTasks.filter(task => {
          if (!task.dueDate || task.status === TaskStatus.DONE) return false;
          return new Date(task.dueDate) < new Date();
        });

        const completionRate = memberTasks.length > 0
          ? (completedTasks.length / memberTasks.length) * 100
          : 0;

        // Calculate productivity score (0-100)
        const productivityScore = Math.round(
          (completionRate * 0.4) +
          ((memberTasks.length / Math.max(tasks.length, 1)) * 100 * 0.3) +
          ((1 - (overdueTasks.length / Math.max(memberTasks.length, 1))) * 100 * 0.3)
        );

        return {
          id: member.id,
          name: member.name,
          tasksAssigned: memberTasks.length,
          tasksCompleted: completedTasks.length,
          tasksInProgress: inProgressTasks.length,
          tasksOverdue: overdueTasks.length,
          productivityScore,
          completionRate
        };
      })
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

  // Calculate weekly task completion trend
  const weeklyTrend = useMemo(() => {
    const now = new Date();
    const fourWeeksAgo = subMonths(now, 1);
    const weeks = [];

    for (let i = 0; i < 4; i++) {
      const weekStart = startOfWeek(subMonths(now, 0), { weekStartsOn: 1 });
      const weekEnd = endOfWeek(weekStart, { weekStartsOn: 1 });

      const weekTasks = tasks.filter(task => {
        const taskDate = new Date(task.updatedAt);
        return taskDate >= weekStart && taskDate <= weekEnd && task.status === TaskStatus.DONE;
      });

      weeks.push({
        week: `Week ${4 - i}`,
        completed: weekTasks.length
      });
    }

    return weeks.reverse();
  }, [tasks]);

  const getHealthColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    if (score >= 40) return "text-orange-600";
    return "text-red-600";
  };

  const getHealthBadge = (score: number) => {
    if (score >= 80) return { label: "Excellent", color: "bg-green-100 text-green-800" };
    if (score >= 60) return { label: "Good", color: "bg-yellow-100 text-yellow-800" };
    if (score >= 40) return { label: "Fair", color: "bg-orange-100 text-orange-800" };
    return { label: "Needs Attention", color: "bg-red-100 text-red-800" };
  };

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

        {/* Service Health Scores */}
        <Card className="border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              Service Health Scores
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {serviceAnalytics.slice(0, 5).map(service => {
                const health = getHealthBadge(service.healthScore);
                return (
                  <div key={service.id} className="flex items-center justify-between p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-gray-900">{service.name}</p>
                        <Badge className={`text-xs ${health.color}`}>
                          {health.label}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1 text-xs text-gray-600">
                        <span>{service.totalTasks} tasks</span>
                        <span>{service.completedTasks} completed</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`text-2xl font-bold ${getHealthColor(service.healthScore)}`}>
                        {service.healthScore}%
                      </p>
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
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2 px-3 text-sm font-medium text-gray-700">Member</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Assigned</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Completed</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">In Progress</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Overdue</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Completion Rate</th>
                  <th className="text-center py-2 px-3 text-sm font-medium text-gray-700">Productivity Score</th>
                </tr>
              </thead>
              <tbody>
                {memberAnalytics.map((member, index) => (
                  <tr key={member.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {index < 3 && (
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white
                            ${index === 0 ? 'bg-yellow-500' : index === 1 ? 'bg-gray-400' : 'bg-amber-600'}`}>
                            {index + 1}
                          </div>
                        )}
                        <span className="font-medium">{member.name}</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-3">{member.tasksAssigned}</td>
                    <td className="text-center py-3 px-3">
                      <span className="text-green-600 font-medium">{member.tasksCompleted}</span>
                    </td>
                    <td className="text-center py-3 px-3">
                      <span className="text-yellow-600 font-medium">{member.tasksInProgress}</span>
                    </td>
                    <td className="text-center py-3 px-3">
                      <span className={`font-medium ${member.tasksOverdue > 0 ? 'text-red-600' : 'text-gray-400'}`}>
                        {member.tasksOverdue}
                      </span>
                    </td>
                    <td className="text-center py-3 px-3">
                      <div className="flex items-center justify-center gap-2">
                        <Progress value={member.completionRate} className="w-16 h-2" />
                        <span className="text-sm font-medium">{member.completionRate.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td className="text-center py-3 px-3">
                      <Badge className={`${member.productivityScore >= 70 ? 'bg-green-100 text-green-800' :
                                         member.productivityScore >= 40 ? 'bg-yellow-100 text-yellow-800' :
                                         'bg-red-100 text-red-800'}`}>
                        {member.productivityScore}
                      </Badge>
                    </td>
                  </tr>
                ))}
                {memberAnalytics.length === 0 && (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-gray-500">
                      No member performance data available
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Workspace Health Summary */}
      <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
              <Activity className="h-5 w-5 text-white" />
            </div>
            <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Workspace Health Summary
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