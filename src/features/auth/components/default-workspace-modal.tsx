"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Building2, Check } from "@/lib/lucide-icons";
import { cn } from "@/lib/utils";

interface DefaultWorkspaceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface Workspace {
  id: string;
  name: string;
  description: string | null;
}

export const DefaultWorkspaceModal = ({ isOpen, onClose }: DefaultWorkspaceModalProps) => {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentDefaultId, setCurrentDefaultId] = useState<string | null>(null);
  const [selectedWorkspaceId, setSelectedWorkspaceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchWorkspaceData();
    }
  }, [isOpen]);

  const fetchWorkspaceData = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/users/default-workspace");
      if (!response.ok) throw new Error("Failed to fetch workspace data");

      const data = await response.json();
      setWorkspaces(data.availableWorkspaces || []);
      setCurrentDefaultId(data.defaultWorkspaceId);
      setSelectedWorkspaceId(data.defaultWorkspaceId);
    } catch (error) {
      console.error("Error fetching workspace data:", error);
      toast.error("Failed to load workspaces");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/users/default-workspace", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspaceId: selectedWorkspaceId }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update default workspace");
      }

      const data = await response.json();
      toast.success("Default workspace updated successfully");
      setCurrentDefaultId(selectedWorkspaceId);
      onClose();
      router.refresh();
    } catch (error) {
      console.error("Error updating default workspace:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update default workspace");
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearDefault = async () => {
    try {
      setIsSaving(true);
      const response = await fetch("/api/users/default-workspace", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workspaceId: null }),
      });

      if (!response.ok) {
        throw new Error("Failed to clear default workspace");
      }

      toast.success("Default workspace cleared");
      setCurrentDefaultId(null);
      setSelectedWorkspaceId(null);
      onClose();
      router.refresh();
    } catch (error) {
      console.error("Error clearing default workspace:", error);
      toast.error("Failed to clear default workspace");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Set Default Workspace</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-16 bg-gray-100 rounded-lg animate-pulse" />
              ))}
            </div>
          ) : workspaces.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              You are not a member of any workspaces yet.
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Choose a workspace to automatically navigate to when you log in.
              </p>

              <div className="space-y-2 max-h-[300px] overflow-y-auto">
                {workspaces.map((workspace) => (
                  <button
                    key={workspace.id}
                    onClick={() => setSelectedWorkspaceId(workspace.id)}
                    className={cn(
                      "w-full p-3 rounded-lg border transition-all text-left",
                      "hover:bg-gray-50 hover:border-gray-300",
                      selectedWorkspaceId === workspace.id
                        ? "border-blue-500 bg-blue-50"
                        : "border-gray-200"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Building2 className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="font-medium">{workspace.name}</p>
                          {workspace.description && (
                            <p className="text-sm text-gray-500 line-clamp-1">
                              {workspace.description}
                            </p>
                          )}
                        </div>
                      </div>
                      {selectedWorkspaceId === workspace.id && (
                        <Check className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    {currentDefaultId === workspace.id && (
                      <span className="inline-block mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                        Current default
                      </span>
                    )}
                  </button>
                ))}
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button
                  variant="ghost"
                  onClick={handleClearDefault}
                  disabled={isSaving || !currentDefaultId}
                >
                  Clear Default
                </Button>
                <div className="space-x-2">
                  <Button variant="outline" onClick={onClose} disabled={isSaving}>
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={isSaving || selectedWorkspaceId === currentDefaultId}
                  >
                    {isSaving ? "Saving..." : "Save"}
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};