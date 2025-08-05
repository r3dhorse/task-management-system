"use client"

import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { CreateTaskForm } from "./create-task-form";

interface CreateTaskFormWrapperProps {
  onCancel: () => void;
};

export const CreateTaskFormWrapper = ({
  onCancel
}: CreateTaskFormWrapperProps) => {
  const workspaceId = useWorkspaceId();

  return (
    <CreateTaskForm
      onCancel={onCancel}
      workspaceOptions={[{ id: workspaceId, name: "" }]} // Minimal workspace option since it's not used
      workspaceId={workspaceId}
    />
  );
};