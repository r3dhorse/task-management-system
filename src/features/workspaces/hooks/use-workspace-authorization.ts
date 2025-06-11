"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useGetWorkspace } from "../api/use-get-workspace";

interface UseWorkspaceAuthorizationProps {
  workspaceId: string;
}

export const useWorkspaceAuthorization = ({ workspaceId }: UseWorkspaceAuthorizationProps) => {
  const router = useRouter();
  const { data: workspace, isLoading, error } = useGetWorkspace({ workspaceId });

  useEffect(() => {
    if (error) {
      router.push("/no-workspace");
    }
  }, [error, router]);

  return {
    workspace,
    isLoading,
    isAuthorized: !error && !isLoading,
  };
};