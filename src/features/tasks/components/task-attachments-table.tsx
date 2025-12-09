"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PlusIcon, Download, Trash2, Paperclip } from "@/lib/lucide-icons";
import { useGetAllAttachments, TaskAttachment } from "../api/use-get-all-attachments";
import { useDeleteAttachment } from "../api/use-delete-attachment";
import { useConfirm } from "@/hooks/use-confirm";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface TaskAttachmentsTableProps {
  taskId: string;
  workspaceId: string;
  taskNumber: string;
}

// Helper function to format file size
const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
};

export const TaskAttachmentsTable = ({
  taskId,
  workspaceId,
  taskNumber,
}: TaskAttachmentsTableProps) => {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: attachments, isLoading } = useGetAllAttachments({ taskId });
  const { mutate: deleteAttachment, isPending: isDeleting } = useDeleteAttachment();
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [DeleteConfirmDialog, confirmDelete] = useConfirm(
    "Delete Attachment",
    "Are you sure you want to delete this attachment? This action cannot be undone.",
    "destructive"
  );

  const handleDownloadFile = (attachmentId: string, fileName: string) => {
    // Create a temporary link to force download
    const link = document.createElement("a");
    link.href = `/api/download/${encodeURIComponent(attachmentId)}`;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteAttachment = async (attachment: TaskAttachment) => {
    const confirmed = await confirmDelete();
    if (!confirmed) return;

    deleteAttachment({
      attachmentId: attachment.id,
      parentTaskId: taskId,
    });
  };

  const handleTaskClick = (attachment: TaskAttachment) => {
    router.push(`/workspaces/${workspaceId}/tasks/${attachment.taskId}`);
  };

  const handleAddFiles = () => {
    setIsUploadDialogOpen(true);
  };

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate PDF only
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }

    // Validate 10MB max
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", "task");
      formData.append("workspaceId", workspaceId);
      formData.append("taskId", taskId);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData?.error || "Failed to upload file");
      }

      toast.success("File uploaded successfully");
      setIsUploadDialogOpen(false);

      // Refresh the attachments list
      queryClient.invalidateQueries({
        queryKey: ["all-attachments", taskId],
      });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload file");
    } finally {
      setIsUploading(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const hasAttachments = attachments && attachments.length > 0;

  return (
    <div className="space-y-4">
      <DeleteConfirmDialog />

      {/* Header with Add Files button */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          Attachments {hasAttachments && `(${attachments.length})`}
        </h3>
        <Button
          onClick={handleAddFiles}
          size="sm"
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <PlusIcon className="size-4 mr-2" />
          Add Files
        </Button>
      </div>

      {/* Attachments Table */}
      {!hasAttachments ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex flex-col items-center gap-3">
            <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center">
              <Paperclip className="w-6 h-6 text-gray-400" />
            </div>
            <p className="text-gray-600 font-medium">No attachments yet</p>
            <p className="text-sm text-gray-500">
              Upload files to this task or its subtasks
            </p>
            <Button
              onClick={handleAddFiles}
              size="sm"
              variant="outline"
              className="mt-2"
            >
              <PlusIcon className="size-4 mr-2" />
              Add First Attachment
            </Button>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-gray-50">
                <TableHead className="w-[60px]">No</TableHead>
                <TableHead className="w-[150px]">Task Number</TableHead>
                <TableHead>File Name</TableHead>
                <TableHead className="w-[100px]">Size</TableHead>
                <TableHead className="w-[100px] text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {attachments.map((attachment, index) => (
                <TableRow
                  key={attachment.id}
                  className="hover:bg-gray-50 transition-colors"
                  onMouseEnter={() => setHoveredRowId(attachment.id)}
                  onMouseLeave={() => setHoveredRowId(null)}
                >
                  <TableCell className="font-mono text-sm text-gray-500">
                    {index + 1}
                  </TableCell>
                  <TableCell>
                    <button
                      onClick={() => handleTaskClick(attachment)}
                      className="flex items-center gap-2 hover:underline"
                    >
                      <span className="font-mono text-sm text-blue-600">
                        {attachment.taskNumber}
                      </span>
                      {attachment.isParentTask && (
                        <Badge
                          variant="secondary"
                          className="text-xs bg-purple-100 text-purple-700"
                        >
                          Parent
                        </Badge>
                      )}
                    </button>
                  </TableCell>
                  <TableCell className="font-medium truncate max-w-[250px]" title={attachment.originalName}>
                    {attachment.originalName}
                  </TableCell>
                  <TableCell className="text-sm text-gray-500">
                    {formatFileSize(attachment.fileSize)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDownloadFile(attachment.id, attachment.originalName)}
                        className={cn(
                          "h-8 w-8 text-gray-600 hover:text-green-600 hover:bg-green-50",
                          hoveredRowId === attachment.id && "opacity-100"
                        )}
                        title="Download file"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {/* Only show delete button for parent task attachments */}
                      {attachment.isParentTask && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => handleDeleteAttachment(attachment)}
                          disabled={isDeleting}
                          className={cn(
                            "h-8 w-8 text-gray-600 hover:text-red-600 hover:bg-red-50",
                            hoveredRowId === attachment.id && "opacity-100"
                          )}
                          title="Delete file"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Summary */}
      {hasAttachments && (
        <div className="flex items-center gap-4 text-sm text-gray-600 pt-2">
          <div className="flex items-center gap-2">
            <span className="font-medium">Total:</span>
            <span>{attachments.length} file(s)</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="font-medium">Size:</span>
            <span>{formatFileSize(attachments.reduce((sum, att) => sum + att.fileSize, 0))}</span>
          </div>
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Attachment</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Upload a PDF file to attach to task <span className="font-mono font-medium">{taskNumber}</span>
            </p>
            <div className="flex flex-col items-center justify-center gap-4 p-6 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-400 transition-colors">
              <Paperclip className="h-10 w-10 text-gray-400" />
              <div className="text-center">
                <p className="text-sm text-gray-600">
                  Click to select a PDF file
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  Maximum file size: 10MB
                </p>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                disabled={isUploading}
              />
              <Button
                variant="outline"
                disabled={isUploading}
                onClick={() => fileInputRef.current?.click()}
              >
                {isUploading ? (
                  <>
                    <LoadingSpinner size="xs" variant="inline" />
                    <span className="ml-2">Uploading...</span>
                  </>
                ) : (
                  <>
                    <PlusIcon className="h-4 w-4 mr-2" />
                    Select File
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
