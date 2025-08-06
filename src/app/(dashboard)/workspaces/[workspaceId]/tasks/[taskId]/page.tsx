"use client";

import { useState, useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "next/navigation";
import { useGetTask } from "@/features/tasks/api/use-get-task";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetServices } from "@/features/services/api/use-get-services";
import { useUpdateTask } from "@/features/tasks/api/use-update-task";
import { useCreateTaskHistory } from "@/features/tasks/api/use-create-task-history";
import { TaskHistoryAction } from "@/features/tasks/types/history";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeftIcon, CalendarIcon, Package, UserIcon, EditIcon, FileTextIcon, ArchiveIcon } from "lucide-react";
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
import { TaskPropertiesModal } from "@/features/tasks/components/task-properties-modal";
import { EnhancedStageIndicator } from "@/features/tasks/components/enhanced-stage-indicator";

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
    assigneeId: "unassigned",
    serviceId: "",
    dueDate: new Date(),
    attachmentId: "",
    isConfidential: false,
  });

  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [isFollowersModalOpen, setIsFollowersModalOpen] = useState(false);
  const [isPropertiesModalOpen, setIsPropertiesModalOpen] = useState(false);

  const { data: task, isLoading: isLoadingTask } = useGetTask({ 
    taskId: params.taskId 
  });
  
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({ 
    workspaceId 
  });
  
  const { data: services, isLoading: isLoadingServices } = useGetServices({ 
    workspaceId 
  });


  const { mutate: updateTask, isPending: isUpdating } = useUpdateTask();
  const { mutate: createHistory } = useCreateTaskHistory();
  const { mutate: deleteTask, isPending: isDeleting } = useDeleteTask();
  const { data: currentUser } = useCurrent();
  
  const [ConfirmDialog, confirm] = useConfirm(
    "Archive Task",
    "This task will be archived and moved out of active views. You can still access it by filtering for 'Archived' tasks in the table view.",
    "destructive"
  );

  // Handle refresh parameter from notifications
  useEffect(() => {
    const refreshParam = searchParams.get('refresh');
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
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          <div className="flex flex-col items-center justify-center h-96">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <FileTextIcon className="w-8 h-8 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">Invalid Task ID</h1>
                <p className="text-gray-600 max-w-md">
                  The task ID format is invalid. Please check the URL and try again.
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => router.back()}
                className="mt-6 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeftIcon className="size-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const isLoading = isLoadingTask || isLoadingMembers || isLoadingServices;

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          <div className="animate-pulse space-y-8">
            {/* Header Skeleton */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-16 bg-gray-200 rounded" />
                  <div className="h-4 w-px bg-gray-200" />
                  <div className="h-4 w-32 bg-gray-200 rounded" />
                </div>
                <div className="flex gap-2">
                  <div className="h-8 w-20 bg-gray-200 rounded" />
                  <div className="h-8 w-24 bg-gray-200 rounded" />
                </div>
              </div>
              <div className="h-10 w-2/3 bg-gray-200 rounded" />
              <div className="h-4 w-1/3 bg-gray-200 rounded" />
            </div>
            
            {/* Content Skeleton */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-6">
              <div className="lg:col-span-2 xl:col-span-2 space-y-6">
                <div className="h-64 bg-gray-200 rounded-lg" />
                <div className="h-[380px] bg-gray-200 rounded-lg" />
              </div>
              <div className="lg:col-span-1 xl:col-span-2">
                <div className="h-[720px] bg-gray-200 rounded-lg" />
              </div>
              <div className="lg:col-span-1 xl:col-span-1">
                <div className="h-[600px] bg-gray-200 rounded-lg" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!task) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
        <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
          <div className="flex flex-col items-center justify-center h-96">
            <div className="text-center space-y-4">
              <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
                <FileTextIcon className="w-8 h-8 text-gray-400" />
              </div>
              <div className="space-y-2">
                <h1 className="text-2xl font-bold text-gray-900">Task not found</h1>
                <p className="text-gray-600 max-w-md">
                  The task you&apos;re looking for doesn&apos;t exist or has been removed.
                </p>
              </div>
              <Button 
                variant="outline" 
                onClick={() => router.back()}
                className="mt-6 hover:bg-gray-50 transition-colors"
              >
                <ArrowLeftIcon className="size-4 mr-2" />
                Go Back
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const assignee = members?.documents.find(
    (member) => member.id === task.assigneeId
  );

  const service = services?.documents.find(
    (serv) => serv.id === task.serviceId
  );


  // Parse followers from task
  const followedIds = task?.followedIds ? (() => {
    try {
      return JSON.parse(task.followedIds);
    } catch {
      return [];
    }
  })() : [];

  // Get follower members
  const followers = members?.documents.filter((member) => 
    followedIds.includes(member.id)
  ) || [];

  // Find current user's member record to check delete permissions
  const currentMember = members?.documents.find((member) => 
    (member as Member).userId === currentUser?.id
  ) as Member;
  
  const isCreator = currentUser && task?.creatorId ? currentUser.id === task.creatorId : false;
  const isWorkspaceAdmin = currentMember?.role === MemberRole.ADMIN;
  const canDelete = isCreator || isWorkspaceAdmin;
  
  // Visitors can edit tasks but cannot change status
  const canEdit = currentMember?.role !== undefined; // All members (including visitors) can edit
  const canEditStatus = currentMember?.role !== MemberRole.VISITOR; // Only non-visitors can edit status



  // Initialize edit form when opening modal
  const handleEditMode = () => {
    if (task) {
      setEditForm({
        name: task.name,
        description: task.description || "",
        status: task.status as TaskStatus,
        assigneeId: task.assigneeId || "unassigned",
        serviceId: task.serviceId,
        dueDate: task.dueDate ? new Date(task.dueDate) : new Date(),
        attachmentId: task.attachmentId || "",
        isConfidential: task.isConfidential || false,
      });
      setSelectedFollowers(followedIds);
      setIsPropertiesModalOpen(true);
    }
  };

  const handleSaveChanges = () => {
    if (!task) return;

    const updatePayload: {
      name: string;
      description: string;
      assigneeId: string;
      serviceId: string;
      dueDate: string;
      attachmentId: string;
      followedIds: string;
      isConfidential: boolean;
      status?: TaskStatus;
    } = {
      name: editForm.name,
      description: editForm.description,
      assigneeId: editForm.assigneeId === "unassigned" ? "" : editForm.assigneeId,
      serviceId: editForm.serviceId,
      dueDate: editForm.dueDate.toISOString(),
      attachmentId: editForm.attachmentId,
      followedIds: JSON.stringify(selectedFollowers),
      isConfidential: editForm.isConfidential,
    };

    // Only include status if user can edit status (not a visitor)
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

  const handleStatusChange = (newStatus: TaskStatus) => {
    if (!task || !canEditStatus) return;

    const updatePayload = {
      name: task.name,
      description: task.description || "",
      status: newStatus,
      assigneeId: task.assigneeId || "",
      serviceId: task.serviceId,
      dueDate: task.dueDate || new Date().toISOString(),
      attachmentId: task.attachmentId || "",
      followedIds: task.followedIds || "[]",
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-white">
      <ConfirmDialog />
      <ManageFollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        onSave={handleFollowersSave}
        currentFollowers={followedIds}
        availableMembers={(members?.documents || []) as Member[]}
        isLoading={isUpdating}
      />
      <div className="max-w-7xl mx-auto p-4 md:p-6 lg:p-8">
        {/* Header Section */}
        <div className="mb-8">
          {/* Breadcrumb Bar */}
          <div className="flex items-center gap-x-3 mb-4">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => router.back()}
              className="hover:bg-gray-100 transition-colors"
            >
              <ArrowLeftIcon className="size-4 mr-2" />
              Back
            </Button>
          </div>


          {/* Task Title */}
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl font-bold text-gray-900 break-words">{task.name}</h1>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end mb-4">
              <div className="flex items-center gap-x-2">
                {task.attachmentId && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleViewAttachment}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <FileTextIcon className="size-4 mr-2" />
                    View Attachment
                  </Button>
                )}
                {canEdit && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleEditMode}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <EditIcon className="size-4 mr-2" />
                    Update Task
                  </Button>
                )}
                {canDelete && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleArchiveTask}
                    disabled={isDeleting}
                    className="text-orange-600 border-orange-200 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-colors"
                  >
                    {isDeleting ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Archiving...
                      </>
                    ) : (
                      <>
                        <ArchiveIcon className="size-4 mr-2" />
                        Archive Task
                      </>
                    )}
                  </Button>
                )}
              </div>
            </div>

            {/* Task Meta Info & Stage Indicator */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <UserIcon className="size-4" />
                  <span>{assignee?.name || "Unassigned"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="size-4" />
                  <TaskDate value={task.dueDate} />
                </div>
                <div className="flex items-center gap-2">
                  <Package className="size-4" />
                  <span>{service?.name || "No service"}</span>
                </div>
                {task.isConfidential && (
                  <div className="flex items-center">
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded-md border border-red-200">
                      Confidential
                    </span>
                  </div>
                )}
              </div>
              
              {/* Enhanced Stage Indicator */}
              {canEditStatus && (
                <EnhancedStageIndicator
                  currentStatus={task.status as TaskStatus}
                  onStatusChange={handleStatusChange}
                  taskName={task.name}
                />
              )}
            </div>
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Primary Content Area */}
          <div className="space-y-6">
            {/* Description Section */}
            <Card className="shadow-lg border-2 border-neutral-200/60 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-1 h-6 bg-blue-500 rounded-full" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-[200px] overflow-y-auto">
                  {task.description ? (
                    <div className="prose prose-sm max-w-none">
                      <p className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                        {task.description}
                      </p>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-40 border-2 border-dashed border-gray-200 rounded-lg">
                      <p className="text-gray-500 italic">No description provided yet</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Activity History */}
            <Card className="h-[390px] shadow-lg border-2 border-neutral-200/60 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300 flex flex-col">
              <CardHeader className="pb-3 flex-shrink-0">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-1 h-6 bg-green-500 rounded-full" />
                  Activity Timeline
                </CardTitle>
              </CardHeader>
              <CardContent className="flex-1 overflow-hidden p-0">
                <div className="h-full overflow-y-auto px-6 pb-6">
                  <TaskHistory taskId={task.id} />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Chat Section */}
          <div>
            <div className="sticky top-6">
              <TaskChat taskId={task.id} className="h-[705px] shadow-lg border-2 border-neutral-200/60 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300" />
            </div>
          </div>

        </div>
      </div>

      {/* Modals */}
      <ManageFollowersModal
        isOpen={isFollowersModalOpen}
        onClose={() => setIsFollowersModalOpen(false)}
        onSave={handleFollowersSave}
        currentFollowers={followedIds}
        availableMembers={(members?.documents || []) as Member[]}
        isLoading={isUpdating}
      />

      <TaskPropertiesModal
        isOpen={isPropertiesModalOpen}
        onClose={() => setIsPropertiesModalOpen(false)}
        task={{
          id: task.id,
          name: task.name,
          status: task.status as TaskStatus,
          workspaceId: task.workspaceId,
          assigneeId: task.assigneeId,
          serviceId: task.serviceId,
          position: task.position,
          dueDate: task.dueDate ? String(task.dueDate) : null,
          description: task.description,
          attachmentId: task.attachmentId,
          followedIds: JSON.stringify(task.followers?.map(f => f.id) || []),
          creatorId: task.creatorId,
          isConfidential: task.isConfidential,
          createdAt: String(task.createdAt),
          updatedAt: String(task.updatedAt),
        }}
        editForm={editForm}
        setEditForm={setEditForm}
        onSave={handleSaveChanges}
        isLoading={isUpdating}
        members={members as { documents: Member[] } | undefined}
        services={services as { documents: Service[] } | undefined}
        followers={followers as Member[]}
        canEditStatus={canEditStatus}
        onManageFollowers={() => setIsFollowersModalOpen(true)}
      />
    </div>
  );
}