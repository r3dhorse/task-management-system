import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

export const useGetNotifications = () => {
  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const response = await client.api.notifications.$get({
        query: {
          limit: "50", // Keep existing behavior with 50 notifications limit
        }
      });

      if (!response.ok) {
        throw new Error("Failed to fetch notifications");
      }

      const data = await response.json();
      return data;
    },
    refetchInterval: 5000, // Refetch every 5 seconds for real-time updates
    refetchOnWindowFocus: true,
  });

  return query;
};