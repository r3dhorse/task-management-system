"use client";

import { useState } from "react";
import { useGetTask } from "@/features/tasks/api/use-get-task";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetServices } from "@/features/services/api/use-get-services";
import { useUpdateTask } from "@/features/tasks/api/use-update-task";
import { useCreateTaskHistory } from "@/features/tasks/api/use-create-task-history";
import { TaskHistoryAction } from "@/features/tasks/types/history";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftIcon, CalendarIcon, FolderIcon, UserIcon, EditIcon, SaveIcon, XIcon, FileTextIcon, UsersIcon, ArchiveIcon, EyeOffIcon, PlusIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useDeleteTask } from "@/features/tasks/api/use-delete-task";
import { useConfirm } from "@/hooks/use-confirm";
import { useCurrent } from "@/features/auth/api/use-current";
import { toast } from "sonner";
import { StatusBadge, StatusIndicator } from "@/features/tasks/components/status-badge";
import { TaskDate } from "@/features/tasks/components/task-date";
import { DatePicker } from "@/components/date-picker";
import { TaskStatus } from "@/features/tasks/types";
import { FileUpload } from "@/components/file-upload";
import { TaskHistory } from "@/features/tasks/components/task-history";
import { TaskChat } from "@/features/tasks/components/task-chat";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Member, MemberRole } from "@/features/members/types";
import { Switch } from "@/components/ui/switch";
import { ManageFollowersModal } from "@/features/tasks/components/manage-followers-modal";

interface TaskDetailsPageProps {
  params: {
    workspaceId: string;
    taskId: string;
  };
}

