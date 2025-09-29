import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseGetSubTasksProps {
  taskId: string;
}

export const useGetSubTasks = ({ taskId }: UseGetSubTasksProps) => {
  const query = useQuery({
    queryKey: ["sub-tasks", taskId],
    queryFn: async () => {
      const response = await client.api.tasks[":taskId"]["sub-tasks"].$get({
        param: { taskId },
      });

      if (!response.ok) {
        throw new Error("Failed to fetch sub-tasks");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!taskId,
  });

  return query;
};