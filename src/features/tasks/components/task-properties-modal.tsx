"use client";

import React from "react";
import { toast } from "sonner";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
} from "@/lib/lucide-icons";
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
      onOpenChange={() => {}} // Disable auto-close, only close via buttons
      disableOutsideClick={true} // Always disable outside click
      hideCloseButton={true} // Hide the X button in upper right
    >
      <Card className="w-full max-w-5xl border-none shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <SettingsIcon className="w-4 h-4 text-blue-600" />
            Task Properties
          </CardTitle>
          <p className="text-xs text-gray-600">
            Update task information, confidentiality settings, and manage followers.
          </p>
        </CardHeader>

        <div className="px-6">
          <DottedSeparator />
        </div>

        <CardContent className="pt-4 space-y-4">
          {/* Task Name - Full Width */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
              Task Name
            </label>
            <Textarea
              value={editForm.name}
              onChange={(e) => setEditForm(prev => ({ ...prev, name: e.target.value }))}
              placeholder="Enter task name..."
              className="min-h-[56px] max-h-[56px] text-sm resize-none border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              rows={2}
            />
          </div>

          {/* Description - Full Width */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-gray-500 rounded-full" />
              Description
            </label>
            <Textarea
              value={editForm.description}
              onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Describe what needs to be done..."
              className="min-h-[120px] max-h-[120px] text-sm resize-none border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
              rows={5}
            />
          </div>

          {/* Two Column Grid for Main Fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Column */}
            <div className="space-y-3">
              {/* Status */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full" />
                  Status
                  {!canEditStatus && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                      Read-only
                    </span>
                  )}
                </label>
                {canEditStatus ? (
                  <Select
                    value={editForm.status}
                    onValueChange={(value) => setEditForm(prev => ({ ...prev, status: value as TaskStatus }))}
                  >
                    <SelectTrigger className="h-9 text-sm border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={TaskStatus.BACKLOG}>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-gray-400"></div>
                          📋 Backlog
                        </div>
                      </SelectItem>
                      <SelectItem value={TaskStatus.TODO}>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-blue-500"></div>
                          📝 To Do
                        </div>
                      </SelectItem>
                      <SelectItem value={TaskStatus.IN_PROGRESS}>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-amber-500"></div>
                          🚀 In Progress
                        </div>
                      </SelectItem>
                      <SelectItem value={TaskStatus.IN_REVIEW}>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-purple-500"></div>
                          👀 In Review
                        </div>
                      </SelectItem>
                      <SelectItem value={TaskStatus.DONE}>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                          ✅ Done
                        </div>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                ) : (
                  <div className="flex items-center p-2 bg-gray-50/80 rounded-lg border border-gray-200/60">
                    <StatusIndicator status={task.status} />
                  </div>
                )}
              </div>

              {/* Service */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                  Service
                </label>
                <Select
                  value={editForm.serviceId}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, serviceId: value }))}
                >
                  <SelectTrigger className="h-9 text-sm border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
                    <SelectValue placeholder="Select service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services?.documents.map((serv) => (
                      <SelectItem key={serv.id} value={serv.id}>
                        <span className="text-sm">📁 {serv.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Due Date */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-red-500 rounded-full" />
                  Due Date
                </label>
                <DatePicker
                  value={editForm.dueDate}
                  onChange={(date) => setEditForm(prev => ({ ...prev, dueDate: date || new Date() }))}
                  className="h-9 text-sm border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* Right Column */}
            <div className="space-y-3">
              {/* Assignee */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Assignee
                  {editForm.isConfidential && (
                    <span className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded-full">
                      Required
                    </span>
                  )}
                </label>
                <Select
                  value={editForm.assigneeId}
                  onValueChange={(value) => setEditForm(prev => ({ ...prev, assigneeId: value }))}
                >
                  <SelectTrigger className="h-9 text-sm border-gray-200 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors">
                    <SelectValue placeholder="Select assignee" />
                  </SelectTrigger>
                  <SelectContent>
                    {!editForm.isConfidential && (
                      <SelectItem value="unassigned">
                        <span className="text-sm">👤 Unassigned</span>
                      </SelectItem>
                    )}
                    {members?.documents
                      .filter(member => (member as Member).role !== MemberRole.VISITOR)
                      .map((member) => (
                      <SelectItem key={member.id} value={member.id}>
                        <span className="text-sm">👤 {member.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Confidential */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-orange-500 rounded-full" />
                  Confidential
                </label>
                <div className="flex items-center justify-between p-2 bg-gray-50/80 rounded-lg border border-gray-200/60">
                  <div className="flex items-center gap-1.5">
                    <EyeOffIcon className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-xs text-gray-700">
                      Restricted visibility
                    </span>
                  </div>
                  <Switch
                    checked={editForm.isConfidential}
                    onCheckedChange={(checked) => setEditForm(prev => ({ ...prev, isConfidential: checked }))}
                    className="scale-90"
                  />
                </div>
              </div>

              {/* Followers */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 bg-violet-500 rounded-full" />
                    Followers ({followers.length})
                  </label>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onManageFollowers}
                    className="h-5 w-5 p-0 hover:bg-violet-100 text-violet-600 hover:text-violet-700"
                    title="Manage followers"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                  </Button>
                </div>
                <div className="p-2 bg-gray-50/80 rounded-lg border border-gray-200/60 max-h-[72px] overflow-y-auto">
                  {followers.length > 0 ? (
                    <div className="space-y-1">
                      {followers.slice(0, 3).map((follower) => (
                        <div key={follower.id} className="flex items-center gap-1.5 text-xs">
                          <UsersIcon className="size-3 text-gray-500" />
                          <span className="truncate">{follower.name}</span>
                        </div>
                      ))}
                      {followers.length > 3 && (
                        <p className="text-xs text-gray-500 pl-4">
                          +{followers.length - 3} more
                        </p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center text-gray-500 py-1">
                      <UsersIcon className="size-3 mr-1.5" />
                      <span className="text-xs">No followers</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Attachment - Full Width */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-gray-700 flex items-center gap-1.5">
              <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
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
              workspaceId={task.workspaceId}
              taskId={task.id}
            />
          </div>

          <DottedSeparator />

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row justify-between gap-2 pt-1">
            <Button
              type="button"
              variant="outline"
              onClick={handleCancel}
              disabled={isLoading}
              className="w-full sm:w-auto h-9 text-sm"
            >
              <XIcon className="w-3.5 h-3.5 mr-1.5" />
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading}
              className="w-full sm:w-auto h-9 text-sm bg-blue-600 hover:bg-blue-700 sm:ml-auto"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-1.5" />
                  Saving...
                </>
              ) : (
                <>
                  <SaveIcon className="w-3.5 h-3.5 mr-1.5" />
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