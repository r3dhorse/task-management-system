"use client";

import { useState } from "react";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select-simple";
import { DottedSeparator } from "@/components/dotted-separator";
import { UsersIcon, XIcon, CheckIcon } from "@/lib/lucide-icons";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Member, MemberRole } from "@/features/members/types";

interface ManageFollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (followers: string[]) => void;
  currentFollowers: string[];
  availableMembers: Member[];
  currentAssignees?: string[]; // Assignees to exclude from options
  isLoading?: boolean;
}

export const ManageFollowersModal = ({
  isOpen,
  onClose,
  onSave,
  currentFollowers,
  availableMembers,
  currentAssignees = [],
  isLoading = false
}: ManageFollowersModalProps) => {
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>(currentFollowers);

  // Reset when modal opens
  const handleOpenChange = (open: boolean) => {
    if (open) {
      setSelectedFollowers(currentFollowers);
    } else {
      onClose();
    }
  };

  const handleSave = () => {
    onSave(selectedFollowers);
    onClose();
  };

  const handleCancel = () => {
    setSelectedFollowers(currentFollowers);
    onClose();
  };

  // Get member options - only customers can be followers, excluding assignees
  const memberOptions = availableMembers
    .filter(member => member.role === MemberRole.CUSTOMER)
    .filter(member => !currentAssignees.includes(member.id || member.$id || '')) // Exclude assignees (safety check)
    .map(member => ({
      value: member.id || member.$id || '',
      label: `${member.name}`,
      email: member.email,
      role: member.role
    }));

  // Get selected follower details
  const selectedFollowerDetails = availableMembers.filter(member => 
    selectedFollowers.includes(member.id || member.$id || '')
  );

  const hasChanges = JSON.stringify(selectedFollowers.sort()) !== JSON.stringify(currentFollowers.sort());

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={handleOpenChange}
      disableOutsideClick={true}
      title="Manage Followers"
      hideTitle={true}
    >
      <Card className="w-full h-full border-none shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-teal-600" />
            Manage Followers (Customers)
          </CardTitle>
          <p className="text-sm text-gray-600">
            Select customers who should follow this task. Followers will receive notifications about task updates.
          </p>
        </CardHeader>

        <div className="px-6">
          <DottedSeparator />
        </div>

        <CardContent className="pt-6 space-y-6">
          {/* Multi-Select for Adding/Removing */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Select Customers</h3>
            {memberOptions.length > 0 ? (
              <MultiSelect
                options={memberOptions}
                selected={selectedFollowers}
                onChange={setSelectedFollowers}
                placeholder="Search and select customers..."
                className="w-full"
              />
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-lg">
                <UsersIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">No Customers Available</p>
                <p className="text-xs text-gray-400 mt-1">
                  No customers found in this workspace
                </p>
              </div>
            )}
          </div>

          {/* Selected Followers Preview */}
          {selectedFollowerDetails.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Selected Followers ({selectedFollowerDetails.length})</h3>
              <div className="max-h-24 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                <div className="flex flex-wrap gap-2">
                  {selectedFollowerDetails.map((follower) => (
                    <div key={follower.id || follower.$id} className="flex items-center gap-2 bg-teal-50 px-3 py-1.5 rounded-full border border-teal-200">
                      <div className="w-4 h-4 rounded-full bg-teal-600 flex items-center justify-center text-xs font-medium text-white">
                        {follower.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-teal-900 truncate max-w-[100px]">{follower.name}</span>
                      <CheckIcon className="w-3 h-3 text-teal-600" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <UsersIcon className="w-5 h-5 text-teal-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-teal-800">
                <p className="font-medium mb-1">About Task Followers</p>
                <ul className="space-y-1 text-xs">
                  <li>• Followers are customers who receive notifications about task updates</li>
                  <li>• Customers can only see tasks they are following</li>
                  <li>• For team members, use the Collaborators feature instead</li>
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
              className="w-full sm:w-auto bg-teal-600 hover:bg-teal-700"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="xs" variant="inline" color="white" />
                  <span className="ml-2">Saving...</span>
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