import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";

interface UseValidateTaskCompletionProps {
  taskId: string;
  enabled?: boolean;
}

export const useValidateTaskCompletion = ({
  taskId,
  enabled = false
}: UseValidateTaskCompletionProps) => {
  const query = useQuery({
    queryKey: ["task-completion-validation", taskId],
    queryFn: async () => {
      const response = await client.api.tasks[":taskId"]["validate-completion"].$patch({
        param: { taskId },
      });

      if (!response.ok) {
        throw new Error("Failed to validate task completion");
      }

      const { data } = await response.json();
      return data;
    },
    enabled: !!taskId && enabled,
  });

  return query;
};