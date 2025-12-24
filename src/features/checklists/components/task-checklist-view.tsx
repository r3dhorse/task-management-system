"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Loader2, ClipboardList, CheckCircle2, XCircle, Clock, FileDown, MessageSquare } from "@/lib/lucide-icons";
import type { TaskChecklist, TaskChecklistItem } from "@/features/tasks/types";
import { ChecklistRemarksModal } from "./checklist-remarks-modal";
import { generateChecklistPDF } from "@/lib/checklist-pdf";
import { toast } from "sonner";

type ChecklistItemStatus = 'pending' | 'passed' | 'failed';

interface TaskChecklistViewProps {
  taskNumber?: string;
  taskName?: string;
  serviceName?: string;
  checklist: TaskChecklist | null;
  canEdit: boolean;
  onUpdate?: (items: TaskChecklistItem[]) => Promise<void>;
}

export const TaskChecklistView = ({
  taskNumber = "",
  taskName = "",
  serviceName = "",
  checklist,
  canEdit,
  onUpdate,
}: TaskChecklistViewProps) => {
  const [items, setItems] = useState<TaskChecklistItem[]>([]);
  const [isPending, setIsPending] = useState(false);
  const [remarksModalOpen, setRemarksModalOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TaskChecklistItem | null>(null);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);
  const [isFailAction, setIsFailAction] = useState(false);
  const [isPassAction, setIsPassAction] = useState(false);

  useEffect(() => {
    if (checklist?.items) {
      // Handle legacy data that might have 'completed' instead of 'status'
      const normalizedItems = checklist.items.map(item => ({
        ...item,
        status: item.status || ('completed' in item && (item as unknown as { completed: boolean }).completed ? 'passed' : 'pending') as ChecklistItemStatus
      }));
      setItems(normalizedItems);
    }
  }, [checklist]);

  const handleSetStatus = async (itemId: string, status: ChecklistItemStatus) => {
    if (!canEdit || isPending) return;

    const updatedItems = items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            status,
            completedAt: status !== 'pending' ? new Date().toISOString() : undefined,
          }
        : item
    );

    setItems(updatedItems);

    if (onUpdate) {
      setIsPending(true);
      try {
        await onUpdate(updatedItems);
      } catch (error) {
        // Revert on error
        setItems(items);
        console.error("Failed to update checklist:", error);
      } finally {
        setIsPending(false);
      }
    }
  };

  const handlePassClick = (item: TaskChecklistItem) => {
    if (!canEdit || isPending) return;

    // If already passed, toggle back to pending
    if (item.status === 'passed') {
      handleSetStatus(item.id, 'pending');
      return;
    }

    // Open remarks modal with pass action flag
    setSelectedItem(item);
    setIsPassAction(true);
    setRemarksModalOpen(true);
  };

  const handleFailClick = (item: TaskChecklistItem) => {
    if (!canEdit || isPending) return;

    // If already failed, toggle back to pending
    if (item.status === 'failed') {
      handleSetStatus(item.id, 'pending');
      return;
    }

    // Open remarks modal with fail action flag
    setSelectedItem(item);
    setIsFailAction(true);
    setRemarksModalOpen(true);
  };

  const handleSaveRemarks = async (remarks: string | undefined, photoUrl: string | undefined) => {
    if (!selectedItem || !onUpdate) return;

    const updatedItems = items.map((item) =>
      item.id === selectedItem.id
        ? {
            ...item,
            remarks,
            photoUrl,
            // Set status based on action type
            ...(isPassAction && {
              status: 'passed' as ChecklistItemStatus,
              completedAt: new Date().toISOString(),
            }),
            ...(isFailAction && {
              status: 'failed' as ChecklistItemStatus,
              completedAt: new Date().toISOString(),
            }),
          }
        : item
    );

    setItems(updatedItems);
    await onUpdate(updatedItems);
    setIsPassAction(false);
    setIsFailAction(false);
  };

  const handleModalClose = (open: boolean) => {
    setRemarksModalOpen(open);
    if (!open) {
      setIsPassAction(false);
      setIsFailAction(false);
    }
  };

  const handleGenerateReport = async () => {
    setIsGeneratingPDF(true);
    try {
      await generateChecklistPDF({
        taskNumber,
        taskName,
        items,
      });
      toast.success("Report generated successfully");
    } catch (error) {
      console.error("Failed to generate PDF:", error);
      toast.error("Failed to generate report. Please try again.");
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  const hasRemarksOrPhoto = (item: TaskChecklistItem) => {
    return !!(item.remarks || item.photoUrl);
  };

  if (!checklist || !checklist.items || checklist.items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-gray-500">
        <ClipboardList className="h-12 w-12 text-gray-300 mb-3" />
        <p className="font-medium">No checklist for this task</p>
        <p className="text-sm text-gray-400 mt-1">
          Checklists are automatically added from service templates
        </p>
      </div>
    );
  }

  const passedCount = items.filter((item) => item.status === 'passed').length;
  const failedCount = items.filter((item) => item.status === 'failed').length;
  const pendingCount = items.filter((item) => item.status === 'pending').length;
  const totalCount = items.length;
  const completedCount = passedCount + failedCount;
  const isComplete = pendingCount === 0;
  const hasFailures = failedCount > 0;

  return (
    <div className="space-y-4">
      {/* Progress bar and stats */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2.5 bg-gray-200 rounded-full overflow-hidden flex">
            {passedCount > 0 && (
              <div
                className="h-full bg-green-500 transition-all duration-500"
                style={{ width: `${(passedCount / totalCount) * 100}%` }}
              />
            )}
            {failedCount > 0 && (
              <div
                className="h-full bg-red-500 transition-all duration-500"
                style={{ width: `${(failedCount / totalCount) * 100}%` }}
              />
            )}
          </div>
          <span className="text-sm font-medium text-gray-600 min-w-[60px] text-right">
            {completedCount}/{totalCount}
          </span>
        </div>

        {/* Status summary */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-green-700 font-medium">{passedCount} Passed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-red-700 font-medium">{failedCount} Failed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="h-4 w-4 text-gray-400" />
            <span className="text-gray-500">{pendingCount} Pending</span>
          </div>
        </div>
      </div>

      {/* Checklist items */}
      <div className="space-y-2">
        {items
          .sort((a, b) => a.order - b.order)
          .map((item, index) => (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 p-3 rounded-lg border transition-all duration-200",
                item.status === 'passed' && "bg-green-50/80 border-green-200",
                item.status === 'failed' && "bg-red-50/80 border-red-200",
                item.status === 'pending' && "bg-white border-gray-200 hover:border-gray-300"
              )}
            >
              {/* Item number and status icon */}
              <div className="flex items-center gap-2 pt-0.5">
                <span
                  className={cn(
                    "inline-flex items-center justify-center w-6 h-6 text-xs font-medium rounded-full flex-shrink-0",
                    item.status === 'passed' && "bg-green-200 text-green-700",
                    item.status === 'failed' && "bg-red-200 text-red-700",
                    item.status === 'pending' && "bg-gray-200 text-gray-600"
                  )}
                >
                  {index + 1}
                </span>
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <p
                  className={cn(
                    "font-medium transition-all",
                    item.status === 'passed' && "text-green-800",
                    item.status === 'failed' && "text-red-800",
                    item.status === 'pending' && "text-gray-900"
                  )}
                >
                  {item.title}
                </p>
                {item.description && (
                  <p
                    className={cn(
                      "text-sm mt-1",
                      item.status === 'passed' && "text-green-600",
                      item.status === 'failed' && "text-red-600",
                      item.status === 'pending' && "text-gray-500"
                    )}
                  >
                    {item.description}
                  </p>
                )}
              </div>

              {/* Action buttons */}
              {canEdit && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    variant={item.status === 'passed' ? 'primary' : 'outline'}
                    onClick={() => handlePassClick(item)}
                    disabled={isPending}
                    className={cn(
                      "h-8 px-3",
                      item.status === 'passed'
                        ? "bg-green-600 hover:bg-green-700 text-white"
                        : "hover:bg-green-50 hover:text-green-700 hover:border-green-300"
                    )}
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Pass
                    {/* Show indicator if passed item has remarks */}
                    {item.status === 'passed' && hasRemarksOrPhoto(item) && (
                      <MessageSquare className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                  <Button
                    size="sm"
                    variant={item.status === 'failed' ? 'destructive' : 'outline'}
                    onClick={() => handleFailClick(item)}
                    disabled={isPending}
                    className={cn(
                      "h-8 px-3",
                      item.status === 'failed'
                        ? "bg-red-600 hover:bg-red-700 text-white"
                        : "hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                    )}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Fail
                    {/* Show indicator if failed item has remarks */}
                    {item.status === 'failed' && hasRemarksOrPhoto(item) && (
                      <MessageSquare className="h-3 w-3 ml-1" />
                    )}
                  </Button>
                </div>
              )}

              {/* Status indicator for non-editors */}
              {!canEdit && item.status !== 'pending' && (
                <div className="flex-shrink-0">
                  {item.status === 'passed' ? (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                      <CheckCircle2 className="h-3 w-3" />
                      Passed
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                      <XCircle className="h-3 w-3" />
                      Failed
                    </span>
                  )}
                </div>
              )}

              {isPending && (
                <Loader2 className="h-4 w-4 animate-spin text-gray-400 flex-shrink-0" />
              )}
            </div>
          ))}
      </div>

      {/* Footer info */}
      {!canEdit && (
        <p className="text-xs text-gray-400 text-center pt-2">
          You can only update items when assigned to this task
        </p>
      )}

      {/* Summary message */}
      {isComplete && (
        <div className={cn(
          "p-3 rounded-lg text-center text-sm font-medium",
          hasFailures
            ? "bg-amber-50 text-amber-800 border border-amber-200"
            : "bg-green-50 text-green-800 border border-green-200"
        )}>
          {hasFailures
            ? `Checklist completed with ${failedCount} failed item${failedCount > 1 ? 's' : ''}`
            : 'All checklist items passed!'
          }
        </div>
      )}

      {/* Generate Report Button - Only available when no pending items */}
      {items.length > 0 && pendingCount === 0 && (
        <div className="pt-4 border-t border-gray-100">
          <Button
            onClick={handleGenerateReport}
            disabled={isGeneratingPDF}
            variant="outline"
            className="w-full sm:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200 text-indigo-700 hover:from-indigo-100 hover:to-purple-100 hover:border-indigo-300"
          >
            {isGeneratingPDF ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Generating Report...
              </>
            ) : (
              <>
                <FileDown className="h-4 w-4" />
                Generate Report
              </>
            )}
          </Button>
        </div>
      )}

      {/* Remarks Modal - Opens when clicking Pass or Fail */}
      {selectedItem && (
        <ChecklistRemarksModal
          open={remarksModalOpen}
          onOpenChange={handleModalClose}
          itemTitle={selectedItem.title}
          itemId={selectedItem.id}
          initialRemarks={selectedItem.remarks || ""}
          initialPhotoUrl={selectedItem.photoUrl || ""}
          isPassMode={isPassAction}
          isFailMode={isFailAction}
          requirePhoto={selectedItem.requirePhoto}
          requireRemarks={selectedItem.requireRemarks}
          onSave={handleSaveRemarks}
        />
      )}
    </div>
  );
};
