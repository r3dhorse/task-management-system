"use client"

import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreateTaskForm } from "./create-task-form";
import { Workspace } from "@/features/workspaces/types";

interface CreateTaskFormWrapperProps {
  onCancel: () => void;
  parentTaskId?: string;
  initialWorkspaceId?: string;
  initialServiceId?: string;
  onSuccess?: (task: unknown) => void;
  /** Callback when form actions are ready (for external footer) */
  onFormReady?: (actions: { submit: () => void; isPending: boolean }) => void;
};

export const CreateTaskFormWrapper = ({
  onCancel,
  parentTaskId: _parentTaskId,
  initialWorkspaceId,
  initialServiceId: _initialServiceId,
  onSuccess: _onSuccess,
  onFormReady,
}: CreateTaskFormWrapperProps) => {
  const workspaceId = useWorkspaceId();

  const { data: workspaces, isLoading: isLoadingWorkspaces } = useGetWorkspaces();

  const workspaceOptions = workspaces?.documents.map((workspace: Workspace) => ({
    id: workspace.id,
    name: workspace.name,
  }));

  if (isLoadingWorkspaces) {
    return (
      <Card className="w-f h-[714px] border-none shadow-none">
        <CardContent className="flex items-center justify-center h-full">
          <LoadingSpinner variant="minimal" size="md" />
        </CardContent>
      </Card>
    )
  }

  return (
    <CreateTaskForm
      onCancel={onCancel}
      workspaceOptions={workspaceOptions ?? []}
      workspaceId={initialWorkspaceId || workspaceId}
      parentTaskId={_parentTaskId}
      initialServiceId={_initialServiceId}
      onSuccess={_onSuccess}
      onFormReady={onFormReady}
    />
  );
};