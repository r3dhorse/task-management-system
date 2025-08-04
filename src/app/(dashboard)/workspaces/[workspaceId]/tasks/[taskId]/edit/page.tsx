"use client";

import { useState, useEffect } from "react";
import { useGetTask } from "@/features/tasks/api/use-get-task";
import { useGetMembers } from "@/features/members/api/use-get-members";
import { useGetServices } from "@/features/services/api/use-get-services";
import { useUpdateTask } from "@/features/tasks/api/use-update-task";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeftIcon, SaveIcon, XIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { TaskStatus } from "@/features/tasks/types";
import { FileUpload } from "@/components/file-upload";
import { TaskHistory } from "@/features/tasks/components/task-history";
import { DatePicker } from "@/components/date-picker";
import { DottedSeparator } from "@/components/dotted-separator";

interface TaskEditPageProps {
  params: {
    workspaceId: string;
    taskId: string;
  };
}

export default function TaskEditPage({ params }: TaskEditPageProps) {
  const router = useRouter();
  const workspaceId = useWorkspaceId();
  
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

  const isLoading = isLoadingTask || isLoadingMembers || isLoadingServices;

  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    status: "" as TaskStatus,
    assigneeId: "",
    serviceId: "",
    dueDate: new Date(),
    attachmentId: "",
  });

  // Initialize form when task loads
  useEffect(() => {
    if (task) {
      setEditForm({
        name: task.name,
        description: task.description || "",
        status: task.status as TaskStatus,
        assigneeId: task.assigneeId || "",
        serviceId: task.serviceId || "",
        dueDate: task.dueDate ? new Date(task.dueDate) : new Date(),
        attachmentId: task.attachmentId || "",
      });
    }
  }, [task]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex flex-col items-center justify-center h-full">
        <h1 className="text-2xl font-semibold text-gray-900">Task not found</h1>
        <p className="text-gray-600 mt-2">The task you&apos;re looking for doesn&apos;t exist.</p>
        <Button 
          variant="outline" 
          onClick={() => router.back()}
          className="mt-4"
        >
          <ArrowLeftIcon className="size-4 mr-2" />
          Go Back
        </Button>
      </div>
    );
  }

  const handleSaveChanges = () => {
    updateTask(
      {
        param: { taskId: task.id },
        json: {
          name: editForm.name,
          description: editForm.description,
          status: editForm.status,
          assigneeId: editForm.assigneeId,
          serviceId: editForm.serviceId,
          dueDate: editForm.dueDate.toISOString(),
          attachmentId: editForm.attachmentId || undefined,
        },
      },
      {
        onSuccess: () => {
          router.push(`/workspaces/${workspaceId}/tasks/${task.id}`);
        },
      }
    );
  };

  const handleCancel = () => {
    router.push(`/workspaces/${workspaceId}/tasks/${task.id}`);
  };

  return (
    <div className="flex flex-col gap-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => router.back()}
            disabled={isUpdating}
          >
            <ArrowLeftIcon className="size-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-semibold">Update Task</h1>
        </div>
        
        <div className="flex items-center gap-x-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleCancel}
            disabled={isUpdating}
          >
            <XIcon className="size-4 mr-2" />
            Cancel
          </Button>
          <Button 
            size="sm"
            onClick={handleSaveChanges}
            disabled={isUpdating}
          >
            <SaveIcon className="size-4 mr-2" />
            {isUpdating ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      <DottedSeparator />

      {/* Edit Form Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-4">
          {/* Task Name */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Task Name</CardTitle>
            </CardHeader>
            <CardContent>
              <Input
                value={editForm.name}
                onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter task name..."
                disabled={isUpdating}
              />
            </CardContent>
          </Card>

          {/* Description */}
          <Card className="h-fit">
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="h-[140px]">
                <Textarea
                  value={editForm.description}
                  onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Enter task description..."
                  className="h-full resize-none overflow-y-auto"
                  disabled={isUpdating}
                />
              </div>
            </CardContent>
          </Card>

          {/* Activity History */}
          <Card className="flex-1">
            <CardHeader>
              <CardTitle>Activity History</CardTitle>
            </CardHeader>
            <CardContent>
              <TaskHistory taskId={task.id} />
            </CardContent>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Status</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value as TaskStatus }))}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TaskStatus.BACKLOG}>Backlog</SelectItem>
                  <SelectItem value={TaskStatus.TODO}>Todo</SelectItem>
                  <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
                  <SelectItem value={TaskStatus.IN_REVIEW}>In Review</SelectItem>
                  <SelectItem value={TaskStatus.DONE}>Done</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Assignee */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Assignee</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={editForm.assigneeId}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, assigneeId: value }))}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select assignee" />
                </SelectTrigger>
                <SelectContent>
                  {members?.documents.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Service */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Service</CardTitle>
            </CardHeader>
            <CardContent>
              <Select
                value={editForm.serviceId}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, serviceId: value }))}
                disabled={isUpdating}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select service" />
                </SelectTrigger>
                <SelectContent>
                  {services?.documents.map((serv) => (
                    <SelectItem key={serv.id} value={serv.id}>
                      {serv.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Due Date */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Due Date</CardTitle>
            </CardHeader>
            <CardContent>
              <DatePicker
                value={editForm.dueDate}
                onChange={(date) => setEditForm(prev => ({ ...prev, dueDate: date || new Date() }))}
                className="w-full"
                disabled={isUpdating}
              />
            </CardContent>
          </Card>

          {/* Attachment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Attachment</CardTitle>
            </CardHeader>
            <CardContent>
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
              />
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}