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
  isPassMode?: boolean;
  isFailMode?: boolean;
  requirePhoto?: boolean;
  requireRemarks?: boolean;
  onSave: (remarks: string | undefined, photoUrl: string | undefined) => Promise<void>;
}

export const ChecklistRemarksModal = ({
  open,
  onOpenChange,
  itemTitle,
  itemId,
  initialRemarks = "",
  initialPhotoUrl = "",
  isPassMode = false,
  isFailMode = false,
  requirePhoto = false,
  requireRemarks = false,
  onSave,
}: ChecklistRemarksModalProps) => {
  const [remarks, setRemarks] = useState(initialRemarks);
  const [photoUrl, setPhotoUrl] = useState(initialPhotoUrl);
  const [isCapturing, setIsCapturing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [errors, setErrors] = useState<{ photo?: string; remarks?: string }>({});
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Reset state when modal opens with new values
  useEffect(() => {
    if (open) {
      setRemarks(initialRemarks);
      setPhotoUrl(initialPhotoUrl);
      setErrors({});
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
    // Validate required fields
    const newErrors: { photo?: string; remarks?: string } = {};

    if (requirePhoto && !photoUrl) {
      newErrors.photo = "Photo is required for this item";
    }
    if (requireRemarks && !remarks.trim()) {
      newErrors.remarks = "Remarks are required for this item";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
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

  const modalTitle = isPassMode
    ? "Mark as Passed"
    : isFailMode
      ? "Mark as Failed"
      : "Add Remarks";
  const modalDescription = isPassMode
    ? `Add optional remarks and photo for: ${itemTitle}`
    : isFailMode
      ? `Document why this item failed: ${itemTitle}`
      : `Add remarks and photo for: ${itemTitle}`;

  return (
    <ResponsiveModal
      open={open}
      onOpenChange={handleClose}
      title={modalTitle}
      description={modalDescription}
    >
      <div className="space-y-4 sm:space-y-6 p-3 sm:p-4">
        {/* Header */}
        <div className="space-y-1">
          <h2 className={cn(
            "text-base sm:text-lg font-semibold",
            isPassMode ? "text-green-700" : isFailMode ? "text-red-700" : "text-gray-900"
          )}>
            {modalTitle}
          </h2>
          <p className="text-xs sm:text-sm text-gray-500 line-clamp-2 sm:truncate">
            {isPassMode ? "Item: " : isFailMode ? "Item: " : "For: "}{itemTitle}
          </p>
        </div>

        {/* Photo Section */}
        <div className="space-y-2 sm:space-y-3">
          <div className="flex items-center justify-between">
            <Label className={cn(
              "text-xs sm:text-sm font-medium",
              requirePhoto ? "text-gray-900" : "text-gray-700"
            )}>
              Photo {requirePhoto ? (
                <span className="text-red-500 ml-1">*</span>
              ) : (
                <span className="text-gray-400 font-normal">(Optional)</span>
              )}
            </Label>
          </div>
          {errors.photo && (
            <p className="text-xs sm:text-sm text-red-500">{errors.photo}</p>
          )}

          {isCapturing ? (
            <div className="space-y-2 sm:space-y-3">
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
                  className="flex-1 bg-blue-600 hover:bg-blue-700 h-9 sm:h-10 text-sm"
                >
                  <Camera className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
                  Capture
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={stopCamera}
                  className="flex-1 h-9 sm:h-10 text-sm"
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
                  className="w-full h-auto max-h-48 sm:max-h-64 object-contain bg-gray-50"
                />
              </div>
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={removePhoto}
                className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 h-7 w-7 sm:h-8 sm:w-8 p-0 rounded-full"
              >
                <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              onClick={startCamera}
              className={cn(
                "w-full h-24 sm:h-32 border-2 border-dashed",
                "flex flex-col items-center justify-center gap-1.5 sm:gap-2",
                "hover:border-blue-400 hover:bg-blue-50/50 transition-colors touch-manipulation"
              )}
            >
              <div className="p-2.5 sm:p-3 rounded-full bg-gray-100">
                <Camera className="h-5 w-5 sm:h-6 sm:w-6 text-gray-500" />
              </div>
              <span className="text-xs sm:text-sm text-gray-600">Tap to capture photo</span>
            </Button>
          )}
        </div>

        {/* Hidden canvas for capture */}
        <canvas ref={canvasRef} className="hidden" />

        {/* Remarks Section */}
        <div className="space-y-1.5 sm:space-y-2">
          <Label htmlFor={`remarks-${itemId}`} className={cn(
            "text-xs sm:text-sm font-medium",
            requireRemarks ? "text-gray-900" : "text-gray-700"
          )}>
            Remarks {requireRemarks ? (
              <span className="text-red-500 ml-1">*</span>
            ) : (
              <span className="text-gray-400 font-normal">(Optional)</span>
            )}
          </Label>
          {errors.remarks && (
            <p className="text-xs sm:text-sm text-red-500">{errors.remarks}</p>
          )}
          <Textarea
            id={`remarks-${itemId}`}
            placeholder="Enter your remarks here..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="min-h-[100px] sm:min-h-[120px] resize-none text-sm"
            maxLength={1000}
          />
          <p className="text-[10px] sm:text-xs text-gray-400 text-right">
            {remarks.length}/1000
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-2 sm:gap-3 pt-1 sm:pt-2">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            className="flex-1 h-9 sm:h-10 text-sm"
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSave}
            className={cn(
              "flex-1 h-9 sm:h-10 text-sm",
              isPassMode
                ? "bg-green-600 hover:bg-green-700"
                : isFailMode
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
            )}
            disabled={isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">{isPassMode ? "Marking as Passed..." : isFailMode ? "Marking as Failed..." : "Saving..."}</span>
                <span className="sm:hidden">{isPassMode ? "Passing..." : isFailMode ? "Failing..." : "Saving..."}</span>
              </>
            ) : (
              <>
                <span className="hidden sm:inline">{isPassMode ? "Mark as Passed" : isFailMode ? "Mark as Failed" : "Save Remarks"}</span>
                <span className="sm:hidden">{isPassMode ? "Pass" : isFailMode ? "Fail" : "Save"}</span>
              </>
            )}
          </Button>
        </div>
      </div>
    </ResponsiveModal>
  );
};
