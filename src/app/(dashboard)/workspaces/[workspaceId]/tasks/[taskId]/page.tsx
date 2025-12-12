"use client";

import { useState, useEffect } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useGetTask } from "@/features/tasks/api/use-get-task";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetServices } from "@/features/services/api/use-get-services";
import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces";
import { useUpdateTask } from "@/features/tasks/api/use-update-task";
import { useCreateTaskHistory } from "@/features/tasks/api/use-create-task-history";
import { TaskHistoryAction } from "@/features/tasks/types/history";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, CalendarIcon, Package, UserIcon, UsersIcon, EditIcon, FileTextIcon, ArchiveIcon, PlayIcon, CheckCircleIcon, SendIcon } from "@/lib/lucide-icons";
import { useRouter } from "next/navigation";
import { useDeleteTask } from "@/features/tasks/api/use-delete-task";
import { useConfirm } from "@/hooks/use-confirm";
import { useCurrent } from "@/features/auth/api/use-current";
import { toast } from "sonner";
import { TaskDate } from "@/features/tasks/components/task-date";
import { TaskHistory } from "@/features/tasks/components/task-history";
import { TaskChat } from "@/features/tasks/components/task-chat";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Member, MemberRole } from "@/features/members/types";
import { Service } from "@/features/services/types";
import { TaskStatus } from "@/features/tasks/types";
import { ManageFollowersModal } from "@/features/tasks/components/manage-followers-modal";
import { ManageCollaboratorsModal } from "@/features/tasks/components/manage-collaborators-modal";
import { ManageAssigneesModal } from "@/features/tasks/components/manage-assignees-modal";
import { TaskPropertiesModal } from "@/features/tasks/components/task-properties-modal";
import { EnhancedStageIndicator } from "@/features/tasks/components/enhanced-stage-indicator";
import { SubTasksTable } from "@/features/tasks/components/sub-tasks-table";
import { TaskAttachmentsTable } from "@/features/tasks/components/task-attachments-table";

interface TaskDetailsPageProps {
  params: {
    workspaceId: string;
    taskId: string;
  };
}

