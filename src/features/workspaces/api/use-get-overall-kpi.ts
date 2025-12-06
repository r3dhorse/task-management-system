import { useQuery } from "@tanstack/react-query";

interface WorkspaceKPI {
  workspaceId: string;
  workspaceName: string;
  kpiScore: number;
  tasksAssigned: number;
  tasksCompleted: number;
  weight: number;
}

export interface MemberOverallKPI {
  userId: string;
  userName: string;
  userEmail: string;
  overallKPI: number;
  workspaceBreakdown: WorkspaceKPI[];
  totalTasksAcrossWorkspaces: number;
  totalCompletedAcrossWorkspaces: number;
  workspaceCount: number;
}

interface UseGetOverallKPIProps {
  workspaceId: string | undefined;
  enabled?: boolean;
}

export const useGetOverallKPI = ({ workspaceId, enabled = true }: UseGetOverallKPIProps) => {
  return useQuery({
    queryKey: ["overall-kpi", workspaceId],
    queryFn: async (): Promise<MemberOverallKPI[]> => {
      if (!workspaceId) {
        throw new Error("Workspace ID is required");
      }

      const response = await fetch(`/api/overall-kpi?workspaceId=${workspaceId}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch overall KPI");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!workspaceId && enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
