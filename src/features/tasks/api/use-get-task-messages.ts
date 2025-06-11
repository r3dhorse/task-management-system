import { useQuery } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import { GetTaskMessagesRequest } from "../types/messages";

export const useGetTaskMessages = ({ taskId, workspaceId }: GetTaskMessagesRequest) => {
  const query = useQuery({
    queryKey: ["task-messages", taskId],
    queryFn: async () => {
      const response = await client.api.tasks.messages[":taskId"].$get({
        param: { taskId },
        query: workspaceId ? { workspaceId } : {},
      });

      if (!response.ok) {
        throw new Error("Failed to fetch task messages");
      }

      const { data } = await response.json();
      return data;
    },
    // Poll for new messages every 2 seconds for live chat experience
    refetchInterval: 2000,
    // Keep polling even when window loses focus
    refetchIntervalInBackground: true,
    // Refetch when window regains focus
    refetchOnWindowFocus: true,
    // Don't show loading state when refetching in background
    notifyOnChangeProps: ['data', 'error'],
  });

  return query;
};