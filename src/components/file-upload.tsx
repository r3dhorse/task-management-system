"use client";

import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { FileTextIcon, XIcon } from "@/lib/lucide-icons";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { toast } from "sonner";

interface FileUploadProps {
  onFileUploaded?: (fileId: string, fileName: string) => void;
  onFileRemoved?: () => void;
  currentFileId?: string;
  currentFileName?: string;
  disabled?: boolean;
  showRemoveButton?: boolean; // Control when to show the X button
  workspaceId?: string;
  taskId?: string;
}

export const FileUpload = ({
  onFileUploaded,
  onFileRemoved,
  currentFileId,
  currentFileName,
  disabled = false,
  showRemoveButton = true, // Default to showing remove button for backward compatibility
  workspaceId,
  taskId,
}: FileUploadProps) => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{
    id: string;
    name: string;
  } | null>(
    currentFileId && currentFileName
      ? { id: currentFileId, name: currentFileName }
      : null
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (file.type !== "application/pdf") {
      toast.error("Only PDF files are allowed");
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setIsUploading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append("file", file);
      formData.append("source", "task");
      if (workspaceId) {
        formData.append("workspaceId", workspaceId);
      }
      if (taskId) {
        formData.append("taskId", taskId);
      }

      // Upload file using the RPC client
      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Failed to upload file");
      }

      const result = await response.json();

      // Use the actual stored filename from API (e.g., TASK-001_attachment.pdf)
      const uploadedFileData = {
        id: result.data.$id,
        name: result.data.name || file.name, // Prefer API filename, fallback to original
      };

      setUploadedFile(uploadedFileData);
      onFileUploaded?.(uploadedFileData.id, uploadedFileData.name);
      toast.success("File uploaded successfully");
    } catch (error) {
      console.error("File upload error:", error);
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      // Clear the input
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const handleRemoveFile = () => {
    setUploadedFile(null);
    onFileRemoved?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };


  return (
    <div className="space-y-2 w-full overflow-hidden">
      <Label htmlFor="file-upload" className="text-xs">PDF file only</Label>

      {uploadedFile ? (
        <Card className="border-gray-200/80 shadow-sm hover:shadow-md transition-shadow">
          <CardContent className="p-3">
            <div className="grid grid-cols-[1fr_auto] items-center gap-x-2">
              <div className="flex items-center gap-x-2 overflow-hidden">
                <FileTextIcon className="size-4 text-red-500 shrink-0" />
                <span
                  className="text-sm font-medium text-gray-800 truncate"
                  title={uploadedFile.name}
                >
                  {uploadedFile.name}
                </span>
              </div>

              {showRemoveButton && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleRemoveFile}
                  disabled={disabled}
                  className="shrink-0 w-8 h-8 p-0 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 transition-colors"
                  title="Remove attachment"
                >
                  <XIcon className="size-3.5" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          <Input
            ref={fileInputRef}
            id="file-upload"
            type="file"
            accept=".pdf"
            onChange={handleFileSelect}
            disabled={disabled || isUploading}
            className="cursor-pointer"
          />
          {isUploading && (
            <div className="flex items-center gap-x-2 text-sm text-gray-600">
              <LoadingSpinner size="sm" />
              Uploading file...
            </div>
          )}
          <p className="text-xs text-gray-500">
            Only PDF files up to 10MB are allowed
          </p>
        </div>
      )}
    </div>
  );
};