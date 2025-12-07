"use client"

import { useGetMembers } from "@/features/members/api/use-get-members";
import { Member, MemberRole } from "@/features/members/types";
import { useGetServices } from "@/features/services/api/use-get-services";
import { useWorkspaceId } from "@/features/workspaces/hooks/use-workspace-id";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { useGetTask } from "../api/use-get-task";
import { EditTaskForm } from "./edit-task-form";
import { Task } from "../types";

interface EditTaskFormWrapperProps {
  onCancel: () => void;
  id: string;
  /** Callback when form actions are ready (for external footer) */
  onFormReady?: (actions: { submit: () => void; isPending: boolean }) => void;
};

export const EditTaskFormWrapper = ({
  onCancel,
  id,
  onFormReady,
}: EditTaskFormWrapperProps) => {
  const workspaceId = useWorkspaceId();

  const { data: initialValues, isLoading: isLoadingTask } = useGetTask({
    taskId: id,

  });

  const { data: services, isLoading: isLoadingServices } = useGetServices({ workspaceId });
  const { data: members, isLoading: isLoadingMembers } = useGetMembers({ workspaceId });

  const serviceOptions = services?.documents.map((service) => ({
    id: service.id,
    name: service.name,
  }));

  const memberOptions = members?.documents.map((member) => ({
    id: member.id,
    name: member.name,
    role: (member as Member).role,
  }));

  // Follower options - customers only
  const followerOptions = members?.documents
    .filter((member) => (member as Member).role === MemberRole.CUSTOMER)
    .map((member) => ({
      value: member.id,
      label: member.name,
      email: member.email,
      role: (member as Member).role,
    })) ?? [];

  // Collaborator options - team members only (non-customers)
  const collaboratorOptions = members?.documents
    .filter((member) => (member as Member).role !== MemberRole.CUSTOMER)
    .map((member) => ({
      value: member.id,
      label: member.name,
      email: member.email,
      role: (member as Member).role,
    })) ?? [];

  const isLoading = isLoadingServices || isLoadingMembers || isLoadingTask;

  if (isLoading) {
    return (
      <Card className="w-f h-[714px] border-none shadow-none">
        <CardContent className="flex items-center justify-center h-full">
          <LoadingSpinner variant="minimal" size="md" />
        </CardContent>
      </Card>
    )
  }

  if (!initialValues) {
    return null;
  }
  return (
    <EditTaskForm
      onCancel={onCancel}
      initialValues={initialValues as Task}
      serviceOptions={serviceOptions ?? []}
      membertOptions={memberOptions ?? []}
      followerOptions={followerOptions}
      collaboratorOptions={collaboratorOptions}
      onFormReady={onFormReady}
    />
  );
};