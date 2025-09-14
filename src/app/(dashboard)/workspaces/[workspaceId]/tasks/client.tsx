"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/date-picker";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useGetTasks } from "@/features/tasks/api/use-get-tasks";
import { useCurrent } from "@/features/auth/api/use-current";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { TaskStatus } from "@/features/tasks/types";
import { TaskListModal } from "@/features/tasks/components/task-list-modal";

interface MemberDocument {
  id: string;
  userId: string;
  workspaceId: string;
  role: string;
  joinedAt: string;
  name: string;
  email: string;
}

interface TaskDocument {
  id: string;
  name: string;
  status: TaskStatus;
  workspaceId: string;
  serviceId: string;
  dueDate: string | null;
  description?: string;
  createdAt: string;
  updatedAt: string;
  service?: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    user: {
      name: string;
      email: string;
    };
  };
}


import {
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  BarChart3,
  Zap,
  ListTodo,
  ArrowLeft,
  Sparkles,
  Activity,
  Timer,
  FolderOpen,
  ArrowUp,
  ArrowDown
} from "@/lib/lucide-icons";
import { subDays, isAfter, isBefore, startOfWeek, endOfWeek, format, differenceInDays } from "date-fns";
import { useRouter } from "next/navigation";

interface TaskStatusCount {
  [TaskStatus.BACKLOG]: number;
  [TaskStatus.TODO]: number;
  [TaskStatus.IN_PROGRESS]: number;
  [TaskStatus.IN_REVIEW]: number;
  [TaskStatus.DONE]: number;
  [TaskStatus.ARCHIVED]: number;
}

