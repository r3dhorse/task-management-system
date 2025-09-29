import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

export const useGetNotificationCount = () => {
  const query = useQuery({
    queryKey: ["notification-count"],
    queryFn: async () => {
      const response = await client.api.notifications.count.$get();

      if (!response.ok) {
        throw new Error("Failed to fetch notification count");
      }

      const data = await response.json();
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchOnWindowFocus: true,
  });

  return query;
};