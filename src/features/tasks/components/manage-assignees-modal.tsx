"use client";

import { useState } from "react";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select-simple";
import { DottedSeparator } from "@/components/dotted-separator";
import { UserIcon, XIcon, CheckIcon } from "@/lib/lucide-icons";
import { Member, MemberRole } from "@/features/members/types";

interface ManageAssigneesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (assignees: string[]) => void;
  currentAssignees: string[];
  availableMembers: Member[];
  isConfidential?: boolean;
  isLoading?: boolean;
}

export const ManageAssigneesModal = ({
  isOpen,
  onClose,
  onSave,
  currentAssignees,
  availableMembers,
  isConfidential = false,
  isLoading = false
}: ManageAssigneesModalProps) => {
  const [selectedAssignees, setSelectedAssignees] = useState<string[]>(currentAssignees);

  // Reset when modal opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSelectedAssignees(currentAssignees);
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    onSave(selectedAssignees);
    onClose();
  };

  const handleCancel = () => {
    setSelectedAssignees(currentAssignees);
    onClose();
  };

  // Get member options - only team members (non-customers) can be assignees
  const memberOptions = availableMembers
    .filter(member => member.role !== MemberRole.CUSTOMER)
    .map(member => ({
      value: member.id || member.$id || '',
      label: `${member.name}`,
      email: member.email,
      role: member.role
    }));

  // Get selected assignee details
  const selectedAssigneeDetails = availableMembers.filter(member =>
    selectedAssignees.includes(member.id || member.$id || '')
  );

  const hasChanges = JSON.stringify(selectedAssignees.sort()) !== JSON.stringify(currentAssignees.sort());
  const isValid = !isConfidential || selectedAssignees.length > 0;

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      disableOutsideClick={true}
      title="Manage Assignees"
      hideTitle={true}
    >
      <Card className="w-full h-full border-none shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-indigo-600" />
            Manage Assignees
          </CardTitle>
          <p className="text-sm text-gray-600">
            Select team members who will be responsible for completing this task.
          </p>
        </CardHeader>

        <div className="px-6">
          <DottedSeparator />
        </div>

        <CardContent className="pt-6 space-y-6">
          {/* Multi-Select for Adding/Removing */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Select Team Members</h3>
            {memberOptions.length > 0 ? (
              <MultiSelect
                options={memberOptions}
                selected={selectedAssignees}
                onChange={setSelectedAssignees}
                placeholder="Search and select team members..."
                className="w-full"
              />
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-lg">
                <UserIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">No Team Members Available</p>
                <p className="text-xs text-gray-400 mt-1">
                  No team members found in this workspace
                </p>
              </div>
            )}
          </div>

          {/* Selected Assignees Preview */}
          {selectedAssigneeDetails.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Selected Assignees ({selectedAssigneeDetails.length})</h3>
              <div className="max-h-24 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {selectedAssigneeDetails.map((assignee) => (
                    <div key={assignee.id || assignee.$id} className="flex items-center gap-2 bg-indigo-50 px-3 py-1.5 rounded-full border border-indigo-200">
                      <div className="w-4 h-4 rounded-full bg-indigo-600 flex items-center justify-center text-xs font-medium text-white">
                        {assignee.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-indigo-900 truncate max-w-[100px]">{assignee.name}</span>
                      <CheckIcon className="w-3 h-3 text-indigo-600" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Confidential Warning */}
          {isConfidential && selectedAssignees.length === 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <div className="flex items-start gap-3">
                <UserIcon className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-orange-800">
                  <p className="font-medium mb-1">Assignee Required</p>
                  <p className="text-xs">
                    At least one assignee is required for confidential tasks.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <UserIcon className="w-5 h-5 text-indigo-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-indigo-800">
                <p className="font-medium mb-1">About Task Assignees</p>
                <ul className="space-y-1 text-xs">
                  <li>• Assignees are the primary owners responsible for the task</li>
                  <li>• They have full access to monitor and update the task</li>
                  <li>• Assignees receive notifications about task changes</li>
                </ul>
              </div>
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
              disabled={isLoading || !hasChanges || !isValid}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700"
            >
              {isLoading ? (
                <>
                  <div className="w-4 h-4 mr-2 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  Saving...
                </>
              ) : (
                <>
                  <CheckIcon className="w-4 h-4 mr-2" />
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
