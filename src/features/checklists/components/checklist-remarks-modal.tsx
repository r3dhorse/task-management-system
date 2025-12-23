"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { ResponsiveModal } from "@/components/responsive-modal";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Camera, X, Loader2 } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils";

interface ChecklistRemarksModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  itemTitle: string;
  itemId: string;
  initialRemarks?: string;
  initialPhotoUrl?: string;
  isFailMode?: boolean;
  onSave: (remarks: string | undefined, photoUrl: string | undefined) => Promise<void>;
}

export const ChecklistRemarksModal = ({
  open,
  onOpenChange,
  itemTitle,
  itemId,
  initialRemarks = "",
  initialPhotoUrl = "",
  isFailMode = false,
  onSave,
}: ChecklistRemarksModalProps) => {
  const [remarks, setRemarks] = useState(initialRemarks);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reset state when modal opens with new values
  useEffect(() => {
    if (open) {
      setRemarks(initialRemarks);
      setPhotoUrl(initialPhotoUrl);
    }
  }, [open, initialRemarks, initialPhotoUrl]);

  // Cleanup stream when modal closes or component unmounts
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [stream]);

  const startCamera = useCallback(async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: false,
      });
      setStream(mediaStream);
      setIsCapturing(true);

      // Wait for next tick to ensure video element is mounted
      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (error) {
      console.error("Failed to access camera:", error);
      alert("Unable to access camera. Please check permissions.");
    }
  }, []);

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setIsCapturing(false);
  }, [stream]);

  const capturePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");

    if (!ctx) return;

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw video frame to canvas
    ctx.drawImage(video, 0, 0);

    // Convert to data URL (base64)
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    setPhotoUrl(dataUrl);

    // Stop camera after capture
    stopCamera();
  }, [stopCamera]);

  const removePhoto = useCallback(() => {
    setPhotoUrl("");
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(
        remarks.trim() || undefined,
        photoUrl || undefined
      );
      onOpenChange(false);
    } catch (error) {
      console.error("Failed to save remarks:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    onOpenChange(false);
  };

  const modalTitle = isFailMode ? "Mark as Failed" : "Add Remarks";
  const modalDescription = isFailMode
    ? `Document why this item failed: ${itemTitle}`
    : `Add remarks and photo for: ${itemTitle}`;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleClose}
      title={modalTitle}
      description={modalDescription}
    >
      <div className="space-y-6 p-4">
        {/* Header */}
        <div className="space-y-1">
          <h2 className={cn(
            "text-lg font-semibold",
            isFailMode ? "text-red-700" : "text-gray-900"
          )}>
            {modalTitle}
          </h2>
          <p className="text-sm text-gray-500 truncate">
            {isFailMode ? "Item: " : "For: "}{itemTitle}
          </p>
        </div>

        {/* Photo Section */}
        <div className="space-y-3">
          <Label className="text-sm font-medium text-gray-700">
            Photo (Optional)
          </Label>

          {isCapturing ? (
            <div className="space-y-3">
              <div className="relative rounded-lg overflow-hidden bg-black aspect-video">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  onClick={capturePhoto}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Camera className="h-4 w-4 mr-2" />
                  Capture
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={stopCamera}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : photoUrl ? (
            <div className="relative">
              <div className="relative rounded-lg overflow-hidden border border-gray-200">
                <img
                  src={photoUrl}
                  alt="Captured"
                  className="w-full h-auto max-h-64 object-contain bg-gray-50"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={removePhoto}
                className="absolute top-2 right-2 h-8 w-8 p-0 rounded-full"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={startCamera}
              className={cn(
                "w-full h-32 border-2 border-dashed",
                "flex flex-col items-center justify-center gap-2",
                "hover:border-blue-400 hover:bg-blue-50/50 transition-colors"
              )}
            >
              <div className="p-3 rounded-full bg-gray-100">
                <Camera className="h-6 w-6 text-gray-500" />
              </div>
              <span className="text-sm text-gray-600">Tap to capture photo</span>
            </Button>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Remarks Section */}
        <div className="space-y-2">
          <Label htmlFor={`remarks-${itemId}`} className="text-sm font-medium text-gray-700">
            Remarks (Optional)
          </Label>
          <Textarea
            id={`remarks-${itemId}`}
            placeholder="Enter your remarks here..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="min-h-[120px] resize-none"
            maxLength={1000}
          />
          <p className="text-xs text-gray-400 text-right">
            {remarks.length}/1000
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className={cn(
              "flex-1",
              isFailMode
                ? "bg-red-600 hover:bg-red-700"
                : "bg-blue-600 hover:bg-blue-700"
            )}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                {isFailMode ? "Marking as Failed..." : "Saving..."}
              </>
            ) : (
              isFailMode ? "Mark as Failed" : "Save Remarks"
            )}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
};
