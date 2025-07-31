"use client";

import { Button } from "@/components/ui/button";
import { CreateWorkspaceModal } from "@/features/workspaces/components/create-workspace-modal";
import { useCreateWorkspaceModal } from "@/features/workspaces/hooks/use-create-workspace-modal";
import { canCreateWorkspace } from "@/features/auth/utils";
import { PlusIcon } from "lucide-react";

interface WorkspaceActionsProps {
  user: {
    id?: string;
    $id?: string;
    name?: string | null;
    email?: string | null;
    isAdmin?: boolean;
  };
}

export const WorkspaceActions = ({ user }: WorkspaceActionsProps) => {
  const { open } = useCreateWorkspaceModal();
  const canCreate = canCreateWorkspace(user);

  if (!canCreate) {
    return null;
  }

  return (
    <>
      <CreateWorkspaceModal />
      <Button 
        onClick={open}
        size="lg"
        className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
      >
        <PlusIcon className="w-5 h-5 mr-2" />
        New Workspace
      </Button>
    </>
  );
};