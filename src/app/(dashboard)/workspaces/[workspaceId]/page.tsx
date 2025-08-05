"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useGetServices } from "@/features/services/api/use-get-services";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useWorkspaceAuthorization } from "@/features/workspaces/hooks/use-workspace-authorization";
import { useCurrent } from "@/features/auth/api/use-current";
import { Member, MemberRole } from "@/features/members/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/date-picker";
import { CalendarIcon, UsersIcon, CheckCircle2Icon, Clock3Icon, ListTodoIcon, BarChart3Icon, TrendingUpIcon, StarIcon, ZapIcon, Target, Activity, Award, Briefcase, Rocket, Trophy } from "lucide-react";
import { TaskStatus } from "@/features/tasks/types";
import { Models } from "node-appwrite";
import { subDays, isAfter, isBefore } from "date-fns";
import { DottedSeparator } from "@/components/dotted-separator";
import { UserInfoCard } from "@/components/user-info-card";

interface TaskStatusCount {
  [TaskStatus.BACKLOG]: number;
  [TaskStatus.TODO]: number;
  [TaskStatus.IN_PROGRESS]: number;
  [TaskStatus.IN_REVIEW]: number;
  [TaskStatus.DONE]: number;
}

interface MemberPerformance {
  id: string;
  name: string;
  tasksCompleted: number;
  tasksInProgress: number;
  totalTasks: number;
  completionRate: number;
}

interface ServicePerformance {
  id: string;
  name: string;
  tasksCompleted: number;
  tasksInProgress: number;
  totalTasks: number;
  completionRate: number;
}

interface PopulatedTask extends Models.Document {
  name: string;
  status: TaskStatus;
  workspaceId: string;
  assigneeId: string;
  projectId: string;
  position: number;
  dueDate: string;
  description?: string;
  attachmentId?: string;
  project?: Models.Document;
  assignees?: Models.Document[];
}

