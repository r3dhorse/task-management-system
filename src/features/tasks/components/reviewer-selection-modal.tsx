"use client";

import React from "react";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Member, MemberRole } from "@/features/members/types";
import { EyeIcon, UserCheckIcon } from "@/lib/lucide-icons";

interface ReviewerSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (reviewerId: string) => void;
  members: Member[];
  taskName: string;
  isLoading?: boolean;
}

export const ReviewerSelectionModal = ({
  isOpen,
  onClose,
  onConfirm,
  members,
  taskName,
  isLoading = false
}: ReviewerSelectionModalProps) => {
  const [selectedReviewerId, setSelectedReviewerId] = React.useState<string>("");

  const handleConfirm = () => {
    if (selectedReviewerId) {
      onConfirm(selectedReviewerId);
    }
  };

  const eligibleReviewers = members.filter(member => member.role !== MemberRole.VISITOR);

  // Reset selection when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setSelectedReviewerId("");
    }
  }, [isOpen]);

  return (
    <ResponsiveModal
      open={isOpen}
      onOpenChange={onClose}
    >
      <Card className="w-full max-w-md border-none shadow-none">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg font-semibold flex items-center gap-2">
            <EyeIcon className="w-5 h-5 text-purple-600" />
            Select Reviewer
          </CardTitle>
          <p className="text-sm text-gray-600">
            This task is being moved to &quot;In Review&quot; status. Please select a reviewer to continue.
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Task Name */}
          <div className="p-3 bg-gray-50 rounded-lg border">
            <p className="text-sm font-medium text-gray-700 mb-1">Task:</p>
            <p className="text-sm text-gray-900 line-clamp-2">{taskName}</p>
          </div>

          {/* Reviewer Selection */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <UserCheckIcon className="w-4 h-4 text-purple-600" />
              Select Reviewer
            </label>
            <Select
              value={selectedReviewerId}
              onValueChange={setSelectedReviewerId}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="Choose a reviewer..." />
              </SelectTrigger>
              <SelectContent>
                {eligibleReviewers.map((member) => (
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
              disabled={!selectedReviewerId || isLoading}
              className="flex-1 bg-purple-600 hover:bg-purple-700"
            >
              {isLoading ? "Setting..." : "Set Reviewer"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </ResponsiveModal>
  );
};