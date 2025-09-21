import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseGetNotificationsPaginatedProps {
  page?: number;
  limit?: number;
  type?: string;
}

export const useGetNotificationsPaginated = ({
  page = 1,
  limit = 7,
  type,
}: UseGetNotificationsPaginatedProps = {}) => {
  return useQuery({
    queryKey: ["notifications", "paginated", page, limit, type],
    queryFn: async () => {
      const response = await client.api.notifications.$get({
        query: {
          page: page.toString(),
          limit: limit.toString(),
          ...(type && { type }),
        },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      return await response.json();
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
  });
};