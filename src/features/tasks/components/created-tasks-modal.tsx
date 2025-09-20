"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TaskStatus } from "../types";
import { format, differenceInDays } from "date-fns";
import {
  Search,
  FilterX,
  Calendar,
  Clock,
  FolderOpen,
  User,
  Building2,
  RefreshCw,
  FileTextIcon,
  X,
  ChevronLeft,
  ChevronRight
} from "@/lib/lucide-icons";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCreatedTasksModal } from "../hooks/use-created-tasks-modal";
import { useGetCreatedTasks } from "../api/use-get-created-tasks";
import { LoadingSpinner } from "@/components/ui/loading-spinner";

interface TaskDocument {
  id: string;
  name: string;
  taskNumber: string;
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
  workspace?: {
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

export const CreatedTasksModal = () => {
  const router = useRouter();
  const { isOpen, close } = useCreatedTasksModal();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TaskStatus | "all">("all");
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("all");
  const [serviceFilter, setServiceFilter] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const { data, isLoading, refetch } = useGetCreatedTasks({
    search: search || null,
    status: statusFilter !== "all" ? statusFilter : null,
    workspaceId: workspaceFilter !== "all" ? workspaceFilter : null,
    serviceId: serviceFilter !== "all" ? serviceFilter : null,
    page: currentPage,
  });

  const tasks = data?.documents || [];
  const totalTasks = data?.total || 0;
  const totalPages = Math.ceil(totalTasks / 20);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Extract unique workspaces and services for filters
  const uniqueWorkspaces = useMemo(() => {
    const workspaces = tasks.reduce((acc: { id: string; name: string }[], task) => {
      if (task.workspace && !acc.find(w => w.id === task.workspace!.id)) {
        acc.push(task.workspace);
      }
      return acc;
    }, []);
    return workspaces.sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const uniqueServices = useMemo(() => {
    const services = tasks.reduce((acc: { id: string; name: string }[], task) => {
      if (task.service && !acc.find(s => s.id === task.service!.id)) {
        acc.push(task.service);
      }
      return acc;
    }, []);
    return services.sort((a, b) => a.name.localeCompare(b.name));
  }, [tasks]);

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.BACKLOG:
        return "bg-slate-100 text-slate-700 border-slate-300";
      case TaskStatus.TODO:
        return "bg-blue-100 text-blue-700 border-blue-300";
      case TaskStatus.IN_PROGRESS:
        return "bg-amber-100 text-amber-700 border-amber-300";
      case TaskStatus.IN_REVIEW:
        return "bg-purple-100 text-purple-700 border-purple-300";
      case TaskStatus.DONE:
        return "bg-emerald-100 text-emerald-700 border-emerald-300";
      case TaskStatus.ARCHIVED:
        return "bg-gray-100 text-gray-700 border-gray-300";
      default:
        return "bg-gray-100 text-gray-700 border-gray-300";
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.IN_PROGRESS:
        return "In Progress";
      case TaskStatus.IN_REVIEW:
        return "In Review";
      default:
        return status.charAt(0) + status.slice(1).toLowerCase();
    }
  };

  const getDaysUntilDue = (dueDate: string | null) => {
    if (!dueDate) return null;
    return differenceInDays(new Date(dueDate), new Date());
  };

  const getDueDateColor = (daysUntilDue: number | null) => {
    if (daysUntilDue === null) return "text-gray-500";
    if (daysUntilDue < 0) return "text-red-600";
    if (daysUntilDue === 0) return "text-orange-600";
    if (daysUntilDue <= 3) return "text-amber-600";
    return "text-gray-500";
  };

  const formatDueDate = (daysUntilDue: number | null) => {
    if (daysUntilDue === null) return null;
    if (daysUntilDue < 0) return `${Math.abs(daysUntilDue)} days overdue`;
    if (daysUntilDue === 0) return "Due today";
    if (daysUntilDue === 1) return "Due tomorrow";
    return `Due in ${daysUntilDue} days`;
  };

  const handleTaskClick = (task: any) => {
    router.push(`/workspaces/${task.workspaceId}/tasks/${task.id}`);
    close();
  };

  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setWorkspaceFilter("all");
    setServiceFilter("all");
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  const handleFilterChange = (setter: (value: any) => void, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const hasActiveFilters = search || statusFilter !== "all" || workspaceFilter !== "all" || serviceFilter !== "all";

  return (
    <Dialog open={isOpen} onOpenChange={close}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <FileTextIcon className="w-5 h-5 text-green-600" />
            Created Tasks
            <Badge variant="secondary" className="ml-2">
              {totalTasks} {totalTasks === 1 ? 'task' : 'tasks'}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        {/* Filters */}
        <div className="space-y-4 border-b pb-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[250px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <Input
                placeholder="Search by task name or number..."
                value={search}
                onChange={(e) => handleFilterChange(setSearch, e.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              className="flex items-center gap-2"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </Button>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <FilterX className="h-4 w-4 text-gray-500" />
            <Select value={statusFilter} onValueChange={(value) => handleFilterChange(setStatusFilter, value as TaskStatus | "all")}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value={TaskStatus.BACKLOG}>Backlog</SelectItem>
                <SelectItem value={TaskStatus.TODO}>Todo</SelectItem>
                <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                <SelectItem value={TaskStatus.IN_REVIEW}>In Review</SelectItem>
                <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                <SelectItem value={TaskStatus.ARCHIVED}>Archived</SelectItem>
              </SelectContent>
            </Select>

            <Select value={workspaceFilter} onValueChange={(value) => handleFilterChange(setWorkspaceFilter, value)}>
              <SelectTrigger className="w-[160px]">
                <SelectValue placeholder="Workspace" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Workspaces</SelectItem>
                {uniqueWorkspaces.map((workspace) => (
                  <SelectItem key={workspace.id} value={workspace.id}>
                    {workspace.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={serviceFilter} onValueChange={(value) => handleFilterChange(setServiceFilter, value)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Service" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Services</SelectItem>
                {uniqueServices.map((service) => (
                  <SelectItem key={service.id} value={service.id}>
                    {service.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                className="flex items-center gap-1 text-gray-500 hover:text-gray-700"
              >
                <X className="h-3 w-3" />
                Clear
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-y-auto max-h-[50vh]">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FileTextIcon className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium mb-1">No tasks found</p>
              <p className="text-gray-500 text-sm">
                {hasActiveFilters ? "Try adjusting your filters" : "You haven't created any tasks yet"}
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tasks.map((task) => {
                const daysUntilDue = getDaysUntilDue(task.dueDate);
                return (
                  <div
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className="p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200 bg-white cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        {/* Task Header */}
                        <div className="flex items-start gap-3 mb-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">
                                {task.taskNumber}
                              </span>
                              <h3 className="font-medium text-gray-900 truncate">
                                {task.name}
                              </h3>
                            </div>

                            {/* Task Metadata */}
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              <Badge className={cn("text-xs", getStatusColor(task.status as TaskStatus))}>
                                {getStatusLabel(task.status as TaskStatus)}
                              </Badge>

                              {task.workspace && (
                                <div className="flex items-center gap-1 text-gray-500">
                                  <Building2 className="h-3 w-3" />
                                  <span className="truncate max-w-[120px]">{task.workspace.name}</span>
                                </div>
                              )}

                              {task.service && (
                                <div className="flex items-center gap-1 text-gray-500">
                                  <FolderOpen className="h-3 w-3" />
                                  <span className="truncate max-w-[120px]">{task.service.name}</span>
                                </div>
                              )}

                              {task.assignee && (
                                <div className="flex items-center gap-1 text-gray-500">
                                  <User className="h-3 w-3" />
                                  <span className="truncate max-w-[120px]">{task.assignee.user.name}</span>
                                </div>
                              )}

                              {task.dueDate && (
                                <div className={cn("flex items-center gap-1", getDueDateColor(daysUntilDue))}>
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {formatDueDate(daysUntilDue) || format(new Date(task.dueDate), 'MMM d, yyyy')}
                                  </span>
                                </div>
                              )}

                              <div className="flex items-center gap-1 text-gray-400">
                                <Clock className="h-3 w-3" />
                                <span>Created {format(new Date(task.createdAt), 'MMM d, yyyy')}</span>
                              </div>
                            </div>

                            {task.description && (
                              <p className="text-sm text-gray-600 mt-2 line-clamp-2">
                                {task.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && tasks.length > 0 && (
          <div className="border-t pt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * 20) + 1} to {Math.min(currentPage * 20, totalTasks)} of {totalTasks} tasks
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage - 1)}
                disabled={!hasPrevPage}
                className="flex items-center gap-1"
              >
                <ChevronLeft className="h-4 w-4" />
                Previous
              </Button>
              <span className="text-sm text-gray-600 px-3">
                Page {currentPage} of {totalPages}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!hasNextPage}
                className="flex items-center gap-1"
              >
                Next
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};