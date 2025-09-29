import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseGetServicesProps {
  workspaceId: string
};

export const useGetServices = (
  { workspaceId }: UseGetServicesProps,
  options?: { enabled?: boolean }
) => {
  const query = useQuery({
    queryKey: ["services", workspaceId],
    queryFn: async () => {
      const response = await client.api.services.$get({
        query: { workspaceId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch services")
      }

      const { data } = await response.json();
      return data;
    },
    enabled: options?.enabled !== false && !!workspaceId, // Only fetch when enabled and workspaceId exists
  });

  return query;
};