"use client";

import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { PopulatedTask } from "../types";
import { MoreHorizontal, EyeOffIcon } from "lucide-react";
import { TaskDate } from "./task-date";
import { TaskActions } from "./task-actions";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Member } from "@/features/members/types";

interface KanbanCardProps {
  task: PopulatedTask;
  index: number;
  isDragDisabled?: boolean;
  isBeingDragged?: boolean;
}

export const KanbanCard = ({ task, index, isDragDisabled = false, isBeingDragged = false }: KanbanCardProps) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const { data: members } = useGetMembers({ workspaceId });

  // Find the single assignee (not multiple assignees)
  const assignee = members?.documents?.find((member) => 
    member.id === task.assigneeId
  );

  // Find the creator from members using creatorId (which is a userId)
  const creator = members?.documents?.find((member) => 
    (member as Member).userId === task.creatorId
  );


  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent drag events from interfering
    e.stopPropagation();
    
    // Validate task ID format before navigation
    if (!task.id || task.id.length > 36 || !/^[a-zA-Z0-9_-]+$/.test(task.id)) {
      console.error("Invalid task ID format:", task.id);
      toast.error("Invalid task ID format");
      return;
    }
    
    router.push(`/workspaces/${workspaceId}/tasks/${task.id}`);
  };

  const handleCardDoubleClick = (e: React.MouseEvent) => {
    // Prevent drag events from interfering
    e.stopPropagation();
    
    // Validate task ID format before navigation
    if (!task.id || task.id.length > 36 || !/^[a-zA-Z0-9_-]+$/.test(task.id)) {
      console.error("Invalid task ID format:", task.id);
      toast.error("Invalid task ID format");
      return;
    }
    
    router.push(`/workspaces/${workspaceId}/tasks/${task.id}`);
  };


  return (
    <Draggable draggableId={task.id} index={index} isDragDisabled={isDragDisabled}>
      {(provided, snapshot) => (
        <div
          {...provided.draggableProps}
          {...provided.dragHandleProps}
          ref={provided.innerRef}
          onClick={handleCardClick}
          onDoubleClick={handleCardDoubleClick}
          className={`group bg-white rounded-lg shadow-sm border-2 border-neutral-200/80 overflow-hidden cursor-grab active:cursor-grabbing kanban-card hover:shadow-lg hover:border-blue-300/60 hover:bg-blue-50/30 touch-manipulation transition-all duration-200 w-full min-w-0 ${
            snapshot.isDragging 
              ? "opacity-0 invisible scale-75" 
              : isBeingDragged 
                ? "opacity-30 scale-95" 
                : "hover:scale-[1.02]"
          }`}
        >
          {/* Card Header */}
          <div className="p-3 pb-2">
            <div className="flex items-start justify-between gap-x-2 mb-2">
              <div className="flex items-start gap-2 flex-1">
                <h3 className="text-sm font-semibold text-neutral-900 line-clamp-2 flex-1 leading-snug break-words overflow-hidden">
                  {task.name}
                </h3>
                {task.isConfidential && (
                  <div className="flex-shrink-0 mt-0.5">
                    <EyeOffIcon className="size-3 text-orange-600" />
                  </div>
                )}
              </div>
              <TaskActions id={task.id} serviceId={task.serviceId} creatorId={task.creatorId || undefined} assigneeId={task.assigneeId || undefined} status={task.status}>
                <div className="opacity-0 group-hover:opacity-100 sm:opacity-100 transition-opacity duration-200 p-2 hover:bg-neutral-100 rounded touch-manipulation">
                  <MoreHorizontal className="size-4 text-neutral-500" />
                </div>
              </TaskActions>
            </div>
          </div>

          {/* Card Body */}
          <div className="px-3 pb-3">
            {/* Service */}
            {task.service && (
              <div className="mb-2">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-500 font-medium">Service:</span>
                  <div className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200">
                    <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                    <span className="font-medium break-words">{task.service.name}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Due Date */}
            <div className="mb-3">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-500 font-medium">Due Date:</span>
                <TaskDate value={task.dueDate} className="font-medium" />
              </div>
            </div>

            {/* Assignee */}
            <div className="mb-2">
              <div className="flex items-center gap-1 text-xs">
                <span className="text-gray-500 font-medium">Assignee:</span>
                {assignee ? (
                  <span className="text-neutral-600 font-medium break-words">
                    {assignee.name}
                  </span>
                ) : (
                  <span className="text-neutral-400 font-medium">
                    Unassigned
                  </span>
                )}
              </div>
            </div>

            {/* Requested By */}
            {creator && (
              <div className="mb-3">
                <div className="flex items-center gap-1 text-xs">
                  <span className="text-gray-500 font-medium">Requested by:</span>
                  <span className="text-neutral-600 font-medium break-words">
                    {creator.name}
                  </span>
                </div>
              </div>
            )}

            {/* Card Footer */}
            <div className="flex items-center justify-end">
              {/* Task Status Indicator */}
              <div className={`h-2 w-2 rounded-full shadow-sm ${
                task.status === 'BACKLOG' ? 'bg-gray-400' :
                task.status === 'TODO' ? 'bg-blue-500' :
                task.status === 'IN_PROGRESS' ? 'bg-amber-500' :
                task.status === 'IN_REVIEW' ? 'bg-purple-500' :
                task.status === 'DONE' ? 'bg-emerald-500' : 'bg-gray-400'
              }`} />
            </div>
          </div>

          {/* Subtle hover indicator */}
          <div className="h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 opacity-0 group-hover:opacity-100 transition-all duration-300 transform scale-x-0 group-hover:scale-x-100" />
        </div>
      )}
    </Draggable>
  );
};