"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { PlusIcon, ChevronRight } from "@/lib/lucide-icons";
import { useGetSubTasks } from "../api/use-get-sub-tasks";
import { TaskStatus } from "../types";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { useCreateTaskModal } from "../hooks/use-create-task-modal";

interface SubTasksTableProps {
  parentTaskId: string;
  readOnly?: boolean;
}

export const SubTasksTable = ({
  parentTaskId,
  readOnly = false,
}: SubTasksTableProps) => {
  const router = useRouter();
  const { data: subTasks, isLoading } = useGetSubTasks({ taskId: parentTaskId });
  const [hoveredTaskId, setHoveredTaskId] = useState<string | null>(null);
  const { open } = useCreateTaskModal();

  const getStatusColor = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return "bg-gray-100 text-gray-700 hover:bg-gray-200";
      case TaskStatus.IN_PROGRESS:
        return "bg-blue-100 text-blue-700 hover:bg-blue-200";
      case TaskStatus.IN_REVIEW:
        return "bg-yellow-100 text-yellow-700 hover:bg-yellow-200";
      case TaskStatus.DONE:
        return "bg-green-100 text-green-700 hover:bg-green-200";
      case TaskStatus.BACKLOG:
        return "bg-orange-100 text-orange-700 hover:bg-orange-200";
      case TaskStatus.ARCHIVED:
        return "bg-red-100 text-red-700 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-700 hover:bg-gray-200";
    }
  };

  const getStatusLabel = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.TODO:
        return "To Do";
      case TaskStatus.IN_PROGRESS:
        return "In Progress";
      case TaskStatus.IN_REVIEW:
        return "In Review";
      case TaskStatus.DONE:
        return "Done";
      case TaskStatus.BACKLOG:
        return "Backlog";
      case TaskStatus.ARCHIVED:
        return "Archived";
      default:
        return status;
    }
  };

  const handleCreateSubTask = () => {
    open({
      parentTaskId,
      onSuccess: () => {
        // Sub-task created successfully, the list will be refreshed automatically
      }
    });
  };

  const handleTaskClick = (taskId: string, workspaceId: string) => {
    router.push(`/workspaces/${workspaceId}/tasks/${taskId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const hasSubTasks = subTasks && subTasks.length > 0;

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Header with Create Sub Task button */}
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          Sub Tasks {hasSubTasks && <span className="text-gray-500">({subTasks.length})</span>}
        </h3>
        {!readOnly && (
          <Button
            onClick={handleCreateSubTask}
            size="sm"
            className="bg-blue-600 hover:bg-blue-700 text-white h-8 text-xs sm:text-sm"
          >
            <PlusIcon className="size-3.5 sm:size-4 mr-1 sm:mr-2" />
            <span className="hidden sm:inline">Create </span>Sub Task
          </Button>
        )}
      </div>

      {/* Sub Tasks */}
      {!hasSubTasks ? (
        <div className="text-center py-8 sm:py-12 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex flex-col items-center gap-2 sm:gap-3 px-4">
            <div className="w-10 sm:w-12 h-10 sm:h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <svg
                className="w-5 sm:w-6 h-5 sm:h-6 text-gray-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            </div>
            <p className="text-gray-600 font-medium text-sm sm:text-base">No sub-tasks yet</p>
            <p className="text-xs sm:text-sm text-gray-500 max-w-[250px]">
              {readOnly ? "Sub-tasks can be added once the task is in progress" : "Break down this task into smaller pieces"}
            </p>
            {!readOnly && (
              <Button
                onClick={handleCreateSubTask}
                size="sm"
                variant="outline"
                className="mt-1 sm:mt-2 h-8 text-xs sm:text-sm"
              >
                <PlusIcon className="size-3.5 sm:size-4 mr-1 sm:mr-2" />
                Create First Sub Task
              </Button>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Mobile Card View */}
          <div className="sm:hidden space-y-2">
            {subTasks.map((task) => (
              <div
                key={task.id}
                className="bg-white border border-gray-200 rounded-lg p-3 cursor-pointer hover:border-blue-200 hover:shadow-sm transition-all active:scale-[0.99] touch-manipulation"
                onClick={() => handleTaskClick(task.id, task.workspaceId)}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className="font-mono text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                    {task.taskNumber}
                  </span>
                  <Badge
                    className={cn(
                      "text-[10px] font-medium",
                      getStatusColor(task.status as TaskStatus)
                    )}
                  >
                    {getStatusLabel(task.status as TaskStatus)}
                  </Badge>
                </div>
                <p className="text-sm font-medium text-gray-900 line-clamp-2 mb-1.5">
                  {task.name}
                </p>
                <p className="text-[11px] text-gray-500">
                  {task.workspace?.name || 'Unknown Workspace'}
                </p>
              </div>
            ))}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[120px]">Task Number</TableHead>
                  <TableHead>Task Name</TableHead>
                  <TableHead className="w-[140px]">Workspace</TableHead>
                  <TableHead className="w-[120px]">Status</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {subTasks.map((task) => (
                  <TableRow
                    key={task.id}
                    className="cursor-pointer hover:bg-gray-50 transition-colors"
                    onMouseEnter={() => setHoveredTaskId(task.id)}
                    onMouseLeave={() => setHoveredTaskId(null)}
                    onClick={() => handleTaskClick(task.id, task.workspaceId)}
                  >
                    <TableCell className="font-mono text-sm text-gray-600">
                      {task.taskNumber}
                    </TableCell>
                    <TableCell className="font-medium">
                      {task.name}
                    </TableCell>
                    <TableCell className="text-sm text-gray-600">
                      {task.workspace?.name || 'Unknown Workspace'}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={cn(
                          "text-xs font-medium transition-colors",
                          getStatusColor(task.status as TaskStatus)
                        )}
                      >
                        {getStatusLabel(task.status as TaskStatus)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <ChevronRight
                        className={cn(
                          "size-4 text-gray-400 transition-all",
                          hoveredTaskId === task.id && "translate-x-1 text-gray-600"
                        )}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}

      {/* Summary */}
      {hasSubTasks && (
        <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs sm:text-sm text-gray-600 pt-1 sm:pt-2">
          <div className="flex items-center gap-1.5 sm:gap-2">
            <span className="font-medium">Progress:</span>
            <div className="flex items-center gap-1">
              <span className="font-semibold text-green-600">
                {subTasks.filter((t) => t.status === TaskStatus.DONE).length}
              </span>
              <span>/</span>
              <span>{subTasks.length}</span>
              <span className="text-gray-500 hidden sm:inline">completed</span>
            </div>
          </div>
          {subTasks.some((t) => t.status === TaskStatus.IN_PROGRESS) && (
            <div className="flex items-center gap-1">
              <div className="w-1.5 sm:w-2 h-1.5 sm:h-2 bg-blue-500 rounded-full animate-pulse" />
              <span className="text-blue-600">
                {subTasks.filter((t) => t.status === TaskStatus.IN_PROGRESS).length} <span className="hidden sm:inline">in progress</span><span className="sm:hidden">active</span>
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};