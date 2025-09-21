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
  RefreshCw,
  FileTextIcon,
  X,
  ChevronLeft,
  ChevronRight
} from "@/lib/lucide-icons";
import { cn } from "@/lib/utils";
import { useCreatedTasksModal } from "../hooks/use-created-tasks-modal";
import { useGetCreatedTasks } from "../api/use-get-created-tasks";
import { LoadingSpinner } from "@/components/ui/loading-spinner";


export const CreatedTasksModal = () => {
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

  const tasksList = useMemo(() => data?.documents || [], [data]);
  const totalTasks = data?.total || 0;
  const totalPages = Math.ceil(totalTasks / 10);
  const hasNextPage = currentPage < totalPages;
  const hasPrevPage = currentPage > 1;

  // Extract unique workspaces and services for filters
  const uniqueWorkspaces = useMemo(() => {
    const workspaces = tasksList.reduce((acc: { id: string; name: string }[], task) => {
      if (task.workspace && !acc.find(w => w.id === task.workspace!.id)) {
        acc.push(task.workspace);
      }
      return acc;
    }, []);
    return workspaces.sort((a, b) => a.name.localeCompare(b.name));
  }, [tasksList]);

  const uniqueServices = useMemo(() => {
    const services = tasksList.reduce((acc: { id: string; name: string }[], task) => {
      if (task.service && !acc.find(s => s.id === task.service!.id)) {
        acc.push(task.service);
      }
      return acc;
    }, []);
    return services.sort((a, b) => a.name.localeCompare(b.name));
  }, [tasksList]);

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


  const clearFilters = () => {
    setSearch("");
    setStatusFilter("all");
    setWorkspaceFilter("all");
    setServiceFilter("all");
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  const handleSearchChange = (value: string) => {
    setSearch(value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (value: TaskStatus | "all") => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  const handleWorkspaceFilterChange = (value: string) => {
    setWorkspaceFilter(value);
    setCurrentPage(1);
  };

  const handleServiceFilterChange = (value: string) => {
    setServiceFilter(value);
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
                onChange={(e) => handleSearchChange(e.target.value)}
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
            <Select value={statusFilter} onValueChange={handleStatusFilterChange}>
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

            <Select value={workspaceFilter} onValueChange={handleWorkspaceFilterChange}>
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

            <Select value={serviceFilter} onValueChange={handleServiceFilterChange}>
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
        <div className="overflow-x-auto border rounded-lg">
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner />
            </div>
          ) : tasksList.length === 0 ? (
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
            <table className="w-full">
              <thead>
                <tr className="border-b bg-gray-50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Task Number
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Workspace
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Due Date
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assignee
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {tasksList.map((task) => {
                  const daysUntilDue = getDaysUntilDue(task.dueDate);
                  return (
                    <tr
                      key={task.id}
                      className="border-b border-gray-100"
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-mono text-gray-600 bg-gray-100 px-2 py-1 rounded">
                            {task.taskNumber}
                          </span>
                          <span className="text-sm font-medium text-gray-900 truncate max-w-[200px]" title={task.name}>
                            {task.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600 truncate max-w-[150px]" title={task.workspace?.name || undefined}>
                          {task.workspace?.name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600 truncate max-w-[150px]" title={task.service?.name || undefined}>
                          {task.service?.name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        {task.dueDate ? (
                          <span className={cn("text-sm", getDueDateColor(daysUntilDue))}>
                            {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </span>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge className={cn("text-xs", getStatusColor(task.status as TaskStatus))}>
                          {getStatusLabel(task.status as TaskStatus)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-sm text-gray-600 truncate max-w-[120px]" title={task.assignee?.user?.name || undefined}>
                          {task.assignee?.user?.name || '-'}
                        </span>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm text-gray-500">
                          <div>{format(new Date(task.createdAt), 'MMM d, yyyy')}</div>
                          <div className="text-xs text-gray-400">{format(new Date(task.createdAt), 'h:mm a')}</div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Pagination Controls */}
        {!isLoading && tasksList.length > 0 && (
          <div className="border-t pt-4 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {((currentPage - 1) * 10) + 1} to {Math.min(currentPage * 10, totalTasks)} of {totalTasks} tasks
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