export const MyTasksClient = () => {
  const workspaceId = useWorkspaceId();
  const router = useRouter();
  const { data: user } = useCurrent();
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({ workspaceId });
  const [dateFrom, setDateFrom] = useState<Date | undefined>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date | undefined>(new Date());
  const [hoveredCard, setHoveredCard] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTitle, setModalTitle] = useState("");
  const [modalTasks, setModalTasks] = useState<TaskDocument[]>([]);
  const [modalFilterType, setModalFilterType] = useState("");

  // Find the current user's member record
  const currentMember = members?.documents.find((member) => (member as MemberDocument).userId === user?.id) as MemberDocument | undefined;

  const { data: allTasks, isLoading: isLoadingTasks } = useGetTasks({
    workspaceId,
    assigneeId: currentMember?.id || null,
  });

  const isLoading = isLoadingMembers || isLoadingTasks;

  if (isLoading) {
    return <LoadingSpinner variant="fullscreen" />;
  }

  if (!currentMember) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex-shrink-0 px-6 py-4 border-b bg-white/80 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2 hover:bg-slate-100 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="border-l h-6 border-slate-200" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">My Tasks</h1>
              <p className="text-sm text-slate-500">Personal Dashboard</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="relative inline-block">
                  <ListTodo className="h-16 w-16 mx-auto mb-6 text-slate-300" />
                  <div className="absolute -top-1 -right-1 h-6 w-6 bg-amber-400 rounded-full animate-pulse" />
                </div>
                <p className="text-lg font-medium text-slate-700 mb-2">Not a workspace member</p>
                <p className="text-sm text-slate-500">Please join the workspace to see your tasks</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!allTasks || !allTasks.documents) {
    return (
      <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex-shrink-0 px-6 py-4 border-b bg-white/80 backdrop-blur-sm shadow-sm">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2 hover:bg-slate-100 transition-all duration-200"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="border-l h-6 border-slate-200" />
            <div>
              <h1 className="text-xl font-semibold text-slate-900">My Tasks</h1>
              <p className="text-sm text-slate-500">Personal productivity dashboard</p>
            </div>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-6">
          <Card className="max-w-md w-full shadow-xl border-0 bg-white/90 backdrop-blur-sm">
            <CardContent className="flex items-center justify-center py-16">
              <div className="text-center">
                <div className="relative inline-block">
                  <ListTodo className="h-16 w-16 mx-auto mb-6 text-slate-300" />
                  <Sparkles className="absolute -top-1 -right-1 h-6 w-6 text-amber-400 animate-pulse" />
                </div>
                <p className="text-lg font-medium text-slate-700 mb-2">No tasks assigned</p>
                <p className="text-sm text-slate-500">Ask your workspace admin to assign tasks</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const tasks = allTasks.documents || [];

  // Filter tasks by date range
  const filteredTasks = tasks.filter((task: typeof tasks[0]) => {
    if (!dateFrom || !dateTo) return true;
    const taskDate = new Date(task.createdAt);
    return isAfter(taskDate, dateFrom) && isBefore(taskDate, dateTo);
  });

  // Calculate basic metrics
  const totalTasks = filteredTasks.length;
  const completedTasks = filteredTasks.filter((task) => (task as unknown as TaskDocument).status === TaskStatus.DONE).length;
  const inProgressTasks = filteredTasks.filter((task) => (task as unknown as TaskDocument).status === TaskStatus.IN_PROGRESS).length;
  const todoTasks = filteredTasks.filter((task) => (task as unknown as TaskDocument).status === TaskStatus.TODO).length;

  // Calculate overdue tasks
  const overdueTasks = filteredTasks.filter((task) => {
    const taskDoc = task as unknown as TaskDocument;
    if (!taskDoc.dueDate) return false;
    const dueDate = new Date(taskDoc.dueDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return dueDate < today && taskDoc.status !== TaskStatus.DONE;
  }).length;

  // Calculate due this week
  const thisWeekStart = startOfWeek(new Date());
  const thisWeekEnd = endOfWeek(new Date());
  const dueThisWeek = filteredTasks.filter((task) => {
    const taskDoc = task as unknown as TaskDocument;
    if (!taskDoc.dueDate) return false;
    const dueDate = new Date(taskDoc.dueDate);
    return isAfter(dueDate, thisWeekStart) && isBefore(dueDate, thisWeekEnd) && taskDoc.status !== TaskStatus.DONE;
  }).length;

  // Calculate completion rate and productivity metrics
  const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Weekly productivity (tasks completed this week)
  const thisWeekCompleted = filteredTasks.filter((task) => {
    if ((task as unknown as TaskDocument).status !== TaskStatus.DONE) return false;
    const completedDate = new Date((task as unknown as TaskDocument).updatedAt);
    return isAfter(completedDate, thisWeekStart) && isBefore(completedDate, thisWeekEnd);
  }).length;

  // Previous week completed for comparison
  const lastWeekStart = subDays(thisWeekStart, 7);
  const lastWeekEnd = subDays(thisWeekEnd, 7);
  const lastWeekCompleted = filteredTasks.filter((task) => {
    if ((task as unknown as TaskDocument).status !== TaskStatus.DONE) return false;
    const completedDate = new Date((task as unknown as TaskDocument).updatedAt);
    return isAfter(completedDate, lastWeekStart) && isBefore(completedDate, lastWeekEnd);
  }).length;

  const weeklyChange = lastWeekCompleted > 0
    ? Math.round(((thisWeekCompleted - lastWeekCompleted) / lastWeekCompleted) * 100)
    : thisWeekCompleted > 0 ? 100 : 0;

  // Task status breakdown
  const taskStatusCount: TaskStatusCount = {
    [TaskStatus.BACKLOG]: filteredTasks.filter((task) => (task as unknown as TaskDocument).status === TaskStatus.BACKLOG).length,
    [TaskStatus.TODO]: todoTasks,
    [TaskStatus.IN_PROGRESS]: inProgressTasks,
    [TaskStatus.IN_REVIEW]: filteredTasks.filter((task) => (task as unknown as TaskDocument).status === TaskStatus.IN_REVIEW).length,
    [TaskStatus.DONE]: completedTasks,
    [TaskStatus.ARCHIVED]: 0 // Archived tasks are filtered out and not displayed
  };

  // Calculate average completion time
  const completedTasksWithTime = filteredTasks.filter((task) =>
    (task as unknown as TaskDocument).status === TaskStatus.DONE && (task as unknown as TaskDocument).createdAt && (task as unknown as TaskDocument).updatedAt
  );

  const avgCompletionTime = completedTasksWithTime.length > 0
    ? Math.round(
        completedTasksWithTime.reduce((acc, task) => {
          const created = new Date((task as unknown as TaskDocument).createdAt);
          const updated = new Date((task as unknown as TaskDocument).updatedAt);
          return acc + differenceInDays(updated, created);
        }, 0) / completedTasksWithTime.length
      )
    : 0;

  const statusConfig = {
    [TaskStatus.BACKLOG]: { color: 'slate', bgColor: 'bg-slate-500', lightBg: 'bg-slate-100', textColor: 'text-slate-700' },
    [TaskStatus.TODO]: { color: 'blue', bgColor: 'bg-blue-500', lightBg: 'bg-blue-100', textColor: 'text-blue-700' },
    [TaskStatus.IN_PROGRESS]: { color: 'amber', bgColor: 'bg-amber-500', lightBg: 'bg-amber-100', textColor: 'text-amber-700' },
    [TaskStatus.IN_REVIEW]: { color: 'purple', bgColor: 'bg-purple-500', lightBg: 'bg-purple-100', textColor: 'text-purple-700' },
    [TaskStatus.DONE]: { color: 'emerald', bgColor: 'bg-emerald-500', lightBg: 'bg-emerald-100', textColor: 'text-emerald-700' },
    [TaskStatus.ARCHIVED]: { color: 'gray', bgColor: 'bg-gray-400', lightBg: 'bg-gray-100', textColor: 'text-gray-500' }
  };

  // Modal handlers for metric cards
  const handleCardClick = (filterType: string) => {
    let filteredModalTasks: TaskDocument[] = [];
    let title = "";

    switch (filterType) {
      case 'completed':
        filteredModalTasks = filteredTasks.filter(task => (task as unknown as TaskDocument).status === TaskStatus.DONE) as TaskDocument[];
        title = "Completed Tasks";
        break;
      case 'progress':
        filteredModalTasks = filteredTasks.filter(task => (task as unknown as TaskDocument).status === TaskStatus.IN_PROGRESS) as TaskDocument[];
        title = "In Progress Tasks";
        break;
      case 'overdue':
        filteredModalTasks = filteredTasks.filter((task) => {
          const taskDoc = task as unknown as TaskDocument;
          if (!taskDoc.dueDate) return false;
          const dueDate = new Date(taskDoc.dueDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          return dueDate < today && taskDoc.status !== TaskStatus.DONE;
        }) as TaskDocument[];
        title = "Overdue Tasks";
        break;
      case 'total':
        filteredModalTasks = filteredTasks as TaskDocument[];
        title = "All Tasks";
        break;
      case 'todo':
        filteredModalTasks = filteredTasks.filter(task => (task as unknown as TaskDocument).status === TaskStatus.TODO) as TaskDocument[];
        title = "To Do Tasks";
        break;
      case 'backlog':
        filteredModalTasks = filteredTasks.filter(task => (task as unknown as TaskDocument).status === TaskStatus.BACKLOG) as TaskDocument[];
        title = "Backlog Tasks";
        break;
      case 'review':
        filteredModalTasks = filteredTasks.filter(task => (task as unknown as TaskDocument).status === TaskStatus.IN_REVIEW) as TaskDocument[];
        title = "In Review Tasks";
        break;
      default:
        filteredModalTasks = filteredTasks as TaskDocument[];
        title = "All Tasks";
        break;
    }

    setModalTasks(filteredModalTasks as TaskDocument[]);
    setModalTitle(title);
    setModalFilterType(filterType);
    setModalOpen(true);
  };

  return (
    <div className="h-screen flex flex-col bg-gradient-to-br from-slate-50 via-slate-50 to-slate-100">
      {/* Enhanced Header */}
      <div className="flex-shrink-0 px-6 py-5 border-b bg-white/80 backdrop-blur-sm shadow-sm z-0">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div className="flex items-center gap-4 flex-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => router.back()}
              className="flex items-center gap-2 hover:bg-slate-100 transition-all duration-200 hover:scale-105"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="border-l h-8 border-slate-200" />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900">My Tasks</h1>
                <div className="px-2 py-0.5 bg-gradient-to-r from-blue-500 to-purple-500 text-white text-xs font-medium rounded-full">
                  Personal
                </div>
              </div>
              <p className="text-sm text-slate-500 mt-0.5">Track your productivity and progress</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Enhanced with animations */}
      <div className="flex-1 overflow-auto z-0">
        <div className="p-4 lg:p-6 space-y-4 lg:space-y-6 z-0">

          {/* Date Range Filter - AT THE TOP */}
          <Card className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200 w-full relative z-10">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="size-4 text-blue-600" />
                  <span className="text-sm font-medium text-blue-900">Date Range:</span>
                </div>
                <div className="flex items-center gap-2 flex-wrap relative z-20">
                  <DatePicker
                    value={dateFrom}
                    onChange={setDateFrom}
                    placeholder="From date"
                    className="w-44 min-w-[11rem]"
                  />
                  <span className="text-muted-foreground text-sm shrink-0">to</span>
                  <DatePicker
                    value={dateTo}
                    onChange={setDateTo}
                    placeholder="To date"
                    className="w-44 min-w-[11rem]"
                  />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      const today = new Date();
                      setDateTo(today);
                      setDateFrom(subDays(today, 7));
                    }}
                    className="bg-white hover:bg-blue-50 text-xs px-3"
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
                    className="bg-white hover:bg-blue-50 text-xs px-3"
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
                    className="bg-white hover:bg-blue-50 text-xs px-3"
                  >
                    30 days
                  </Button>
                </div>
              </div>

              {/* User Name - Aligned Right */}
              <div className="flex items-center gap-2 lg:ml-auto">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-white/70 rounded-lg border border-blue-200">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-900">
                    {user?.name || currentMember?.name || 'User'}
                  </span>
                </div>
              </div>
            </div>
          </Card>

          {/* Primary Metrics Cards - Small Cards in the MIDDLE */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 z-0">
            <Card
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 bg-white/90 backdrop-blur-sm cursor-pointer z-0"
              onMouseEnter={() => setHoveredCard('total')}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handleCardClick('total')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">Total Tasks</CardTitle>
                <div className={`p-2 rounded-lg transition-all duration-300 ${hoveredCard === 'total' ? 'bg-slate-100 scale-110' : 'bg-slate-50'}`}>
                  <ListTodo className="h-4 w-4 text-slate-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">{totalTasks}</div>
                <p className="text-xs text-slate-500 mt-1">In selected range</p>
                <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-slate-400 to-slate-600 rounded-full transition-all duration-500" style={{ width: '100%' }} />
                </div>
                <p className="text-xs text-slate-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to view all tasks</p>
              </CardContent>
            </Card>

            <Card
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 bg-white/90 backdrop-blur-sm cursor-pointer z-0"
              onMouseEnter={() => setHoveredCard('completed')}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handleCardClick('completed')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-emerald-600">Completed</CardTitle>
                <div className={`p-2 rounded-lg transition-all duration-300 ${hoveredCard === 'completed' ? 'bg-emerald-100 scale-110' : 'bg-emerald-50'}`}>
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-emerald-600">{completedTasks}</div>
                <div className="flex items-center gap-1 mt-1">
                  <p className="text-xs text-slate-500">{completionRate}% completion rate</p>
                  {completionRate >= 75 && <Sparkles className="h-3 w-3 text-amber-400" />}
                </div>
                <div className="mt-2 h-1 bg-emerald-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-emerald-400 to-emerald-600 rounded-full transition-all duration-500" style={{ width: `${completionRate}%` }} />
                </div>
                <p className="text-xs text-emerald-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to view completed tasks</p>
              </CardContent>
            </Card>

            <Card
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 bg-white/90 backdrop-blur-sm cursor-pointer z-0"
              onMouseEnter={() => setHoveredCard('progress')}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handleCardClick('progress')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-600">In Progress</CardTitle>
                <div className={`p-2 rounded-lg transition-all duration-300 ${hoveredCard === 'progress' ? 'bg-amber-100 scale-110' : 'bg-amber-50'}`}>
                  <Clock className="h-4 w-4 text-amber-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-amber-600">{inProgressTasks}</div>
                <p className="text-xs text-slate-500 mt-1">Currently active</p>
                <div className="mt-2 flex gap-0.5">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className={`h-1 flex-1 rounded-full ${i < Math.min(inProgressTasks, 3) ? 'bg-amber-400' : 'bg-amber-100'}`} />
                  ))}
                </div>
                <p className="text-xs text-amber-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to view in progress tasks</p>
              </CardContent>
            </Card>

            <Card
              className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 bg-white/90 backdrop-blur-sm cursor-pointer z-0"
              onMouseEnter={() => setHoveredCard('overdue')}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handleCardClick('overdue')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-red-600">Overdue</CardTitle>
                <div className={`p-2 rounded-lg transition-all duration-300 ${hoveredCard === 'overdue' ? 'bg-red-100 scale-110' : 'bg-red-50'}`}>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-red-600">{overdueTasks}</div>
                <p className="text-xs text-slate-500 mt-1">Need attention</p>
                {overdueTasks > 0 && (
                  <div className="mt-2 text-xs text-red-600 animate-pulse">
                    Action required
                  </div>
                )}
                <p className="text-xs text-red-400 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">Click to view overdue tasks</p>
              </CardContent>
            </Card>
          </div>

          {/* Secondary Metrics Cards - MORE SMALL CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card
              className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-orange-50 to-orange-100/50 backdrop-blur-sm cursor-pointer"
              onClick={() => {
                const thisWeekFilteredTasks = filteredTasks.filter((task: typeof filteredTasks[0]) => {
                  const taskDoc = task;
                  if (!taskDoc.dueDate) return false;
                  const dueDate = new Date(taskDoc.dueDate);
                  return isAfter(dueDate, thisWeekStart) && isBefore(dueDate, thisWeekEnd) && taskDoc.status !== TaskStatus.DONE;
                });
                setModalTasks(thisWeekFilteredTasks as TaskDocument[]);
                setModalTitle("Due This Week");
                setModalFilterType("due-this-week");
                setModalOpen(true);
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-orange-700">Due This Week</CardTitle>
                <Calendar className="h-4 w-4 text-orange-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{dueThisWeek}</div>
                <p className="text-xs text-orange-600/70 mt-0.5">
                  {format(thisWeekStart, 'MMM d')} - {format(thisWeekEnd, 'MMM d')}
                </p>
              </CardContent>
            </Card>

            <Card
              className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-green-50 to-green-100/50 backdrop-blur-sm cursor-pointer"
              onClick={() => {
                const weeklyCompletedTasks = filteredTasks.filter((task: typeof filteredTasks[0]) => {
                  if (task.status !== TaskStatus.DONE) return false;
                  const completedDate = new Date(task.updatedAt);
                  return isAfter(completedDate, thisWeekStart) && isBefore(completedDate, thisWeekEnd);
                });
                setModalTasks(weeklyCompletedTasks as TaskDocument[]);
                setModalTitle("Completed This Week");
                setModalFilterType("weekly-completed");
                setModalOpen(true);
              }}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-700">Weekly Progress</CardTitle>
                <Zap className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold text-green-600">{thisWeekCompleted}</div>
                  {weeklyChange !== 0 && (
                    <div className={`flex items-center gap-0.5 text-xs font-medium ${weeklyChange > 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {weeklyChange > 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
                      {Math.abs(weeklyChange)}%
                    </div>
                  )}
                </div>
                <p className="text-xs text-green-600/70 mt-0.5">Completed this week</p>
              </CardContent>
            </Card>

            <Card className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-blue-50 to-blue-100/50 backdrop-blur-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-700">Avg. Completion</CardTitle>
                <Timer className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{avgCompletionTime}d</div>
                <p className="text-xs text-blue-600/70 mt-0.5">Average days</p>
              </CardContent>
            </Card>

            <Card
              className="hover:shadow-lg transition-all duration-300 border-0 bg-gradient-to-br from-slate-50 to-slate-100/50 backdrop-blur-sm cursor-pointer"
              onClick={() => handleCardClick('backlog')}
            >
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-slate-700">Backlog</CardTitle>
                <FolderOpen className="h-4 w-4 text-slate-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-600">{taskStatusCount[TaskStatus.BACKLOG]}</div>
                <p className="text-xs text-slate-600/70 mt-0.5">Awaiting action</p>
              </CardContent>
            </Card>
          </div>

          {/* Big Cards Section (Task Status Distribution and Recent Activity) - NOW AT THE BOTTOM */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Task Status Distribution with animations */}
            <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                    <BarChart3 className="h-5 w-5 text-slate-600" />
                    Task Status Distribution
                  </CardTitle>
                  <div className="text-xs text-slate-500 bg-slate-100 px-2 py-1 rounded-full">
                    {totalTasks} total
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {Object.entries(taskStatusCount).map(([status, count], index) => {
                    const percentage = totalTasks > 0 ? (count / totalTasks) * 100 : 0;
                    const config = statusConfig[status as TaskStatus] || statusConfig[TaskStatus.TODO];
                    return (
                      <div
                        key={status}
                        className="group cursor-pointer hover:bg-slate-50 rounded-lg p-2 transition-colors border border-transparent hover:border-black"
                        onClick={() => {
                          const params = new URLSearchParams();
                          params.set('status', status);
                          if (currentMember?.id) {
                            params.set('assigneeId', currentMember.id);
                          }
                          router.push(`/workspaces/${workspaceId}/workspace-tasks?${params.toString()}`);
                        }}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-3">
                            <div className={`w-3 h-3 rounded-full ${config.bgColor} group-hover:scale-125 transition-transform duration-200`} />
                            <span className="text-sm font-medium text-slate-700 min-w-[90px]">
                              {status === TaskStatus.IN_PROGRESS ? 'In Progress' :
                               status === TaskStatus.IN_REVIEW ? 'In Review' :
                               status.charAt(0) + status.slice(1).toLowerCase()}
                            </span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-semibold text-slate-800">{count}</span>
                            <span className="text-xs text-slate-500">({Math.round(percentage)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full ${config.bgColor} rounded-full transition-all duration-700 ease-out group-hover:opacity-90`}
                            style={{
                              width: `${percentage}%`,
                              animationDelay: `${index * 100}ms`
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recent Tasks with enhanced UI */}
            <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
              <CardHeader className="pb-6">
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-slate-800">
                  <Activity className="h-5 w-5 text-slate-600" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {filteredTasks.length > 0 ? (
                    filteredTasks.slice(0, 4).map((task: typeof filteredTasks[0], index: number) => {
                      const config = statusConfig[task.status as TaskStatus] || statusConfig[TaskStatus.TODO];
                      const taskDoc = task;
                      const daysUntilDue = taskDoc.dueDate ? differenceInDays(new Date(taskDoc.dueDate), new Date()) : null;

                      return (
                        <div
                          key={(task as unknown as TaskDocument).id}
                          onClick={() => router.push(`/workspaces/${workspaceId}/tasks/${(task as unknown as TaskDocument).id}`)}
                          className="group p-4 rounded-xl bg-gradient-to-r from-slate-50 to-slate-100/50 hover:from-slate-100 hover:to-slate-200/50 border border-transparent hover:border-black transition-all duration-300 cursor-pointer"
                          style={{ animationDelay: `${index * 50}ms` }}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm text-slate-800 truncate group-hover:text-slate-900">
                                {(task as unknown as TaskDocument).name}
                              </p>
                              <div className="flex items-center gap-3 mt-2">
                                {(task as unknown as TaskDocument).dueDate && (
                                  <p className={`text-xs ${daysUntilDue !== null && daysUntilDue < 0 ? 'text-red-600' : 'text-slate-500'}`}>
                                    {daysUntilDue !== null && daysUntilDue < 0
                                      ? `${Math.abs(daysUntilDue)} days overdue`
                                      : daysUntilDue === 0
                                      ? 'Due today'
                                      : daysUntilDue === 1
                                      ? 'Due tomorrow'
                                      : `Due in ${daysUntilDue} days`
                                    }
                                  </p>
                                )}
                                {(task as unknown as TaskDocument).service && (
                                  <p className="text-xs text-slate-500 truncate max-w-[150px]">
                                    {(task as unknown as TaskDocument).service?.name}
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className={`px-3 py-1.5 rounded-full text-xs font-medium ${config.lightBg} ${config.textColor} group-hover:scale-105 transition-transform duration-200`}>
                              {(task as unknown as TaskDocument).status === TaskStatus.IN_PROGRESS ? 'Progress' :
                               (task as unknown as TaskDocument).status === TaskStatus.IN_REVIEW ? 'Review' :
                               (task as unknown as TaskDocument).status && (task as unknown as TaskDocument).status.charAt(0) ? (task as unknown as TaskDocument).status.charAt(0) + (task as unknown as TaskDocument).status.slice(1).toLowerCase() : 'Unknown'}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-12">
                      <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-100 rounded-full mb-4">
                        <ListTodo className="h-8 w-8 text-slate-400" />
                      </div>
                      <p className="text-sm font-medium text-slate-600 mb-1">No tasks found</p>
                      <p className="text-xs text-slate-500">Try adjusting your date filters</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Task List Modal */}
      <TaskListModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={modalTitle}
        tasks={modalTasks}
        filterType={modalFilterType}
      />
    </div>
  );
};
