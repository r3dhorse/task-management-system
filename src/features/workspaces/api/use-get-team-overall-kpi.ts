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

export interface TeamOverallKPIData {
  members: TeamMemberKPI[];
  adminWorkspaces: AdminWorkspace[];
  teamStats: TeamStats;
}

interface UseGetTeamOverallKPIProps {
  enabled?: boolean;
}

export const useGetTeamOverallKPI = ({ enabled = true }: UseGetTeamOverallKPIProps = {}) => {
  return useQuery({
    queryKey: ["team-overall-kpi"],
    queryFn: async (): Promise<TeamOverallKPIData> => {
      const response = await fetch("/api/team-overall-kpi");

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
