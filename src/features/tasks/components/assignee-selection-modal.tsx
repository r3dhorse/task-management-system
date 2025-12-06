"use client";

import React from "react";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Member, MemberRole } from "@/features/members/types";
import { UserIcon, UserPlusIcon } from "@/lib/lucide-icons";
import { useCurrent } from "@/features/auth/api/use-current";

interface AssigneeSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (assigneeId: string) => void;
  members: Member[];
  taskName: string;
  isLoading?: boolean;
}

export const AssigneeSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  members,
  taskName,
  isLoading = false
}: AssigneeSelectionModalProps) => {
  const [selectedAssigneeId, setSelectedAssigneeId] = React.useState<string>("");
  const { data: currentUser } = useCurrent();

  const handleConfirm = () => {
    if (selectedAssigneeId) {
      onConfirm(selectedAssigneeId);
    }
  };

  const eligibleAssignees = members.filter(member => member.role !== MemberRole.CUSTOMER);

  // Set current user as default when modal opens
  React.useEffect(() => {
    if (isOpen) {
      const currentMember = eligibleAssignees.find(member => member.userId === currentUser?.id);
      setSelectedAssigneeId(currentMember?.id || "");
    }
  }, [isOpen, eligibleAssignees, currentUser?.id]);

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={onClose}
      title="Select Assignee"
      hideTitle={true}
    >
      <Card className="w-full max-w-md border-none shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-amber-600" />
            Assign Task
          </CardTitle>
          <p className="text-sm text-gray-600">
            This task is being moved to &quot;In Progress&quot; status. Please assign it to a team member to continue.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Task Name */}
          <div className="p-3 bg-gray-50 rounded-lg border">
            <p className="text-sm font-medium text-gray-700 mb-1">Task:</p>
            <p className="text-sm text-gray-900 line-clamp-2">{taskName}</p>
          </div>

          {/* Assignee Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <UserPlusIcon className="w-4 h-4 text-amber-600" />
              Select Assignee
            </label>
            <Select
              value={selectedAssigneeId}
              onValueChange={setSelectedAssigneeId}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Choose an assignee..." />
              </SelectTrigger>
              <SelectContent>
                {eligibleAssignees.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm">👤 {member.name}</span>
                      {member.role === MemberRole.ADMIN && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                          Admin
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-2 pt-2">
            <Button
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              disabled={!selectedAssigneeId || isLoading}
              className="flex-1 bg-amber-600 hover:bg-amber-700"
            >
              {isLoading ? "Assigning..." : "Assign Task"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </ResponsiveModal>
  );
};