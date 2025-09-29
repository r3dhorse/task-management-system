import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseGetTaskHistoryProps {
  taskId: string;
}

export const useGetTaskHistory = ({ taskId }: UseGetTaskHistoryProps) => {
  const query = useQuery({
    queryKey: ["task-history", taskId],
    queryFn: async () => {
      const response = await client.api["task-history"][":taskId"].$get({
        param: { taskId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch task history");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!taskId,
  });

  return query;
};