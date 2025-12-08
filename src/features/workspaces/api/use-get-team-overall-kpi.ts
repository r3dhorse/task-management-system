import { useQuery } from "@tanstack/react-query";

interface WorkspaceKPI {
  workspaceId: string;
  workspaceName: string;
  kpiScore: number;
  tasksAssigned: number;
  tasksCompleted: number;
  weight: number;
}

export interface TeamMemberKPI {
  memberId: string;
  userId: string;
  userName: string;
  userEmail: string;
  overallKPI: number;
  workspaceBreakdown: WorkspaceKPI[];
  totalTasksAcrossWorkspaces: number;
  totalCompletedAcrossWorkspaces: number;
  workspaceCount: number;
}

export interface AdminWorkspace {
  id: string;
  name: string;
  memberCount: number;
}

export interface TeamStats {
  totalMembers: number;
  averageKPI: number;
  highPerformers: number;
  totalTasks: number;
  totalCompleted: number;
}

export interface Pagination {
  page: number;
  limit: number;
  totalMembers: number;
  totalPages: number;
  hasMore: boolean;
}

export interface TeamOverallKPIData {
  members: TeamMemberKPI[];
  adminWorkspaces: AdminWorkspace[];
  teamStats: TeamStats;
  pagination: Pagination;
}

interface UseGetTeamOverallKPIProps {
  workspaceId?: string | null; // Optional filter by workspace
  page?: number;
  limit?: number;
  enabled?: boolean;
}

export const useGetTeamOverallKPI = ({
  workspaceId,
  page = 1,
  limit = 10,
  enabled = true,
}: UseGetTeamOverallKPIProps = {}) => {
  return useQuery({
    queryKey: ["team-overall-kpi", workspaceId, page, limit],
    queryFn: async (): Promise<TeamOverallKPIData> => {
      const params = new URLSearchParams();
      if (workspaceId) {
        params.set("workspaceId", workspaceId);
      }
      params.set("page", page.toString());
      params.set("limit", limit.toString());

      const response = await fetch(`/api/team-overall-kpi?${params.toString()}`);

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to fetch team overall KPI");
      }

      const { data } = await response.json();
      return data;
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
