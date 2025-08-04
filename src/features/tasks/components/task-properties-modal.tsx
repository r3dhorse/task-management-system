"use client";

import React from "react";
import { toast } from "sonner";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { DottedSeparator } from "@/components/dotted-separator";
import { DatePicker } from "@/components/date-picker";
import { FileUpload } from "@/components/file-upload";
import { StatusIndicator } from "./status-badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { 
  XIcon, 
  SaveIcon, 
  EyeOffIcon,
  UsersIcon,
  PlusIcon,
  SettingsIcon
} from "lucide-react";
import { TaskStatus } from "../types";
import { Member, MemberRole } from "@/features/members/types";
import { Service } from "@/features/services/types";
import { Task } from "@/features/tasks/types";

interface EditForm {
  name: string;
  description: string;
  status: TaskStatus;
  assigneeId: string;
  serviceId: string;
  dueDate: Date;
  attachmentId: string;
  isConfidential: boolean;
}

interface TaskPropertiesModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task;
  editForm: EditForm;
  setEditForm: React.Dispatch<React.SetStateAction<EditForm>>;
  onSave: () => void;
  isLoading?: boolean;
  members?: { documents: Member[] };
  services?: { documents: Service[] };
  followers: Member[];
  canEditStatus: boolean;
  onManageFollowers: () => void;
}

export const TaskPropertiesModal = ({ 
  isOpen, 
  onClose, 
  task,
  editForm,
  setEditForm,
  onSave,
  isLoading = false,
  members,
  services,
  followers,
  canEditStatus,
  onManageFollowers
}: TaskPropertiesModalProps) => {
  
  const handleSave = () => {
    // Validate that assignee is required for confidential tasks
    if (editForm.isConfidential && (!editForm.assigneeId || editForm.assigneeId === "" || editForm.assigneeId === "unassigned")) {
      toast.error("Assignee is required for confidential tasks");
      return;
    }
    
    onSave();
    onClose();
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <ResponsiveModal 
      open={isOpen} 
      onOpenChange={(open) => !open && onClose()}
      disableOutsideClick={isLoading}
    >
      <Card className="w-full max-w-2xl border-none shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-blue-600" />
            Task Properties
          </CardTitle>
          <p className="text-sm text-gray-600">
            Update task information, confidentiality settings, and manage followers.
          </p>
        </CardHeader>

        <div className="px-6">
          <DottedSeparator />
        </div>

        <CardContent className="pt-6 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Task Name */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              Task Name
            </label>
            <Input
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter task name..."
              className="border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 bg-gray-500 rounded-full" />
              Description
            </label>
            <Textarea
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what needs to be done..."
              className="min-h-[120px] resize-none border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Status */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full" />
              Status
              {!canEditStatus && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  Read-only
                </span>
              )}
            </label>
            {canEditStatus ? (
              <Select
                value={editForm.status}
                onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value as TaskStatus }))}
              >
                <SelectTrigger className="w-full border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={TaskStatus.BACKLOG}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                      📋 Backlog
                    </div>
                  </SelectItem>
                  <SelectItem value={TaskStatus.TODO}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      📝 To Do
                    </div>
                  </SelectItem>
                  <SelectItem value={TaskStatus.IN_PROGRESS}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      🚀 In Progress
                    </div>
                  </SelectItem>
                  <SelectItem value={TaskStatus.IN_REVIEW}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      👀 In Review
                    </div>
                  </SelectItem>
                  <SelectItem value={TaskStatus.DONE}>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                      ✅ Done
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            ) : (
              <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg border border-gray-200/60">
                <StatusIndicator status={task.status} />
              </div>
            )}
          </div>

          {/* Assignee */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              Assignee
              {editForm.isConfidential && (
                <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded-full font-medium">
                  Required for confidential tasks
                </span>
              )}
            </label>
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
          </div>

          {/* Service */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              Service
            </label>
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
          </div>

          {/* Due Date */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full" />
              Due Date
            </label>
            <DatePicker
              value={editForm.dueDate}
              onChange={(date) => setEditForm(prev => ({ ...prev, dueDate: date || new Date() }))}
              className="w-full border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>

          {/* Attachment */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 bg-blue-500 rounded-full" />
              Attachment
            </label>
            <FileUpload
              onFileUploaded={(fileId) => {
                setEditForm(prev => ({ ...prev, attachmentId: fileId }));
              }}
              onFileRemoved={() => {
                setEditForm(prev => ({ ...prev, attachmentId: "" }));
              }}
              currentFileId={editForm.attachmentId}
              currentFileName={task.attachmentId ? "attachment.pdf" : undefined}
              disabled={isLoading}
              showRemoveButton={true}
            />
          </div>

          {/* Confidential */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <div className="w-2 h-2 bg-orange-500 rounded-full" />
              Confidential
            </label>
            <div className="flex items-center justify-between p-3 bg-gray-50/80 rounded-lg border border-gray-200/60">
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
                onClick={onManageFollowers}
                className="h-6 w-6 p-0 hover:bg-violet-100 text-violet-600 hover:text-violet-700"
                title="Manage followers"
              >
                <PlusIcon className="w-4 h-4" />
              </Button>
            </div>
            <div className="p-3 bg-gray-50/80 rounded-lg border border-gray-200/60">
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

          <DottedSeparator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="w-full sm:w-auto"
            >
              <XIcon className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="w-4 h-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </ResponsiveModal>
  );
};