export default function TaskDetailsPage({ params }: TaskDetailsPageProps) {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  const [isEditing, setIsEditing] = useState(false);
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
  const followers = members?.documents.filter(member => 
    followedIds.includes(member.id)
  ) || [];

  // Find current user's member record to check delete permissions
  const currentMember = members?.documents.find(member => 
    (member as Member).userId === currentUser?.id
  ) as Member;
  
  const isCreator = currentUser && task?.creatorId ? currentUser.id === task.creatorId : false;
  const isWorkspaceAdmin = currentMember?.role === MemberRole.ADMIN;
  const canDelete = isCreator || isWorkspaceAdmin;
  
  // Visitors can edit tasks but cannot change status
  const canEdit = currentMember?.role !== undefined; // All members (including visitors) can edit
  const canEditStatus = currentMember?.role !== MemberRole.VISITOR; // Only non-visitors can edit status



  // Initialize edit form when entering edit mode
  const handleEditMode = () => {
    if (task) {
      setEditForm({
        name: task.name,
        description: task.description || "",
        status: task.status,
        assigneeId: task.assigneeId || "unassigned",
        serviceId: task.serviceId,
        dueDate: task.dueDate ? new Date(task.dueDate) : new Date(),
        attachmentId: task.attachmentId || "",
        isConfidential: task.isConfidential || false,
      });
      setSelectedFollowers(followedIds);
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
  };

  const handleSaveChanges = () => {
    if (!task) return;

    // Validate that assignee is required for confidential tasks
    if (editForm.isConfidential && (!editForm.assigneeId || editForm.assigneeId === "" || editForm.assigneeId === "unassigned")) {
      toast.error("Assignee is required for confidential tasks");
      return;
    }

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

    updateTask(
      {
        param: { taskId: task.id },
        json: updatePayload,
      },
      {
        onSuccess: () => {
          setIsEditing(false);
        },
      }
    );
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
          toast.success("Followers updated successfully");
        },
        onError: (error) => {
          console.error("Failed to update followers:", error);
          toast.error("Failed to update followers");
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
          {/* Breadcrumb & Actions Bar */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-x-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => router.back()}
                disabled={isEditing}
                className="hover:bg-gray-100 transition-colors"
              >
                <ArrowLeftIcon className="size-4 mr-2" />
                Back
              </Button>
              <div className="h-4 w-px bg-gray-300" />
              <div className="flex items-center gap-x-2 text-sm text-gray-600">
                <FolderIcon className="size-4" />
                <span>{service?.name || "No service"}</span>
              </div>
            </div>
            
            <div className="flex items-center gap-x-2">
              {isEditing ? (
                <>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={handleCancelEdit}
                    disabled={isUpdating}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <XIcon className="size-4 mr-2" />
                    Cancel
                  </Button>
                  <Button 
                    size="sm"
                    onClick={handleSaveChanges}
                    disabled={isUpdating}
                    className="bg-blue-600 hover:bg-blue-700 transition-colors"
                  >
                    {isUpdating ? (
                      <>
                        <LoadingSpinner size="sm" className="mr-2" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <SaveIcon className="size-4 mr-2" />
                        Save Changes
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <>
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
                      Edit Task
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
                </>
              )}
            </div>
          </div>

          {/* Task Title & Status */}
          <div className="space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {isEditing ? (
                  <Input
                    value={editForm.name}
                    onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                    className="text-3xl font-bold h-12 border-none bg-transparent p-0 focus-visible:ring-0 placeholder:text-gray-400"
                    placeholder="Enter task title..."
                  />
                ) : (
                  <div className="flex items-center gap-3">
                    <h1 className="text-3xl font-bold text-gray-900 break-words">{task.name}</h1>
                    {task.isConfidential && (
                      <div className="flex items-center gap-2 bg-orange-50 px-3 py-1.5 rounded-full border border-orange-200">
                        <EyeOffIcon className="size-4 text-orange-600" />
                        <span className="text-sm font-medium text-orange-700">Confidential</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-3 flex-shrink-0">
                {!isEditing && (
                  <StatusBadge status={task.status} size="lg" className="shadow-md" />
                )}
              </div>
            </div>

            {/* Task Meta Info */}
            {!isEditing && (
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <UserIcon className="size-4" />
                  <span>{assignee?.name || "Unassigned"}</span>
                </div>
                <div className="flex items-center gap-2">
                  <CalendarIcon className="size-4" />
                  <TaskDate value={task.dueDate} />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-5 gap-6">
          {/* Primary Content Area */}
          <div className="lg:col-span-2 xl:col-span-2 space-y-6">
            {/* Description Section */}
            <Card className="shadow-lg border-2 border-neutral-200/60 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <div className="w-1 h-6 bg-blue-500 rounded-full" />
                  Description
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isEditing ? (
                  <Textarea
                    value={editForm.description}
                    onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Describe what needs to be done..."
                    className="min-h-[200px] resize-none border-2 border-gray-300/80 focus:border-blue-500/80 focus:ring-2 focus:ring-blue-500/20 transition-all rounded-lg shadow-sm"
                  />
                ) : (
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
                )}
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

          {/* Chat Section - More Space */}
          <div className="lg:col-span-1 xl:col-span-2">
            <div className="sticky top-6">
              <TaskChat taskId={task.id} className="h-[705px] shadow-lg border-2 border-neutral-200/60 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300" />
            </div>
          </div>

          {/* Properties Sidebar - More Space */}
          <div className="lg:col-span-1 xl:col-span-1">
            <div className="sticky top-6">
              {/* Task Properties */}
              <Card className="h-[703px] shadow-lg border-2 border-neutral-200/60 bg-white/80 backdrop-blur-sm hover:shadow-xl transition-shadow duration-300 flex flex-col">
                <CardHeader className="pb-3 flex-shrink-0">
                  <CardTitle className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <div className="w-1 h-6 bg-purple-500 rounded-full" />
                    Task Properties
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 flex-1 overflow-y-auto">
                  {/* Status */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-indigo-500 rounded-full" />
                      Status
                      {isEditing && !canEditStatus && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                          Read-only
                        </span>
                      )}
                    </label>
                    {isEditing && canEditStatus ? (
                      <Select
                        value={editForm.status}
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value as TaskStatus }))}
                      >
                        <SelectTrigger className="w-full border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={TaskStatus.BACKLOG} className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                              📋 Backlog
                            </div>
                          </SelectItem>
                          <SelectItem value={TaskStatus.TODO} className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                              📝 To Do
                            </div>
                          </SelectItem>
                          <SelectItem value={TaskStatus.IN_PROGRESS} className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                              🚀 In Progress
                            </div>
                          </SelectItem>
                          <SelectItem value={TaskStatus.IN_REVIEW} className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                              👀 In Review
                            </div>
                          </SelectItem>
                          <SelectItem value={TaskStatus.DONE} className="flex items-center gap-2">
                            <div className="flex items-center gap-2">
                              <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                              ✅ Done
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg border border-gray-200/60 shadow-sm">
                        <StatusIndicator status={task.status} />
                      </div>
                    )}
                  </div>

                  {/* Assignee */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-green-500 rounded-full" />
                      Assignee
                      {isEditing && editForm.isConfidential && (
                        <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                          Required for confidential tasks
                        </span>
                      )}
                    </label>
                    {isEditing ? (
                      <Select
                        value={editForm.assigneeId}
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, assigneeId: value }))}
                      >
                        <SelectTrigger className="w-full border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
                          <SelectValue placeholder="Select assignee" />
                        </SelectTrigger>
                        <SelectContent>
                          {!editForm.isConfidential && (
                            <SelectItem value="unassigned">
                              👤 Unassigned
                            </SelectItem>
                          )}
                          {members?.documents
                            .filter(member => (member as Member).role !== MemberRole.VISITOR)
                            .map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              👤 {member.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-200/60 shadow-sm">
                        <UserIcon className="size-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {assignee?.name || "Unassigned"}
                        </span>
                      </div>
                    )}
                  </div>


                  {/* Service */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      Service
                    </label>
                    {isEditing ? (
                      <Select
                        value={editForm.serviceId}
                        onValueChange={(value) => setEditForm(prev => ({ ...prev, serviceId: value }))}
                      >
                        <SelectTrigger className="w-full border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
                          <SelectValue placeholder="Select service" />
                        </SelectTrigger>
                        <SelectContent>
                          {services?.documents.map((serv) => (
                            <SelectItem key={serv.id} value={serv.id}>
                              📁 {serv.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-200/60 shadow-sm">
                        <FolderIcon className="size-4 text-gray-500" />
                        <span className="text-sm font-medium">
                          {service?.name || "No service"}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Due Date */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-red-500 rounded-full" />
                      Due Date
                    </label>
                    {isEditing ? (
                      <DatePicker
                        value={editForm.dueDate}
                        onChange={(date) => setEditForm(prev => ({ ...prev, dueDate: date || new Date() }))}
                        className="w-full border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                      />
                    ) : (
                      <div className="flex items-center gap-3 p-3 bg-gray-50/80 rounded-lg border border-gray-200/60 shadow-sm">
                        <CalendarIcon className="size-4 text-gray-500" />
                        <TaskDate value={task.dueDate} />
                      </div>
                    )}
                  </div>

                  {/* Attachment */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-blue-500 rounded-full" />
                      Attachment
                    </label>
                    {isEditing ? (
                      <FileUpload
                        onFileUploaded={(fileId) => {
                          setEditForm(prev => ({ ...prev, attachmentId: fileId }));
                        }}
                        onFileRemoved={() => {
                          setEditForm(prev => ({ ...prev, attachmentId: "" }));
                        }}
                        currentFileId={editForm.attachmentId}
                        currentFileName={task.attachmentId ? "attachment.pdf" : undefined}
                        disabled={isUpdating}
                        showRemoveButton={true}
                      />
                    ) : (
                      <div className="p-3 bg-gray-50/80 rounded-lg border border-gray-200/60 shadow-sm">
                        {task.attachmentId ? (
                          <FileUpload
                            currentFileId={task.attachmentId}
                            currentFileName="attachment.pdf"
                            disabled={true}
                            showRemoveButton={false}
                          />
                        ) : (
                          <p className="text-sm text-gray-500 text-center">No attachment</p>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Confidential */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                      <div className="w-2 h-2 bg-orange-500 rounded-full" />
                      Confidential
                    </label>
                    {isEditing ? (
                      <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg border border-gray-200/60 shadow-sm">
                        <div className="flex items-center gap-2">
                          <EyeOffIcon className="w-4 h-4 text-gray-500" />
                          <span className="text-xs text-gray-700">
                            Only visible to creator, assignee, and followers
                          </span>
                        </div>
                        <Switch
                          checked={editForm.isConfidential}
                          onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isConfidential: checked }))}
                        />
                      </div>
                    ) : (
                      <div className="p-3 bg-gray-50/80 rounded-lg border border-gray-200/60 shadow-sm">
                        {task.isConfidential ? (
                          <div className="flex items-center gap-2 text-orange-600">
                            <EyeOffIcon className="size-4" />
                            <span className="text-sm font-medium">This task is confidential</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2 text-gray-500">
                            <EyeOffIcon className="size-4" />
                            <span className="text-sm">This task is public</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Followers */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                        <div className="w-2 h-2 bg-violet-500 rounded-full" />
                        Followers
                      </label>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsFollowersModalOpen(true)}
                        className="h-6 w-6 p-0 hover:bg-violet-100 text-violet-600 hover:text-violet-700"
                        title="Manage followers"
                      >
                        <PlusIcon className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="p-3 bg-gray-50/80 rounded-lg border border-gray-200/60 shadow-sm">
                      {followers.length > 0 ? (
                        <div className="space-y-2">
                          {followers.map((follower) => (
                            <div key={follower.id} className="flex items-center gap-2 text-sm">
                              <UsersIcon className="size-3 text-gray-500" />
                              <span className="font-medium">{follower.name}</span>
                            </div>
                          ))}
                          <div className="border-t pt-2 mt-2">
                            <p className="text-xs text-gray-500">
                              {followers.length} follower{followers.length !== 1 ? 's' : ''}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center text-gray-500">
                          <UsersIcon className="size-4 mr-2" />
                          <span className="text-sm">No followers</span>
                        </div>
                      )}
                    </div>
                  </div>

                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}