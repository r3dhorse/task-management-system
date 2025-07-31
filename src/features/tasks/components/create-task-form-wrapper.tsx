"use client"

import { useGetUsers } from "@/features/users/api/use-get-users";
import { useGetWorkspaces } from "@/features/workspaces/api/use-get-workspaces";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { CreateTaskForm } from "./create-task-form";

interface CreateTaskFormWrapperProps {
  onCancel: () => void;
};

export const CreateTaskFormWrapper = ({
  onCancel
}: CreateTaskFormWrapperProps) => {
  const workspaceId = useWorkspaceId();

  const { data: workspaces, isLoading: isLoadingWorkspaces } = useGetWorkspaces();
  const { data: users, isLoading: isLoadingUsers } = useGetUsers();

  const workspaceOptions = workspaces?.documents.map((workspace) => ({
    id: workspace.id,
    name: workspace.name,
  }));

  const userOptions = users?.users.map((user) => ({
    id: user.id,
    name: user.name,
  }));

  const isLoading = isLoadingWorkspaces || isLoadingUsers;

  if (isLoading) {
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
      userOptions={userOptions ?? []}
      workspaceId={workspaceId}
    />
  );
};