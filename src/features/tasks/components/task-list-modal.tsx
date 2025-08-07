"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { TaskStatus } from "../types";
import { format, differenceInDays } from "date-fns";
import { Calendar, Clock, FolderOpen, User } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

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

interface TaskListModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  tasks: TaskDocument[];
  filterType: string;
}

export const TaskListModal = ({ isOpen, onClose, title, tasks, filterType }: TaskListModalProps) => {
  const router = useRouter();
  
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

  const handleTaskClick = (task: TaskDocument) => {
    router.push(`/workspaces/${task.workspaceId}/tasks/${task.id}`);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            {filterType === 'completed' && <div className="w-3 h-3 bg-emerald-500 rounded-full" />}
            {filterType === 'progress' && <div className="w-3 h-3 bg-amber-500 rounded-full" />}
            {filterType === 'overdue' && <div className="w-3 h-3 bg-red-500 rounded-full" />}
            {filterType === 'total' && <div className="w-3 h-3 bg-slate-500 rounded-full" />}
            {filterType === 'backlog' && <div className="w-3 h-3 bg-slate-400 rounded-full" />}
            {title}
            <Badge variant="secondary" className="ml-2">
              {tasks.length} {tasks.length === 1 ? 'task' : 'tasks'}
            </Badge>
          </DialogTitle>
        </DialogHeader>
        
        <div className="overflow-y-auto max-h-[60vh] pr-2">
          {tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
                <FolderOpen className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-600 font-medium mb-1">No tasks found</p>
              <p className="text-gray-500 text-sm">
                {filterType === 'completed' && "You haven't completed any tasks yet."}
                {filterType === 'progress' && "No tasks are currently in progress."}
                {filterType === 'overdue' && "Great! You have no overdue tasks."}
                {filterType === 'total' && "No tasks are assigned to you."}
                {filterType === 'backlog' && "No tasks are in your backlog."}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {tasks.map((task) => {
                const daysUntilDue = getDaysUntilDue(task.dueDate);
                return (
                  <div
                    key={task.id}
                    onClick={() => handleTaskClick(task)}
                    className="p-4 rounded-lg border border-gray-200 hover:border-black hover:shadow-md transition-all duration-200 bg-white cursor-pointer"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start gap-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="font-medium text-gray-900 truncate pr-2">
                              {task.name}
                            </h3>
                            <div className="flex flex-wrap items-center gap-3 mt-2">
                              <Badge className={cn("text-xs", getStatusColor(task.status))}>
                                {getStatusLabel(task.status)}
                              </Badge>
                              
                              {task.service && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <FolderOpen className="h-3 w-3" />
                                  <span className="truncate max-w-[120px]">{task.service.name}</span>
                                </div>
                              )}
                              
                              {task.assignee && (
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                  <User className="h-3 w-3" />
                                  <span className="truncate max-w-[120px]">{task.assignee.user.name}</span>
                                </div>
                              )}
                              
                              {task.dueDate && (
                                <div className={cn("flex items-center gap-1 text-xs", getDueDateColor(daysUntilDue))}>
                                  <Calendar className="h-3 w-3" />
                                  <span>
                                    {formatDueDate(daysUntilDue) || format(new Date(task.dueDate), 'MMM d, yyyy')}
                                  </span>
                                </div>
                              )}
                              
                              <div className="flex items-center gap-1 text-xs text-gray-400">
                                <Clock className="h-3 w-3" />
                                <span>Created {format(new Date(task.createdAt), 'MMM d')}</span>
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
      </DialogContent>
    </Dialog>
  );
};