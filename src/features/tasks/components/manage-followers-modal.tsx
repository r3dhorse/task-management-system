"use client";

import { useState } from "react";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MultiSelect } from "@/components/ui/multi-select-simple";
import { DottedSeparator } from "@/components/dotted-separator";
import { UsersIcon, XIcon, CheckIcon } from "lucide-react";
import { Member } from "@/features/members/types";

interface ManageFollowersModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (followers: string[]) => void;
  currentFollowers: string[];
  availableMembers: Member[];
  isLoading?: boolean;
}

export const ManageFollowersModal = ({ 
  isOpen, 
  onClose, 
  onSave, 
  currentFollowers, 
  availableMembers,
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

  // Get member options - include all workspace members
  const memberOptions = availableMembers
    .map(member => ({
      value: member.$id,
      label: `${member.name}`,
      role: member.role
    }));

  // Get current follower details
  const currentFollowerDetails = availableMembers.filter(member => 
    currentFollowers.includes(member.$id)
  );

  // Get selected follower details
  const selectedFollowerDetails = availableMembers.filter(member => 
    selectedFollowers.includes(member.$id)
  );

  const hasChanges = JSON.stringify(selectedFollowers.sort()) !== JSON.stringify(currentFollowers.sort());

  return (
    <ResponsiveModal 
      open={isOpen} 
      onOpenChange={handleOpenChange}
      disableOutsideClick={true}
    >
      <Card className="w-full h-full border-none shadow-none">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-semibold flex items-center gap-2">
            <UsersIcon className="w-5 h-5 text-blue-600" />
            Manage Followers
          </CardTitle>
          <p className="text-sm text-gray-600">
            Select members who should follow this task. Followers will receive notifications about task updates.
          </p>
        </CardHeader>

        <div className="px-6">
          <DottedSeparator />
        </div>

        <CardContent className="pt-6 space-y-6">
          {/* Current Followers */}
          {currentFollowerDetails.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-medium text-gray-700">Current Followers ({currentFollowerDetails.length})</h3>
              <div className="max-h-20 overflow-y-auto">
                <div className="flex flex-wrap gap-2">
                  {currentFollowerDetails.map((follower) => (
                    <div key={follower.$id} className="flex items-center gap-2 bg-blue-50 px-3 py-1.5 rounded-full border border-blue-200">
                      <div className="w-5 h-5 rounded-full bg-blue-600 flex items-center justify-center text-xs font-medium text-white">
                        {follower.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-blue-900 truncate max-w-[120px]">{follower.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Multi-Select for Adding/Removing */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700">Select Followers</h3>
            {memberOptions.length > 0 ? (
              <MultiSelect
                options={memberOptions}
                selected={selectedFollowers}
                onChange={setSelectedFollowers}
                placeholder="Search and select members..."
                className="w-full"
              />
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-gray-200 rounded-lg">
                <UsersIcon className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-sm text-gray-500 font-medium">No Members Available</p>
                <p className="text-xs text-gray-400 mt-1">
                  No workspace members found
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
                    <div key={follower.$id} className="flex items-center gap-2 bg-green-50 px-3 py-1.5 rounded-full border border-green-200">
                      <div className="w-4 h-4 rounded-full bg-green-600 flex items-center justify-center text-xs font-medium text-white">
                        {follower.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="text-sm font-medium text-green-900 truncate max-w-[100px]">{follower.name}</span>
                      <CheckIcon className="w-3 h-3 text-green-600" />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Help Text */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <UsersIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">About Task Followers</p>
                <ul className="space-y-1 text-xs">
                  <li>• Followers receive notifications about task updates</li>
                  <li>• Visitors can only see tasks they are following</li>
                  <li>• All workspace members can be added as followers</li>
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
              className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700"
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