export default function TaskDetailsPage({ params }: TaskDetailsPageProps) {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    status: "" as TaskStatus,
    assigneeIds: [] as string[],
    reviewerId: "unassigned",
    serviceId: "",
    workspaceId: "",
    dueDate: new Date(),
    attachmentId: "",
    isConfidential: false,
  });

  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>([]);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isCollaboratorsModalOpen, setIsCollaboratorsModalOpen] = useState(false);
  const [isAssigneesModalOpen, setIsAssigneesModalOpen] = useState(false);
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState(false);

  const { data: task, isLoading: isLoadingTask } = useGetTask({ 
    taskId: params.taskId 
  });
  
  // Always get members from the current workspace (not the target workspace)
  // This ensures followers are preserved during workspace transfer
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({
    workspaceId: workspaceId  // Always use current workspace, not editForm.workspaceId
  });

  // Get members from target workspace for assignee/reviewer selection when transferring
  const { data: targetMembers } = useGetMembers({
    workspaceId: editForm.workspaceId !== workspaceId ? editForm.workspaceId : undefined
  });

  // Get services from the target workspace if changing workspaces
  const { data: services, isLoading: isLoadingServices } = useGetServices({
    workspaceId: editForm.workspaceId || workspaceId
  });

  const { data: workspaces, isLoading: isLoadingWorkspaces } = useGetWorkspaces();


  const { mutate: updateTask, isPending: isUpdating } = useUpdateTask({
    originalWorkspaceId: task?.workspaceId
  });
  const { mutate: createHistory } = useCreateTaskHistory();
  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask();
  const { data: currentUser } = useCurrent();
  
  const [ConfirmDialog, confirm] = useConfirm(
    "Archive Task",
    "This task will be archived and moved out of active views. You can still access it by filtering for 'Archived' tasks in the table view.",
    "destructive"
  );

  const [ReviewConfirmDialog, confirmReview] = useConfirm(
    "Mark as Reviewed & Done",
    "Please confirm that your review is complete. This will mark the task as Done.",
    "primary"
  );

  const [StartTaskConfirmDialog, confirmStartTask] = useConfirm(
    "Start Task",
    "You will be assigned to this task and it will move to In Progress.",
    "primary"
  );

  const [ForReviewConfirmDialog, confirmForReview] = useConfirm(
    "Submit for Review",
    "This task will be submitted for review.",
    "primary"
  );

  // Handle refresh parameter from notifications
  useEffect(() => {
    const refreshParam = searchParams?.get('refresh');
    if (refreshParam) {
      // Invalidate and refetch task data when coming from notification
      queryClient.invalidateQueries({ queryKey: ["task", params.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-messages", params.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-history", params.taskId] });
      
      // Remove refresh parameter from URL without navigation
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('refresh');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams, queryClient, params.taskId]);

  // Validate task ID format after hooks
  const isInvalidTaskId = !params.taskId || params.taskId.length > 36 || !/^[a-zA-Z0-9_-]+$/.test(params.taskId);
  
  if (isInvalidTaskId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        {/* Invalid ID header */}
        <div className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="hover:bg-gray-100 transition-all duration-200 group"
              >
                <ArrowLeftIcon className="size-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
                Back
              </Button>
              <div className="h-4 w-px bg-gray-300" />
              <span className="text-sm text-yellow-600 font-medium">Invalid Task ID</span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg p-8 lg:p-12">
            <div className="text-center space-y-6">
              {/* Enhanced warning icon */}
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-yellow-50 to-yellow-100 rounded-full flex items-center justify-center shadow-lg">
                <FileTextIcon className="w-12 h-12 text-yellow-600" />
              </div>

              {/* Enhanced warning content */}
              <div className="space-y-4">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Invalid Task ID</h1>
                <div className="max-w-md mx-auto space-y-3">
                  <p className="text-gray-600 text-lg">
                    The task ID format is invalid. Please check the URL and try again.
                  </p>
                  <p className="text-gray-500 text-sm">
                    Task IDs should contain only letters, numbers, hyphens, and underscores.
                  </p>
                </div>
              </div>

              {/* Enhanced action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  className="hover:bg-gray-50 transition-all duration-200 group px-6 py-3"
                >
                  <ArrowLeftIcon className="size-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
                  Go Back
                </Button>
                <Button
                  onClick={() => router.push(`/workspaces/${workspaceId}/tasks`)}
                  className="bg-blue-600 hover:bg-blue-700 transition-all duration-200 px-6 py-3"
                >
                  View All Tasks
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isLoading = isLoadingTask || isLoadingMembers || isLoadingServices || isLoadingWorkspaces;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        {/* Enhanced Loading Header */}
        <div className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="animate-pulse">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-16 bg-gray-200/80 rounded-lg" />
                  <div className="h-4 w-px bg-gray-200" />
                  <div className="h-4 w-32 bg-gray-200/80 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-24 bg-gray-200/80 rounded-lg" />
                  <div className="h-8 w-20 bg-gray-200/80 rounded-lg" />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          <div className="space-y-8">
            {/* Enhanced Header Skeleton */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg p-6 lg:p-8 animate-fade-in">
              <div className="space-y-6">
                {/* Status and badges row */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 animate-pulse">
                  <div className="flex items-center gap-3">
                    <div className="h-8 w-24 bg-gradient-to-r from-blue-200/40 via-blue-300/60 to-blue-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded-full" />
                    <div className="h-6 w-20 bg-gradient-to-r from-red-200/40 via-red-300/60 to-red-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded-full" style={{animationDelay: '0.1s'}} />
                  </div>
                  <div className="h-10 w-64 bg-gradient-to-r from-gray-200/40 via-gray-300/60 to-gray-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded-lg" style={{animationDelay: '0.2s'}} />
                </div>

                {/* Title skeleton */}
                <div className="space-y-3">
                  <div className="h-10 w-3/4 bg-gradient-to-r from-gray-200/40 via-gray-400/60 to-gray-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded-lg" style={{animationDelay: '0.3s'}} />
                  <div className="h-6 w-1/2 bg-gradient-to-r from-gray-200/40 via-gray-300/60 to-gray-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded" style={{animationDelay: '0.4s'}} />
                </div>

                {/* Meta info grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  {[...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-3 bg-gray-100/60 rounded-lg animate-pulse" style={{animationDelay: `${0.5 + i * 0.1}s`}}>
                      <div className="w-8 h-8 bg-gradient-to-r from-gray-200/40 via-gray-400/60 to-gray-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded-lg" />
                      <div className="flex-1 space-y-2">
                        <div className="h-3 w-16 bg-gradient-to-r from-gray-200/40 via-gray-300/60 to-gray-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded" />
                        <div className="h-4 w-20 bg-gradient-to-r from-gray-200/40 via-gray-400/60 to-gray-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Enhanced Content Skeleton */}
            <div className="grid grid-cols-1 xl:grid-cols-10 gap-6 lg:gap-8">
              {/* Left column - Description & History */}
              <div className="xl:col-span-6 space-y-6">
                {/* Description skeleton */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg animate-slide-up" style={{animationDelay: '0.9s'}}>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-2 h-8 bg-gradient-to-b from-blue-300/40 via-blue-400/60 to-blue-300/40 animate-pulse rounded-full" />
                      <div className="h-6 w-32 bg-gradient-to-r from-gray-200/40 via-gray-400/60 to-gray-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded" />
                    </div>
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <div
                          key={i}
                          className="h-4 bg-gradient-to-r from-gray-200/40 via-gray-300/60 to-gray-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded"
                          style={{
                            width: `${85 - i * 15}%`,
                            animationDelay: `${1.0 + i * 0.1}s`
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>

                {/* History skeleton */}
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg animate-slide-up" style={{animationDelay: '1.3s'}}>
                  <div className="p-6">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-2 h-8 bg-gradient-to-b from-green-300/40 via-green-400/60 to-green-300/40 animate-pulse rounded-full" />
                      <div className="h-6 w-40 bg-gradient-to-r from-gray-200/40 via-gray-400/60 to-gray-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded" />
                    </div>
                    <div className="space-y-4">
                      {[...Array(4)].map((_, i) => (
                        <div key={i} className="flex items-start gap-3 animate-fade-in" style={{animationDelay: `${1.4 + i * 0.1}s`}}>
                          <div className="w-8 h-8 bg-gradient-to-r from-gray-200/40 via-gray-400/60 to-gray-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded-full flex-shrink-0" />
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gradient-to-r from-gray-200/40 via-gray-300/60 to-gray-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded" style={{width: `${70 + i * 10}%`}} />
                            <div className="h-3 w-24 bg-gradient-to-r from-gray-200/30 via-gray-300/50 to-gray-200/30 bg-size-200 bg-pos-0 animate-shimmer rounded" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Right column - Chat skeleton */}
              <div className="xl:col-span-4">
                <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg animate-slide-up" style={{animationDelay: '1.8s'}}>
                  <div className="p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <div className="w-2 h-8 bg-gradient-to-b from-blue-300/40 via-blue-400/60 to-blue-300/40 animate-pulse rounded-full" />
                        <div className="h-6 w-24 bg-gradient-to-r from-gray-200/40 via-gray-400/60 to-gray-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded" />
                      </div>
                      {/* Live indicator skeleton */}
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse" />
                        <div className="h-3 w-8 bg-gradient-to-r from-gray-200/40 via-gray-300/60 to-gray-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded" />
                      </div>
                    </div>
                    <div className="space-y-4 h-96 overflow-hidden">
                      {[...Array(6)].map((_, i) => {
                        // Use deterministic widths based on index to avoid hydration mismatch
                        const widths = [75, 60, 85, 55, 70, 65];
                        const showSecondLine = i % 2 === 0;
                        return (
                          <div
                            key={i}
                            className={`flex gap-3 animate-fade-in ${i % 2 === 0 ? 'justify-end' : 'justify-start'}`}
                            style={{animationDelay: `${1.9 + i * 0.1}s`}}
                          >
                            {i % 2 !== 0 && (
                              <div className="w-8 h-8 bg-gradient-to-r from-gray-200/40 via-gray-400/60 to-gray-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded-full flex-shrink-0" />
                            )}
                            <div className={`${
                              i % 2 === 0
                                ? 'bg-gradient-to-r from-blue-200/40 via-blue-300/60 to-blue-200/40'
                                : 'bg-gradient-to-r from-gray-200/40 via-gray-300/60 to-gray-200/40'
                            } bg-size-200 bg-pos-0 animate-shimmer p-3 rounded-lg space-y-2 max-w-xs`}>
                              <div className="h-3 bg-white/60 rounded" style={{width: `${widths[i]}%`}} />
                              {showSecondLine && <div className="h-3 bg-white/40 rounded" style={{width: `${widths[(i + 3) % 6]}%`}} />}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div className="border-t p-4">
                    <div className="h-10 bg-gradient-to-r from-gray-200/40 via-gray-300/60 to-gray-200/40 bg-size-200 bg-pos-0 animate-shimmer rounded-full" />
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Loading indicator */}
            <div className="flex items-center justify-center py-8 animate-fade-in" style={{animationDelay: '2.5s'}}>
              <div className="flex flex-col items-center gap-4">
                <div className="flex items-center gap-3 text-gray-500">
                  <LoadingSpinner size="lg" className="text-blue-500" />
                  <span className="text-lg font-medium animate-pulse">Loading task details...</span>
                </div>
                {/* Progress dots */}
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" />
                  <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{animationDelay: '0.1s'}} />
                  <div className="w-2 h-2 bg-blue-600 rounded-full animate-bounce" style={{animationDelay: '0.2s'}} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        {/* Error state header */}
        <div className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="hover:bg-gray-100 transition-all duration-200 group"
              >
                <ArrowLeftIcon className="size-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
                Back
              </Button>
              <div className="h-4 w-px bg-gray-300" />
              <span className="text-sm text-red-600 font-medium">Task Not Found</span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg p-8 lg:p-12">
            <div className="text-center space-y-6">
              {/* Enhanced error icon */}
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center shadow-lg">
                <FileTextIcon className="w-12 h-12 text-red-500" />
              </div>

              {/* Enhanced error content */}
              <div className="space-y-4">
                <h1 className="text-3xl lg:text-4xl font-bold text-gray-900">Task Not Found</h1>
                <div className="max-w-md mx-auto space-y-3">
                  <p className="text-gray-600 text-lg">
                    The task you&apos;re looking for doesn&apos;t exist or has been removed.
                  </p>
                  <p className="text-gray-500 text-sm">
                    This could happen if the task was deleted, archived, or if you don&apos;t have permission to view it.
                  </p>
                </div>
              </div>

              {/* Enhanced action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  className="hover:bg-gray-50 transition-all duration-200 group px-6 py-3"
                >
                  <ArrowLeftIcon className="size-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
                  Go Back
                </Button>
                <Button
                  onClick={() => router.push(`/workspaces/${workspaceId}/tasks`)}
                  className="bg-blue-600 hover:bg-blue-700 transition-all duration-200 px-6 py-3"
                >
                  View All Tasks
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Get assignees from task - already populated
  const assignees = task.assignees || [];

  const reviewer = members?.documents.find(
    (member) => member.id === task.reviewerId
  );

  const service = services?.documents.find(
    (serv) => serv.id === task.serviceId
  );


  // Parse followers from task (customers)
  const followedIds = task?.followedIds ? (() => {
    try {
      return JSON.parse(task.followedIds);
    } catch {
      return [];
    }
  })() : [];

  // Get follower members (customers)
  const followers = members?.documents.filter((member) =>
    followedIds.includes(member.id)
  ) || [];

  // Parse collaborators from task (team members)
  const collaboratorIds = task?.collaboratorIds ? (() => {
    try {
      return JSON.parse(task.collaboratorIds);
    } catch {
      return [];
    }
  })() : [];

  // Get collaborator members (team members)
  const collaborators = members?.documents.filter((member) =>
    collaboratorIds.includes(member.id)
  ) || [];

  // Find current user's member record to check delete permissions
  const currentMember = members?.documents.find((member) => 
    (member as Member).userId === currentUser?.id
  ) as Member;
  
  // Customers can edit tasks but cannot change status
  // DONE tasks can only be edited by workspace admins
  const isWorkspaceAdmin = currentMember?.role === MemberRole.ADMIN;

  const isCreator = currentUser && task?.creatorId ? currentUser.id === task.creatorId : false;
  const isAssignee = currentMember && assignees.length > 0 ? assignees.some(a => a.id === currentMember.id) : false;
  const isReviewer = currentMember && task?.reviewerId ? currentMember.id === task.reviewerId : false;
  const isFollower = followedIds.includes(currentMember?.id || '');
  const isCollaborator = collaboratorIds.includes(currentMember?.id || '');
  const isSuperAdmin = currentUser?.isSuperAdmin || false;

  // Check if user is involved in the task (for permission calculations)
  const isInvolvedInTask = isCreator || isAssignee || isReviewer || isCollaborator || isFollower || isWorkspaceAdmin || isSuperAdmin;

  // For DONE tasks, only admins can archive
  const canDelete = task?.status === TaskStatus.DONE
    ? (isWorkspaceAdmin || isSuperAdmin)
    : (isCreator || isAssignee || isSuperAdmin);
  const isAlreadyArchived = task?.status === "ARCHIVED";

  // Update permission for editing tasks:
  // - Creator-only: can only edit in TODO stage (but can chat until DONE)
  // - Creator who is also assignee/admin: can edit based on their other roles
  // - Reviewers: can edit tasks in IN_REVIEW status
  // - Customers: cannot edit tasks that are not in TODO status
  // - Non-involved members viewing non-confidential tasks are read-only
  const canEdit = !isInvolvedInTask && !task?.isConfidential
    ? false // Read-only viewers cannot edit
    : task?.status === TaskStatus.DONE
      ? isWorkspaceAdmin || isSuperAdmin // Only admins can edit DONE tasks
      : task?.status === TaskStatus.TODO
        ? isInvolvedInTask // All involved members can edit TODO tasks (including creator)
        : task?.status === TaskStatus.IN_REVIEW && isReviewer
          ? true // Reviewers can edit tasks in IN_REVIEW status
        : currentMember?.role === MemberRole.CUSTOMER
          ? false // Customers cannot edit tasks that are not in TODO status
          : isCreator && !isAssignee && !isWorkspaceAdmin && !isSuperAdmin
            ? false // Creator-only (not assignee/admin) can only edit in TODO stage
            : (isAssignee || isCollaborator || (isFollower && currentMember?.role === MemberRole.MEMBER) || isWorkspaceAdmin || isSuperAdmin);

  const canEditStatus = task?.status === TaskStatus.IN_REVIEW && isReviewer
    ? true // Reviewers can change status of IN_REVIEW tasks
    : (currentMember?.role !== MemberRole.CUSTOMER || isCreator); // Non-customers and creators can edit status

  // Access restriction for task viewing:
  // - Confidential tasks: Only assignee, creator, reviewer, collaborators, followers, and workspace admins
  // - Non-confidential tasks: All workspace members can view (read-only for non-involved members)
  // - Exception: All workspace members can view TO DO tasks (since this is where they get their tasks)
  const canViewTaskDetails = task?.status === TaskStatus.TODO
    ? currentMember?.role !== undefined // All workspace members can view TO DO tasks
    : task?.isConfidential
      ? isInvolvedInTask // Confidential: only involved members
      : currentMember?.role !== undefined; // Non-confidential: all workspace members can view

  // If user doesn't have permission to view task details, show access denied
  if (!canViewTaskDetails && task && currentMember) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
        {/* Access denied header */}
        <div className="bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="hover:bg-gray-100 transition-all duration-200 group"
              >
                <ArrowLeftIcon className="size-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
                Back
              </Button>
              <div className="h-4 w-px bg-gray-300" />
              <span className="text-sm text-red-600 font-medium">Access Restricted</span>
            </div>
          </div>
        </div>

        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="bg-white/90 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg p-8 lg:p-12">
            <div className="text-center space-y-6">
              {/* Access denied icon */}
              <div className="mx-auto w-24 h-24 bg-gradient-to-br from-red-50 to-red-100 rounded-full flex items-center justify-center shadow-lg">
                <FileTextIcon className="w-12 h-12 text-red-600" />
              </div>

              {/* Access denied content */}
              <div className="space-y-4">
                <h1 className="text-3xl font-bold text-gray-900">Access Restricted</h1>
                <div className="space-y-3">
                  <p className="text-lg text-gray-700 leading-relaxed">
                    You don&apos;t have permission to view this task&apos;s details.
                  </p>
                  <p className="text-gray-600">
                    Only the task assignee, creator, reviewer, followers, and workspace administrators can access task details.
                  </p>
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
                    <strong>Need access?</strong> Contact the task assignee, reviewer, a follower, or a workspace administrator to be added as a follower.
                  </div>
                </div>
              </div>

              {/* Enhanced action buttons */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-6">
                <Button
                  variant="outline"
                  onClick={() => router.back()}
                  className="hover:bg-gray-50 transition-all duration-200 group px-6 py-3"
                >
                  <ArrowLeftIcon className="size-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
                  Go Back
                </Button>
                <Button
                  onClick={() => router.push(`/workspaces/${workspaceId}/tasks`)}
                  className="bg-blue-600 hover:bg-blue-700 transition-all duration-200 px-6 py-3"
                >
                  View All Tasks
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }



  // Initialize edit form when opening modal
  const handleEditMode = () => {
    if (task) {
      setEditForm({
        name: task.name,
        description: task.description || "",
        status: task.status as TaskStatus,
        assigneeIds: assignees.map(a => a.id),
        reviewerId: task.reviewerId || "unassigned",
        serviceId: task.serviceId,
        workspaceId: task.workspaceId,
        dueDate: task.dueDate ? new Date(task.dueDate) : new Date(),
        attachmentId: task.attachmentId || "",
        isConfidential: task.isConfidential || false,
      });
      setSelectedFollowers(followedIds);
      setSelectedCollaborators(collaboratorIds);
      setIsPropertiesModalOpen(true);
    }
  };

  const handleSaveChanges = () => {
    if (!task) return;

    const updatePayload: {
      name: string;
      description: string;
      assigneeIds: string;
      reviewerId: string;
      serviceId: string;
      workspaceId: string;
      dueDate: string;
      attachmentId: string;
      followedIds: string;
      collaboratorIds: string;
      isConfidential: boolean;
      status?: TaskStatus;
    } = {
      name: editForm.name,
      description: editForm.description,
      assigneeIds: JSON.stringify(editForm.assigneeIds),
      reviewerId: editForm.reviewerId === "unassigned" ? "" : editForm.reviewerId,
      serviceId: editForm.serviceId,
      workspaceId: editForm.workspaceId,
      dueDate: editForm.dueDate.toISOString(),
      attachmentId: editForm.attachmentId,
      followedIds: JSON.stringify(selectedFollowers),
      collaboratorIds: JSON.stringify(selectedCollaborators),
      isConfidential: editForm.isConfidential,
    };

    // Only include status if user can edit status (not a customer)
    if (canEditStatus) {
      updatePayload.status = editForm.status;
    }

    updateTask({
      param: { taskId: task.id },
      json: updatePayload,
    });
  };

  const handleViewAttachment = async () => {
    if (!task?.attachmentId) return;

    try {
      // Track the view action
      createHistory({
        json: {
          taskId: task.id,
          action: TaskHistoryAction.ATTACHMENT_VIEWED,
        }
      });
      
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
      // Fallback: trigger download instead
      const link = document.createElement("a");
      link.href = `/api/download/${task.attachmentId}`;
      link.target = "_blank";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleArchiveTask = async () => {
    const ok = await confirm();
    if (!ok) return;

    deleteTask(
      { param: { taskId: task!.id } },
      {
        onSuccess: () => {
          // Log archive action to task history
          createHistory({
            json: {
              taskId: task!.id,
              action: TaskHistoryAction.ARCHIVED,
              details: "Task archived by user"
            }
          });
          router.back(); // Navigate back after successful archiving
        },
      }
    );
  };

  const handleFollowersSave = (newFollowers: string[]) => {
    if (!task) return;

    const updatePayload = {
      followedIds: JSON.stringify(newFollowers),
    };

    updateTask(
      {
        param: { taskId: task.id },
        json: updatePayload,
      },
      {
        onSuccess: () => {
          setSelectedFollowers(newFollowers);
        },
        onError: (error) => {
          console.error("Failed to update followers:", error);
          toast.error("Failed to update followers");
        },
      }
    );
  };

  const handleCollaboratorsSave = (newCollaborators: string[]) => {
    if (!task) return;

    const updatePayload = {
      collaboratorIds: JSON.stringify(newCollaborators),
    };

    updateTask(
      {
        param: { taskId: task.id },
        json: updatePayload,
      },
      {
        onSuccess: () => {
          setSelectedCollaborators(newCollaborators);
        },
        onError: (error) => {
          console.error("Failed to update collaborators:", error);
          toast.error("Failed to update collaborators");
        },
      }
    );
  };

  const handleAssigneesSave = (newAssignees: string[]) => {
    if (!task) return;

    const updatePayload = {
      assigneeIds: JSON.stringify(newAssignees),
    };

    updateTask(
      {
        param: { taskId: task.id },
        json: updatePayload,
      },
      {
        onSuccess: () => {
          setEditForm(prev => ({ ...prev, assigneeIds: newAssignees }));
        },
        onError: (error) => {
          console.error("Failed to update assignees:", error);
          toast.error("Failed to update assignees");
        },
      }
    );
  };

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (!task || !canEditStatus) return;

    const updatePayload = {
      name: task.name,
      description: task.description || "",
      status: newStatus,
      assigneeIds: JSON.stringify(assignees.map(a => a.id)),
      serviceId: task.serviceId,
      dueDate: task.dueDate || new Date().toISOString(),
      attachmentId: task.attachmentId || "",
      followedIds: task.followedIds || "[]",
      collaboratorIds: task.collaboratorIds || "[]",
      isConfidential: task.isConfidential || false,
    };

    updateTask(
      {
        param: { taskId: task.id },
        json: updatePayload,
      },
      {
        onSuccess: () => {
          toast.success(`Task moved to ${newStatus.replace('_', ' ').toLowerCase()}`);
        },
        onError: (error) => {
          console.error("Failed to update task status:", error);
          toast.error("Failed to update task status");
        },
      }
    );
  };

  // Handle Start Task - updates status to IN_PROGRESS and adds current user as assignee
  const handleStartTask = async () => {
    const ok = await confirmStartTask();
    if (!ok || !task || !currentMember) return;

    // Get current assignee IDs and add current user if not already assigned
    const currentAssigneeIds = assignees.map(a => a.id);
    const newAssigneeIds = currentAssigneeIds.includes(currentMember.id)
      ? currentAssigneeIds
      : [...currentAssigneeIds, currentMember.id];

    const updatePayload = {
      name: task.name,
      description: task.description || "",
      status: TaskStatus.IN_PROGRESS,
      assigneeIds: JSON.stringify(newAssigneeIds),
      serviceId: task.serviceId,
      dueDate: task.dueDate || new Date().toISOString(),
      attachmentId: task.attachmentId || "",
      followedIds: task.followedIds || "[]",
      collaboratorIds: task.collaboratorIds || "[]",
      isConfidential: task.isConfidential || false,
    };

    updateTask(
      {
        param: { taskId: task.id },
        json: updatePayload,
      },
      {
        onSuccess: () => {
          toast.success("Task started! You've been added as an assignee.");
        },
        onError: (error) => {
          console.error("Failed to start task:", error);
          toast.error("Failed to start task");
        },
      }
    );
  };

  // Read-only mode for non-involved members viewing non-confidential tasks
  const isReadOnlyViewer = !isInvolvedInTask && !task?.isConfidential && canViewTaskDetails;

  // Determine if Start Task button should be shown
  // Show when: task is in TODO or BACKLOG, user is a workspace member (not customer), and user is not already assigned
  // Available to ALL workspace members (including read-only viewers) so they can pick up tasks
  const canStartTask = (task.status === TaskStatus.TODO || task.status === TaskStatus.BACKLOG) &&
    currentMember?.role !== MemberRole.CUSTOMER &&
    !isAssignee;

  // Determine if Mark as Reviewed button should be shown
  // Show when: task is in IN_REVIEW stage and:
  // - If task has a reviewer assigned: only the assigned reviewer can see/use the button
  // - If no reviewer assigned: any workspace member (non-customer) can see/use the button (not read-only viewers)
  const hasReviewer = task.reviewerId && task.reviewerId !== "";
  const canMarkAsReviewed = !isReadOnlyViewer &&
    task.status === TaskStatus.IN_REVIEW &&
    (hasReviewer
      ? isReviewer
      : (currentMember?.role !== MemberRole.CUSTOMER));

  // Determine if For Review button should be shown
  // Show when: task is in IN_PROGRESS and user is an assignee
  const canSubmitForReview = task.status === TaskStatus.IN_PROGRESS && isAssignee;

  // Handle Submit for Review - updates status to IN_REVIEW
  const handleSubmitForReview = async () => {
    const ok = await confirmForReview();
    if (!ok || !task) return;

    const updatePayload = {
      name: task.name,
      description: task.description || "",
      status: TaskStatus.IN_REVIEW,
      assigneeIds: JSON.stringify(assignees.map(a => a.id)),
      serviceId: task.serviceId,
      dueDate: task.dueDate || new Date().toISOString(),
      attachmentId: task.attachmentId || "",
      followedIds: task.followedIds || "[]",
      collaboratorIds: task.collaboratorIds || "[]",
      isConfidential: task.isConfidential || false,
    };

    updateTask(
      {
        param: { taskId: task.id },
        json: updatePayload,
      },
      {
        onSuccess: () => {
          toast.success("Task submitted for review!");
        },
        onError: (error) => {
          console.error("Failed to submit task for review:", error);
          toast.error("Failed to submit task for review");
        },
      }
    );
  };

  // Handle Mark as Reviewed - updates status to DONE and records the reviewer
  const handleMarkAsReviewed = async () => {
    const ok = await confirmReview();
    if (!ok || !task || !currentMember) return;

    const updatePayload = {
      name: task.name,
      description: task.description || "",
      status: TaskStatus.DONE,
      assigneeIds: JSON.stringify(assignees.map(a => a.id)),
      reviewerId: currentMember.id, // Record the current user as the reviewer
      serviceId: task.serviceId,
      dueDate: task.dueDate || new Date().toISOString(),
      attachmentId: task.attachmentId || "",
      followedIds: task.followedIds || "[]",
      collaboratorIds: task.collaboratorIds || "[]",
      isConfidential: task.isConfidential || false,
    };

    updateTask(
      {
        param: { taskId: task.id },
        json: updatePayload,
      },
      {
        onSuccess: () => {
          toast.success("Task marked as reviewed and completed!");
        },
        onError: (error) => {
          console.error("Failed to mark task as reviewed:", error);
          toast.error("Failed to mark task as reviewed");
        },
      }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50/30">
      <ConfirmDialog />
      <ReviewConfirmDialog />
      <StartTaskConfirmDialog />
      <ForReviewConfirmDialog />
      <ManageFollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        onSave={handleFollowersSave}
        currentFollowers={followedIds}
        availableMembers={(members?.documents || []).filter(m => (m as Member).role === MemberRole.CUSTOMER) as Member[]}
        currentAssignees={assignees.map(a => a.id)}
        isLoading={isUpdating}
      />
      <ManageCollaboratorsModal
        isOpen={isCollaboratorsModalOpen}
        onClose={() => setIsCollaboratorsModalOpen(false)}
        onSave={handleCollaboratorsSave}
        currentCollaborators={collaboratorIds}
        availableMembers={(members?.documents || []) as Member[]}
        currentAssignees={assignees.map(a => a.id)}
        isLoading={isUpdating}
      />
      <ManageAssigneesModal
        isOpen={isAssigneesModalOpen}
        onClose={() => setIsAssigneesModalOpen(false)}
        onSave={handleAssigneesSave}
        currentAssignees={assignees.map(a => a.id)}
        availableMembers={(members?.documents || []) as Member[]}
        isConfidential={task.isConfidential}
        isLoading={isUpdating}
      />

      {/* Enhanced Header with Breadcrumb */}
      <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-gray-200/50 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.back()}
                className="hover:bg-gray-100 transition-all duration-200 group"
                aria-label="Go back to previous page"
              >
                <ArrowLeftIcon className="size-4 mr-2 group-hover:-translate-x-0.5 transition-transform" />
                Back
              </Button>
              <div className="h-4 w-px bg-gray-300" />
              <span className="text-sm text-gray-600 font-medium">Task Details</span>
            </div>

            {/* Action Buttons - Ordered: Actions first, then View/Update/Archive */}
            <div className="flex items-center gap-2">
              {/* Primary Action Buttons (workflow actions) */}
              {canStartTask && (
                <Button
                  size="sm"
                  onClick={handleStartTask}
                  disabled={isUpdating}
                  className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md transition-all duration-200"
                >
                  <PlayIcon className="size-4 mr-2" />
                  <span className="hidden sm:inline">Start</span> Task
                </Button>
              )}
              {canSubmitForReview && (
                <Button
                  size="sm"
                  onClick={handleSubmitForReview}
                  disabled={isUpdating}
                  className="bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-md transition-all duration-200"
                >
                  <SendIcon className="size-4 mr-2" />
                  <span className="hidden sm:inline">For</span> Review
                </Button>
              )}
              {canMarkAsReviewed && (
                <Button
                  size="sm"
                  onClick={handleMarkAsReviewed}
                  disabled={isUpdating}
                  className="bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-md transition-all duration-200"
                >
                  <CheckCircleIcon className="size-4 mr-2" />
                  <span className="hidden sm:inline">Mark as Reviewed &</span> Done
                </Button>
              )}

              {/* Secondary Actions (view/edit/archive) */}
              {task.attachmentId && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleViewAttachment}
                  className="hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200"
                >
                  <FileTextIcon className="size-4 mr-2" />
                  <span className="hidden sm:inline">View</span> Attachment
                </Button>
              )}
              {canEdit && (isAssignee || isWorkspaceAdmin || isSuperAdmin) && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleEditMode}
                  className="hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-all duration-200"
                >
                  <EditIcon className="size-4 mr-2" />
                  <span className="hidden sm:inline">Update</span> Task
                </Button>
              )}
              {canDelete && !isAlreadyArchived && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleArchiveTask}
                  disabled={isDeleting}
                  className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-all duration-200"
                >
                  {isDeleting ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      <span className="hidden sm:inline">Archiving...</span>
                    </>
                  ) : (
                    <>
                      <ArchiveIcon className="size-4 mr-2" />
                      <span className="hidden sm:inline">Archive</span>
                    </>
                  )}
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        {/* Enhanced Task Header */}
        <div className="mb-8">
          <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-gray-200/60 shadow-lg p-6 lg:p-8">
            {/* Task Number & Status Indicator Row */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex items-center px-3 py-1.5 rounded-full text-sm font-mono font-semibold text-blue-700 bg-blue-100 border border-blue-200 shadow-sm">
                  {task.taskNumber || `Task #${task.id.slice(-7)}`}
                </span>
                {task.isConfidential && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold text-red-700 bg-red-100 border border-red-200 shadow-sm">
                    🔒 Confidential
                  </span>
                )}
              </div>

              {/* Enhanced Stage Indicator */}
              <div className="flex-shrink-0">
                <EnhancedStageIndicator
                  currentStatus={task.status as TaskStatus}
                  onStatusChange={handleStatusChange}
                  taskName={task.name}
                  isClickable={false}
                />
              </div>
            </div>

            {/* Task Title */}
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-gray-900 leading-tight mb-6 break-words">
              {task.name}
            </h1>

            {/* Enhanced Meta Information */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <div className="flex items-center gap-2.5 p-2.5 bg-gray-50/80 rounded-lg border border-gray-200/50">
                <div className="flex-shrink-0 w-7 h-7 bg-indigo-100 rounded-lg flex items-center justify-center">
                  <UserIcon className="size-3.5 text-indigo-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-0.5">Assignee{assignees.length > 1 ? 's' : ''}</p>
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {assignees.length > 0 ? assignees.map(a => a.name).join(', ') : "Unassigned"}
                  </p>
                </div>
              </div>

              {(task.status === 'IN_REVIEW' || task.status === 'DONE') && (
                <div className="flex items-center gap-2.5 p-2.5 bg-gray-50/80 rounded-lg border border-gray-200/50">
                  <div className="flex-shrink-0 w-7 h-7 bg-purple-100 rounded-lg flex items-center justify-center">
                    <UserIcon className="size-3.5 text-purple-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-0.5">Reviewer</p>
                    <p className="text-xs font-semibold text-gray-900 truncate">
                      {reviewer?.name || "No Reviewer"}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2.5 p-2.5 bg-gray-50/80 rounded-lg border border-gray-200/50">
                <div className="flex-shrink-0 w-7 h-7 bg-orange-100 rounded-lg flex items-center justify-center">
                  <CalendarIcon className="size-3.5 text-orange-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-0.5">Due Date</p>
                  <div className="text-xs font-semibold text-gray-900">
                    <TaskDate value={task.dueDate} />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 bg-gray-50/80 rounded-lg border border-gray-200/50">
                <div className="flex-shrink-0 w-7 h-7 bg-green-100 rounded-lg flex items-center justify-center">
                  <Package className="size-3.5 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-0.5">Service</p>
                  <p className="text-xs font-semibold text-gray-900 truncate">
                    {service?.name || "No service"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 bg-gray-50/80 rounded-lg border border-gray-200/50">
                <div className="flex-shrink-0 w-7 h-7 bg-cyan-100 rounded-lg flex items-center justify-center">
                  <UsersIcon className="size-3.5 text-cyan-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-0.5">Collaborators</p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-gray-900">
                      {collaborators.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsCollaboratorsModalOpen(true)}
                      className="text-[10px] text-cyan-600 hover:text-cyan-700 hover:bg-cyan-50 p-0.5 h-auto transition-all duration-200 hover:scale-105"
                      aria-label={`Manage collaborators for task ${task.name}`}
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2.5 p-2.5 bg-gray-50/80 rounded-lg border border-gray-200/50">
                <div className="flex-shrink-0 w-7 h-7 bg-teal-100 rounded-lg flex items-center justify-center">
                  <UserIcon className="size-3.5 text-teal-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wide mb-0.5">Followers</p>
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-semibold text-gray-900">
                      {followers.length}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsFollowersModalOpen(true)}
                      className="text-[10px] text-teal-600 hover:text-teal-700 hover:bg-teal-50 p-0.5 h-auto transition-all duration-200 hover:scale-105"
                      aria-label={`Manage followers for task ${task.name}`}
                    >
                      Manage
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Main Content Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-10 gap-6 lg:gap-8">
          {/* Primary Content Area - Left Column */}
          <div className="xl:col-span-6 space-y-6">
            {/* Enhanced Description Section */}
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardHeader className="pb-4">
                <CardTitle className="text-xl font-bold text-gray-900 flex items-center gap-3">
                  <div className="w-2 h-8 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full shadow-sm" />
                  <span>Description</span>
                  {!task.description && (
                    <span className="text-sm font-normal text-gray-500 ml-auto">
                      No description provided
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {/* Fixed height container for exactly 6 lines */}
                <div className="h-[144px] overflow-hidden">
                  {task.description ? (
                    <div className="prose prose-sm max-w-none h-full">
                      <div className="text-gray-700 whitespace-pre-wrap leading-6 p-4 bg-gray-50/50 rounded-xl border border-gray-200/50 h-full overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                        {task.description}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center">
                      <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mb-3">
                        <FileTextIcon className="w-6 h-6 text-gray-400" />
                      </div>
                      <p className="text-gray-500 text-sm font-medium mb-2">No description yet</p>
                      {canEdit && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEditMode}
                          className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs"
                        >
                          <EditIcon className="size-3 mr-1" />
                          Add Description
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Enhanced Activity History and Sub Tasks */}
            <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300">
              <CardContent className="p-0">
                <Tabs defaultValue="timeline" className="w-full">
                  <TabsList className="w-full justify-start rounded-none border-b bg-gray-50/50">
                    <TabsTrigger value="timeline" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      Activity Timeline
                    </TabsTrigger>
                    <TabsTrigger value="subtasks" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      Sub Tasks
                    </TabsTrigger>
                    <TabsTrigger value="attachments" className="data-[state=active]:bg-white data-[state=active]:shadow-sm">
                      Attachments
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="timeline" className="m-0">
                    {/* Fixed height to align with chat */}
                    <div className="h-[440px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      <div className="px-6 py-6">
                        <TaskHistory taskId={task.id} />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="subtasks" className="m-0">
                    {/* Fixed height to align with chat */}
                    <div className="h-[440px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      <div className="px-6 py-6">
                        <SubTasksTable
                          parentTaskId={task.id}
                        />
                      </div>
                    </div>
                  </TabsContent>
                  <TabsContent value="attachments" className="m-0">
                    {/* Fixed height to align with chat */}
                    <div className="h-[440px] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
                      <div className="px-6 py-6">
                        <TaskAttachmentsTable
                          taskId={task.id}
                          workspaceId={task.workspaceId}
                          taskNumber={task.taskNumber}
                        />
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Enhanced Chat Section - Right Column */}
          <div className="xl:col-span-4">
            <div className="sticky top-24">
              <TaskChat
                taskId={task.id}
                className="h-[780px] bg-white/90 backdrop-blur-sm border border-gray-200/60 shadow-lg hover:shadow-xl transition-all duration-300"
              />

              {/* Quick actions panel for mobile - Aligned with chat height */}
              <div className="xl:hidden mt-6">
                <Card className="bg-white/90 backdrop-blur-sm border border-gray-200/60 shadow-lg h-[140px]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                      <div className="w-1 h-6 bg-purple-500 rounded-full" />
                      Quick Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="grid grid-cols-2 gap-2">
                      {/* Primary Action Buttons (workflow actions) */}
                      {canStartTask && (
                        <Button
                          size="sm"
                          onClick={handleStartTask}
                          disabled={isUpdating}
                          className="justify-start bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white text-xs h-8"
                          aria-label="Start this task"
                        >
                          <PlayIcon className="size-3 mr-1" />
                          Start Task
                        </Button>
                      )}
                      {canSubmitForReview && (
                        <Button
                          size="sm"
                          onClick={handleSubmitForReview}
                          disabled={isUpdating}
                          className="justify-start bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white text-xs h-8"
                          aria-label="Submit task for review"
                        >
                          <SendIcon className="size-3 mr-1" />
                          For Review
                        </Button>
                      )}
                      {canMarkAsReviewed && (
                        <Button
                          size="sm"
                          onClick={handleMarkAsReviewed}
                          disabled={isUpdating}
                          className="justify-start bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white text-xs h-8"
                          aria-label="Mark task as reviewed and done"
                        >
                          <CheckCircleIcon className="size-3 mr-1" />
                          Reviewed & Done
                        </Button>
                      )}

                      {/* Secondary Actions (view/edit/archive) */}
                      {task.attachmentId && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleViewAttachment}
                          className="justify-start hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-all duration-200 text-xs h-8"
                          aria-label="View task attachment"
                        >
                          <FileTextIcon className="size-3 mr-1" />
                          View Attachment
                        </Button>
                      )}
                      {canEdit && (isAssignee || isWorkspaceAdmin || isSuperAdmin) && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleEditMode}
                          className="justify-start hover:bg-green-50 hover:border-green-200 hover:text-green-700 transition-all duration-200 text-xs h-8"
                          aria-label="Edit task properties"
                        >
                          <EditIcon className="size-3 mr-1" />
                          Edit Task
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsFollowersModalOpen(true)}
                        className="justify-start hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all duration-200 text-xs h-8"
                        aria-label="Manage task followers"
                      >
                        <UserIcon className="size-3 mr-1" />
                        Followers
                      </Button>
                      {canDelete && !isAlreadyArchived && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={handleArchiveTask}
                          disabled={isDeleting}
                          className="justify-start text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-all duration-200 text-xs h-8"
                          aria-label="Archive this task"
                        >
                          {isDeleting ? (
                            <>
                              <LoadingSpinner size="sm" className="mr-1" />
                              Archiving...
                            </>
                          ) : (
                            <>
                              <ArchiveIcon className="size-3 mr-1" />
                              Archive
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Properties Modal */}
      <TaskPropertiesModal
        isOpen={isPropertiesModalOpen}
        onClose={() => setIsPropertiesModalOpen(false)}
        task={{
          id: task.id,
          taskNumber: task.taskNumber || `Task #${task.id.slice(-7)}`,
          name: task.name,
          status: task.status as TaskStatus,
          workspaceId: task.workspaceId,
          reviewerId: task.reviewerId || null,
          serviceId: task.serviceId,
          position: task.position,
          dueDate: task.dueDate ? String(task.dueDate) : null,
          description: task.description,
          attachmentId: task.attachmentId,
          followedIds: task.followedIds || "[]",
          collaboratorIds: task.collaboratorIds || "[]",
          creatorId: task.creatorId,
          isConfidential: task.isConfidential,
          createdAt: String(task.createdAt),
          updatedAt: String(task.updatedAt),
        }}
        editForm={editForm}
        setEditForm={setEditForm}
        onSave={handleSaveChanges}
        isLoading={isUpdating}
        members={editForm.workspaceId !== workspaceId && targetMembers ? targetMembers as { documents: Member[] } | undefined : members as { documents: Member[] } | undefined}
        services={services as { documents: Service[] } | undefined}
        workspaces={workspaces}
        assignees={assignees as Member[]}
        followers={followers as Member[]}
        collaborators={collaborators as Member[]}
        canEditStatus={canEditStatus}
        onManageAssignees={() => setIsAssigneesModalOpen(true)}
        onManageFollowers={() => setIsFollowersModalOpen(true)}
        onManageCollaborators={() => setIsCollaboratorsModalOpen(true)}
        onWorkspaceChange={(_workspaceId) => {
          // When workspace changes, we need to refresh services for the new workspace
          // The useGetServices hook will automatically refetch when workspaceId changes
          // Note: Followers and collaborators will be filtered on the server to keep only those who are members of the target workspace
        }}
      />
    </div>
  );
}