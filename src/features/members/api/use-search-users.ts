import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseSearchUsersProps {
  workspaceId: string;
  search: string;
  enabled?: boolean;
}

export const useSearchUsers = ({
  workspaceId,
  search,
  enabled = true,
}: UseSearchUsersProps) => {
  const query = useQuery({
    queryKey: ["search-users", workspaceId, search],
    queryFn: async () => {
      const response = await client.api.members["search-users"].$get({ 
        query: { workspaceId, search } 
      });

      if (!response.ok) {
        throw new Error("Failed to search users");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: enabled && search.length >= 2, // Only search when we have at least 2 characters
    staleTime: 30000, // Cache for 30 seconds
  });

  return query;
};