"use client";

import React from "react";
import { Draggable } from "@hello-pangea/dnd";
import { PopulatedTask } from "../types";
import { EyeOffIcon, FileTextIcon } from "@/lib/lucide-icons";
import { TaskDate } from "./task-date";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Member, MemberRole } from "@/features/members/types";
import { useCurrent } from "@/features/auth/api/use-current";

interface KanbanCardProps {
  task: PopulatedTask;
  index: number;
  isDragDisabled?: boolean;
  isBeingDragged?: boolean;
  withReviewStage?: boolean;
}

export const KanbanCard = ({ task, index, isDragDisabled = false, isBeingDragged = false, withReviewStage = true }: KanbanCardProps) => {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const { data: members } = useGetMembers({ workspaceId });
  const { data: currentUser } = useCurrent();

  // Find all assignees from the task
  const assignees = task.assignees || [];

  // Find the reviewer
  const reviewer = members?.documents?.find((member) =>
    member.id === task.reviewerId
  );

  // Find the creator from members using creatorId (which is a userId)
  const creator = members?.documents?.find((member) =>
    (member as Member).userId === task.creatorId
  );

  // Find current user's member record
  const currentMember = members?.documents?.find((member) =>
    (member as Member).userId === currentUser?.id
  ) as Member;

  // Parse followers
  const followedIds = task.followedIds ? (() => {
    try {
      return JSON.parse(task.followedIds);
    } catch {
      return [];
    }
  })() : [];

  // Check access permissions
  const isCreator = currentUser && task.creatorId ? currentUser.id === task.creatorId : false;
  const isAssignee = currentMember && assignees.length > 0 ? assignees.some(a => a.id === currentMember.id) : false;
  const isReviewer = currentMember && task.reviewerId ? currentMember.id === task.reviewerId : false;
  const isFollower = followedIds.includes(currentMember?.id || '');
  const isWorkspaceAdmin = currentMember?.role === MemberRole.ADMIN;
  const isSuperAdmin = currentUser?.isSuperAdmin || false;

  // Access restriction for task viewing:
  // - Non-confidential tasks: ALL workspace members can view (read-only for non-involved)
  // - Confidential tasks: Only involved members can view
  const isInvolvedInTask = isCreator || isAssignee || isReviewer || isFollower || isWorkspaceAdmin || isSuperAdmin;
  const canViewTaskDetails = task.isConfidential
    ? isInvolvedInTask // Confidential: only involved members
    : currentMember?.role !== undefined; // Non-confidential: all workspace members can view


  const handleCardClick = (e: React.MouseEvent) => {
    // Prevent drag events from interfering
    e.stopPropagation();

    // Check if user has permission to view task details
    if (!canViewTaskDetails) {
      toast.error("Access restricted", {
        description: "This is a confidential task. Only assigned members can view it.",
        style: {
          background: '#ffffff',
          borderColor: '#6b7280',
          color: '#dc2626'
        },
        descriptionClassName: '!text-black !important'
      });
      return;
    }

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

    // Check if user has permission to view task details
    if (!canViewTaskDetails) {
      toast.error("Access restricted", {
        description: "This is a confidential task. Only assigned members can view it.",
        style: {
          background: '#ffffff',
          borderColor: '#6b7280',
          color: '#dc2626'
        },
        descriptionClassName: '!text-black !important'
      });
      return;
    }

    // Validate task ID format before navigation
    if (!task.id || task.id.length > 36 || !/^[a-zA-Z0-9_-]+$/.test(task.id)) {
      console.error("Invalid task ID format:", task.id);
      toast.error("Invalid task ID format");
      return;
    }

    router.push(`/workspaces/${workspaceId}/tasks/${task.id}`);
  };

  const handleViewAttachment = async (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click
    if (!task?.attachmentId) return;

    try {
      // Open PDF in new tab for viewing
      const response = await fetch(`/api/download/${task.attachmentId}`);
      if (!response.ok) {
        throw new Error("Failed to load attachment");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      // Open in new tab for viewing
      window.open(url, '_blank');

      // Clean up the URL after a short delay
      setTimeout(() => {
        window.URL.revokeObjectURL(url);
      }, 1000);
    } catch (error) {
      console.error("Error viewing attachment:", error);
      toast.error("Failed to load attachment");
      // Fallback: trigger download instead
      const link = document.createElement("a");
      link.href = `/api/download/${task.attachmentId}`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
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
          className={`group bg-white rounded-lg shadow-sm border-2 border-neutral-200/80 overflow-hidden kanban-card hover:shadow-lg hover:border-blue-300/60 hover:bg-blue-50/30 touch-manipulation transition-all duration-200 w-full min-w-0 ${
            !canViewTaskDetails
              ? "cursor-not-allowed opacity-60 hover:scale-100 border-gray-300"
              : isDragDisabled
                ? "cursor-pointer hover:scale-[1.02]"
                : "cursor-grab active:cursor-grabbing hover:scale-[1.02]"
          } ${
            snapshot.isDragging
              ? "opacity-0 invisible scale-75"
              : isBeingDragged
                ? "opacity-30 scale-95"
                : ""
          }`}
          title={
            !canViewTaskDetails
              ? "This is a confidential task. Only assigned members can view it."
              : undefined
          }
        >
          {/* Card Header */}
          <div className="p-2.5 sm:p-3 pb-1.5 sm:pb-2">
            {/* Task Number */}
            <div className="flex items-center justify-between gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <span className="text-[10px] sm:text-xs font-mono text-blue-600 bg-blue-50 px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md border border-blue-200">
                  {task.taskNumber}
                </span>
                {task.isConfidential && (
                  <div className="flex-shrink-0">
                    <EyeOffIcon className="size-3 text-orange-600" />
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 sm:gap-2">
                {/* Task Type Badge - MT for Main Task, ST for Subtask */}
                <span className={`text-[10px] sm:text-xs font-bold px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-full ${
                  task.parentTaskId
                    ? 'bg-purple-100 text-purple-700 border border-purple-300'
                    : 'bg-green-100 text-green-700 border border-green-300'
                }`}>
                  {task.parentTaskId ? 'ST' : 'MT'}
                </span>
                {task.attachmentId && (
                  <div
                    className="flex-shrink-0 cursor-pointer hover:bg-blue-50 p-1 sm:p-1.5 rounded transition-colors"
                    onClick={handleViewAttachment}
                    title="View attachment"
                  >
                    <FileTextIcon className="size-3.5 sm:size-4 text-blue-600 hover:text-blue-700" />
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-start gap-2 mb-1.5 sm:mb-2">
              <h3 className="text-xs sm:text-sm font-semibold text-neutral-900 line-clamp-2 flex-1 leading-snug break-words overflow-hidden">
                {task.name}
              </h3>
            </div>
          </div>

          {/* Card Body */}
          <div className="px-2.5 sm:px-3 pb-2.5 sm:pb-3 space-y-1.5 sm:space-y-2">
            {/* Service */}
            {task.service && (
              <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                <span className="text-gray-500 font-medium hidden sm:inline">Service:</span>
                <div className="inline-flex items-center gap-1 px-1.5 sm:px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full border border-blue-200 max-w-full">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full flex-shrink-0"></div>
                  <span className="font-medium truncate">{task.service.name}</span>
                </div>
              </div>
            )}

            {/* Due Date */}
            <div className="flex items-center gap-1 text-[10px] sm:text-xs">
              <span className="text-gray-500 font-medium">Due:</span>
              <TaskDate value={task.dueDate} className="font-medium" />
            </div>

            {/* Assignees */}
            <div className="flex items-start gap-1 text-[10px] sm:text-xs">
              <span className="text-gray-500 font-medium shrink-0">
                <span className="hidden sm:inline">Assignee{assignees.length > 1 ? 's' : ''}:</span>
                <span className="sm:hidden">By:</span>
              </span>
              {assignees.length > 0 ? (
                <span className="text-neutral-600 font-medium truncate">
                  {assignees.length === 1
                    ? assignees[0].name
                    : `${assignees[0].name} +${assignees.length - 1}`
                  }
                </span>
              ) : (
                <span className="text-neutral-400 font-medium">Unassigned</span>
              )}
            </div>

            {/* Reviewer - show when status is IN_REVIEW or DONE and withReviewStage is enabled */}
            {withReviewStage && (task.status === 'IN_REVIEW' || task.status === 'DONE') && (
              <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                <span className="text-gray-500 font-medium">Reviewer:</span>
                {reviewer ? (
                  <span className="text-neutral-600 font-medium truncate">{reviewer.name}</span>
                ) : (
                  <span className="text-neutral-400 font-medium">None</span>
                )}
              </div>
            )}

            {/* Sub-tasks count */}
            {task.subTaskCount !== undefined && task.subTaskCount > 0 && (
              <div className="flex items-center gap-1 text-[10px] sm:text-xs">
                <span className="text-gray-500 font-medium">Sub Tasks:</span>
                <span className="text-neutral-600 font-medium">{task.subTaskCount}</span>
              </div>
            )}

            {/* Requested By - hidden on smallest screens */}
            {creator && (
              <div className="hidden sm:flex items-center gap-1 text-xs">
                <span className="text-gray-500 font-medium">Created by:</span>
                <span className="text-neutral-600 font-medium truncate">{creator.name}</span>
              </div>
            )}

            {/* Card Footer */}
            <div className="flex items-center justify-end pt-1">
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