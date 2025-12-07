"use client";

import { useState } from "react";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select-simple";
import { DottedSeparator } from "@/components/dotted-separator";
import { UsersIcon, XIcon, CheckIcon } from "@/lib/lucide-icons";
import { Member, MemberRole } from "@/features/members/types";

interface ManageCollaboratorsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (collaborators: string[]) => void;
  currentCollaborators: string[];
  availableMembers: Member[];
  currentAssignees?: string[]; // Assignees to exclude from options
  isLoading?: boolean;
}

export const ManageCollaboratorsModal = ({
  isOpen,
  onClose,
  onSave,
  currentCollaborators,
  availableMembers,
  currentAssignees = [],
  isLoading = false
}: ManageCollaboratorsModalProps) => {
  const [selectedCollaborators, setSelectedCollaborators] = useState<string[]>(currentCollaborators);

  // Reset when modal opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSelectedCollaborators(currentCollaborators);
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    onSave(selectedCollaborators);
    onClose();
  };

  const handleCancel = () => {
    setSelectedCollaborators(currentCollaborators);
    onClose();
  };

  // Get member options - only team members (non-customers), excluding assignees
  const memberOptions = availableMembers
    .filter(member => member.role !== MemberRole.CUSTOMER)
    .filter(member => !currentAssignees.includes(member.id || member.$id || '')) // Exclude assignees
    .map(member => ({
      value: member.id || member.$id || '',
      label: `${member.name}`,
      email: member.email,
      role: member.role
    }));

  // Get selected collaborator details
  const selectedCollaboratorDetails = availableMembers.filter(member =>
    selectedCollaborators.includes(member.id || member.$id || '')
  );

  const hasChanges = JSON.stringify(selectedCollaborators.sort()) !== JSON.stringify(currentCollaborators.sort());

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      disableOutsideClick={true}
      title="Manage Collaborators"
      hideTitle={true}
    >
      <Card className="w-full h-full border-none shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-cyan-600" />
            Manage Collaborators
          </CardTitle>
          <p className="text-sm text-gray-600">
            Select team members who should collaborate on this task. Collaborators will receive notifications about task updates.
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
                selected={selectedCollaborators}
                onChange={setSelectedCollaborators}
                placeholder="Search and select team members..."
                className="w-full"
              />
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-lg">
                <UsersIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">No Team Members Available</p>
                <p className="text-xs text-gray-400 mt-1">
                  No workspace team members found
                </p>
              </div>
            )}
          </div>

          {/* Selected Collaborators Preview */}
          {selectedCollaboratorDetails.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Selected Collaborators ({selectedCollaboratorDetails.length})</h3>
              <div className="max-h-24 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {selectedCollaboratorDetails.map((collaborator) => (
                    <div key={collaborator.id || collaborator.$id} className="flex items-center gap-2 bg-cyan-50 px-3 py-1.5 rounded-full border border-cyan-200">
                      <div className="w-4 h-4 rounded-full bg-cyan-600 flex items-center justify-center text-xs font-medium text-white">
                        {collaborator.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-cyan-900 truncate max-w-[100px]">{collaborator.name}</span>
                      <CheckIcon className="w-3 h-3 text-cyan-600" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-cyan-50 border border-cyan-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <UsersIcon className="w-5 h-5 text-cyan-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-cyan-800">
                <p className="font-medium mb-1">About Task Collaborators</p>
                <ul className="space-y-1 text-xs">
                  <li>• Collaborators are team members working on this task</li>
                  <li>• They receive notifications about task updates</li>
                  <li>• Assignees are excluded (they already monitor the task)</li>
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
              disabled={isLoading || !hasChanges}
              className="w-full sm:w-auto bg-cyan-600 hover:bg-cyan-700"
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