const WorkspaceIdPage = () => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());

  const { data: currentUser } = useCurrent();
  const { workspace, isLoading: isLoadingWorkspace, isAuthorized } = useWorkspaceAuthorization({ workspaceId });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({ workspaceId });
  const { data: services, isLoading: isLoadingServices } = useGetServices({ workspaceId });
  const { data: tasks, isLoading: isLoadingTasks } = useGetTasks({
    workspaceId,
    assigneeId: null,
    serviceId: null,
    status: null,
    search: null,
    dueDate: null,
  });

  const isLoading = isLoadingWorkspace || isLoadingMembers || isLoadingTasks || isLoadingServices;

  // Find current user's member record to check role
  const currentMember = members?.documents.find(member => 
    (member as Member).userId === currentUser?.id
  ) as Member | undefined;

  // Redirect visitors to workspace tasks page automatically
  useEffect(() => {
    if (currentMember && currentMember.role === MemberRole.VISITOR) {
      router.push(`/workspaces/${workspaceId}/workspace-tasks`);
    }
  }, [currentMember, workspaceId, router]);

  // Don't render anything if not authorized (redirection will happen)
  if (!isAuthorized) {
    return null;
  }

  // Filter tasks by date range
  // @ts-expect-error - Tasks are enriched with project and assignees from the API
  const filteredTasks = (tasks?.documents.filter((task) => {
    if (!dateFrom || !dateTo) return true;
    const taskDate = new Date(task.createdAt);
    return isAfter(taskDate, dateFrom) && isBefore(taskDate, dateTo);
  }) || []) as PopulatedTask[];

  // Calculate statistics
  const totalMembers = members?.documents.length || 0;
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter(task => task.status === TaskStatus.DONE).length;
  const inProgressTasks = filteredTasks.filter(task => task.status === TaskStatus.IN_PROGRESS).length;

  // Calculate task status breakdown
  const taskStatusCount: TaskStatusCount = {
    [TaskStatus.BACKLOG]: filteredTasks.filter(task => task.status === TaskStatus.BACKLOG).length,
    [TaskStatus.TODO]: filteredTasks.filter(task => task.status === TaskStatus.TODO).length,
    [TaskStatus.IN_PROGRESS]: inProgressTasks,
    [TaskStatus.IN_REVIEW]: filteredTasks.filter(task => task.status === TaskStatus.IN_REVIEW).length,
    [TaskStatus.DONE]: completedTasks
  };

  // Calculate member performance
  const memberPerformance: MemberPerformance[] = members?.documents
    .filter((member) => (member as Member).role !== MemberRole.VISITOR) // Exclude visitors
    .map((member) => {
      const memberTasks = filteredTasks.filter(task => task.assigneeId === member.id);
      const memberCompletedTasks = memberTasks.filter(task => task.status === TaskStatus.DONE).length;
      const memberInProgressTasks = memberTasks.filter(task => task.status === TaskStatus.IN_PROGRESS).length;
      const memberTotalTasks = memberTasks.length;
      const completionRate = memberTotalTasks > 0 ? (memberCompletedTasks / memberTotalTasks) * 100 : 0;

      return {
        id: member.id,
        name: member.name,
        tasksCompleted: memberCompletedTasks,
        tasksInProgress: memberInProgressTasks,
        totalTasks: memberTotalTasks,
        completionRate
      };
    })
    .sort((a, b) => b.completionRate - a.completionRate) || [];

  const topPerformers = memberPerformance.slice(0, 3);

  // Calculate service performance
  const servicePerformance: ServicePerformance[] = services?.documents.map((service) => {
    const serviceTasks = filteredTasks.filter(task => task.serviceId === service.id);
    const serviceCompletedTasks = serviceTasks.filter(task => task.status === TaskStatus.DONE).length;
    const serviceInProgressTasks = serviceTasks.filter(task => task.status === TaskStatus.IN_PROGRESS).length;
    const serviceTotalTasks = serviceTasks.length;
    const completionRate = serviceTotalTasks > 0 ? (serviceCompletedTasks / serviceTotalTasks) * 100 : 0;

    return {
      id: service.id,
      name: service.name,
      tasksCompleted: serviceCompletedTasks,
      tasksInProgress: serviceInProgressTasks,
      totalTasks: serviceTotalTasks,
      completionRate
    };
  })
    .sort((a, b) => b.completionRate - a.completionRate) || [];

  const topServices = servicePerformance.slice(0, 3);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="flex flex-col items-center gap-3">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          <p className="text-sm text-muted-foreground">Loading workspace...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col space-y-8 py-2">
      {/* Header */}
      <div className="flex justify-between items-start ">
        <div className="flex flex-col gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <BarChart3Icon className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
                  {workspace?.name || "Workspace Dashboard"}
                </h1>
                <p className="text-muted-foreground">
                  {workspace?.description || "Overview of workspace metrics and performance"}
                </p>
              </div>
            </div>
          </div>
          
          {/* Date Range Filter */}
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 w-full sm:w-auto max-w-[800px]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4 ">
              <div className="flex items-center gap-2">
                <CalendarIcon className="size-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Date Range:</span>
              </div>
              <div className="flex items-center gap-2">
                <DatePicker
                  value={dateFrom}
                  onChange={setDateFrom}
                  placeholder="From date"
                  className="w-40"
                />
                <span className="text-muted-foreground text-sm">to</span>
                <DatePicker
                  value={dateTo}
                  onChange={setDateTo}
                  placeholder="To date"
                  className="w-40"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    setDateTo(today);
                    setDateFrom(subDays(today, 7));
                  }}
                  className="bg-white hover:bg-blue-50"
                >
                  7 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    setDateTo(today);
                    setDateFrom(subDays(today, 15));
                  }}
                  className="bg-white hover:bg-blue-50"
                >
                  15 days
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const today = new Date();
                    setDateTo(today);
                    setDateFrom(subDays(today, 30));
                  }}
                  className="bg-white hover:bg-blue-50"
                >
                  30 days
                </Button>
              </div>
            </div>
          </Card>
        </div>
        
        {/* User Info */}
        <div className="hidden sm:flex items-start">
          <UserInfoCard />
        </div>
      </div>

      <DottedSeparator />

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-blue-500 to-blue-600 text-white">
          <div className="absolute inset-0 bg-black/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-blue-100">Total Members</CardTitle>
            <div className="p-2 bg-white/20 rounded-full">
              <UsersIcon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{totalMembers}</div>
            <p className="text-xs text-blue-100 mt-1">
              Active workspace members
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-purple-500 to-purple-600 text-white">
          <div className="absolute inset-0 bg-black/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-purple-100">Total Tasks</CardTitle>
            <div className="p-2 bg-white/20 rounded-full">
              <ListTodoIcon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{totalTasks}</div>
            <p className="text-xs text-purple-100 mt-1">
              In selected date range
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-green-500 to-green-600 text-white">
          <div className="absolute inset-0 bg-black/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-green-100">Completed Tasks</CardTitle>
            <div className="p-2 bg-white/20 rounded-full">
              <CheckCircle2Icon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{completedTasks}</div>
            <div className="flex items-center gap-1 mt-1">
              <TrendingUpIcon className="h-3 w-3" />
              <p className="text-xs text-green-100">
                {totalTasks > 0 ? `${Math.round((completedTasks / totalTasks) * 100)}% completion rate` : 'No tasks yet'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden border-0 shadow-lg bg-gradient-to-br from-orange-500 to-orange-600 text-white">
          <div className="absolute inset-0 bg-black/5" />
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative z-10">
            <CardTitle className="text-sm font-medium text-orange-100">In Progress</CardTitle>
            <div className="p-2 bg-white/20 rounded-full">
              <Clock3Icon className="h-4 w-4 text-white" />
            </div>
          </CardHeader>
          <CardContent className="relative z-10">
            <div className="text-3xl font-bold">{inProgressTasks}</div>
            <div className="flex items-center gap-1 mt-1">
              <ZapIcon className="h-3 w-3" />
              <p className="text-xs text-orange-100">
                Currently active tasks
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Task Status Distribution */}
        <Card className="border-0 shadow-lg">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <BarChart3Icon className="h-5 w-5 text-white" />
              </div>
              Task Status Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Object.entries(taskStatusCount).map(([status, count]) => {
                const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                return (
                  <div key={status} className="group hover:bg-gray-50 rounded-lg p-3 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div 
                          className={`w-4 h-4 rounded-full shadow-sm ${
                            status === TaskStatus.BACKLOG ? 'bg-gray-500' :
                            status === TaskStatus.TODO ? 'bg-blue-500' :
                            status === TaskStatus.IN_PROGRESS ? 'bg-yellow-500' :
                            status === TaskStatus.IN_REVIEW ? 'bg-purple-500' :
                            'bg-green-500'
                          }`}
                        />
                        <span className="text-sm font-medium text-gray-900">
                          {status === TaskStatus.IN_PROGRESS ? 'In Progress' :
                           status === TaskStatus.IN_REVIEW ? 'In Review' :
                           status.charAt(0) + status.slice(1).toLowerCase()}
                        </span>
                        <Badge variant="secondary" className="text-xs">
                          {count}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-24 bg-gray-200 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-300 ${
                              status === TaskStatus.BACKLOG ? 'bg-gray-500' :
                              status === TaskStatus.TODO ? 'bg-blue-500' :
                              status === TaskStatus.IN_PROGRESS ? 'bg-yellow-500' :
                              status === TaskStatus.IN_REVIEW ? 'bg-purple-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                        <span className="text-sm font-semibold text-gray-600 w-10">
                          {percentage.toFixed(0)}%
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-amber-50 to-orange-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-r from-amber-500 to-orange-600 rounded-lg">
                <Award className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-amber-600 to-orange-600 bg-clip-text text-transparent">
                🏆 TOP 3 Performers
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topPerformers.length > 0 ? (
                topPerformers.map((member, index) => {
                  const medalColors = [
                    'from-yellow-400 to-yellow-600', // Gold
                    'from-gray-300 to-gray-500',     // Silver
                    'from-amber-600 to-amber-800'   // Bronze
                  ];
                  const bgColors = [
                    'from-yellow-50 to-amber-50',
                    'from-gray-50 to-slate-50',
                    'from-amber-50 to-orange-50'
                  ];
                  
                  return (
                    <div key={member.id} className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${bgColors[index]} border border-white/50 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1`}>
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-4">
                          <div className={`relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${medalColors[index]} text-white shadow-lg`}>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                              {index === 0 ? <StarIcon className="w-2.5 h-2.5 text-yellow-500" /> :
                               index === 1 ? <StarIcon className="w-2.5 h-2.5 text-gray-500" /> :
                               <StarIcon className="w-2.5 h-2.5 text-amber-600" />}
                            </div>
                            <span className="text-base font-bold">#{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-base">{member.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex items-center gap-1">
                                <CheckCircle2Icon className="w-3 h-3 text-green-600" />
                                <span className="text-xs text-gray-600">{member.tasksCompleted} completed</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Activity className="w-3 h-3 text-blue-600" />
                                <span className="text-xs text-gray-600">{member.tasksInProgress} active</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-1">
                            <Target className="w-3 h-3 text-green-600" />
                            <span className="text-xl font-bold text-green-600">
                              {member.completionRate.toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {member.totalTasks} total tasks
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="px-3 pb-3">
                        <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-green-500 to-emerald-600 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${member.completionRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                    <Award className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">No Performance Data Yet</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Assign tasks to team members to see performance metrics and discover your top performers!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Top Services */}
        <Card className="border-0 shadow-lg bg-gradient-to-br from-indigo-50 to-purple-50">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-2 text-lg">
              <div className="p-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-lg">
                <Briefcase className="h-5 w-5 text-white" />
              </div>
              <span className="bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
                🚀 TOP 3 Services
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topServices.length > 0 ? (
                topServices.map((service, index) => {
                  const medalColors = [
                    'from-indigo-400 to-indigo-600', // Gold
                    'from-purple-300 to-purple-500',  // Silver
                    'from-blue-400 to-blue-600'      // Bronze
                  ];
                  const bgColors = [
                    'from-indigo-50 to-blue-50',
                    'from-purple-50 to-indigo-50',
                    'from-blue-50 to-purple-50'
                  ];
                  const icons = [Rocket, Trophy, Target];
                  const Icon = icons[index];
                  
                  return (
                    <div key={service.id} className={`relative overflow-hidden rounded-xl bg-gradient-to-r ${bgColors[index]} border border-white/50 shadow-sm hover:shadow-md transition-all duration-300 transform hover:-translate-y-1`}>
                      <div className="flex items-center justify-between p-3">
                        <div className="flex items-center gap-4">
                          <div className={`relative flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br ${medalColors[index]} text-white shadow-lg`}>
                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-white rounded-full flex items-center justify-center">
                              <Icon className="w-2.5 h-2.5 text-indigo-600" />
                            </div>
                            <span className="text-base font-bold">#{index + 1}</span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 text-base">{service.name}</p>
                            <div className="flex items-center gap-3 mt-1">
                              <div className="flex items-center gap-1">
                                <CheckCircle2Icon className="w-3 h-3 text-green-600" />
                                <span className="text-xs text-gray-600">{service.tasksCompleted} completed</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Activity className="w-3 h-3 text-blue-600" />
                                <span className="text-xs text-gray-600">{service.tasksInProgress} active</span>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-1 mb-1">
                            <Target className="w-3 h-3 text-indigo-600" />
                            <span className="text-xl font-bold text-indigo-600">
                              {service.completionRate.toFixed(1)}%
                            </span>
                          </div>
                          <p className="text-xs text-gray-600">
                            {service.totalTasks} total tasks
                          </p>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="px-3 pb-3">
                        <div className="w-full bg-white/60 rounded-full h-2 overflow-hidden">
                          <div 
                            className="h-full bg-gradient-to-r from-indigo-500 to-purple-600 rounded-full transition-all duration-500 ease-out"
                            style={{ width: `${service.completionRate}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-gray-200 to-gray-300 rounded-full flex items-center justify-center">
                    <Briefcase className="h-8 w-8 text-gray-400" />
                  </div>
                  <h3 className="font-medium text-gray-900 mb-2">No Service Data Yet</h3>
                  <p className="text-sm text-gray-500 max-w-sm mx-auto">
                    Create services and assign tasks to them to see service performance metrics!
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default WorkspaceIdPage;