import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import { MemberRole } from "../types";

interface useGetMembersPaginatedProps {
  workspaceId: string | undefined;
  page?: number;
  limit?: number;
  role?: MemberRole | undefined;
}

export const useGetMembersPaginated = ({
  workspaceId,
  page = 1,
  limit = 6,
  role,
}: useGetMembersPaginatedProps) => {
  const query = useQuery({
    queryKey: ["members", workspaceId, page, limit, role],
    queryFn: async () => {
      if (!workspaceId) {
        throw new Error("Workspace ID is required");
      }

      const params: Record<string, string> = {
        workspaceId,
        page: page.toString(),
        limit: limit.toString(),
      };

      if (role) {
        params.role = role;
      }

      const response = await client.api.members.$get({
        query: params as { workspaceId: string; page?: string; limit?: string; role?: string }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch members");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!workspaceId,
  });

  return query;
};