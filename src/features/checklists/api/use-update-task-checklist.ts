import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { client } from "@/lib/rpc";
import type { TaskChecklistSection } from "../types";

interface UpdateTaskChecklistRequest {
  taskId: string;
  sections: TaskChecklistSection[];
}

export const useUpdateTaskChecklist = () => {
  const queryClient = useQueryClient();

  const mutation = useMutation<unknown, Error, UpdateTaskChecklistRequest>({
    mutationFn: async ({ taskId, sections }) => {
      const response = await client.api.tasks[":taskId"].checklist.$patch({
        param: { taskId },
        json: { sections },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(errorData.error || "Failed to update checklist");
      }

      return await response.json();
    },

    onSuccess: (_, variables) => {
      // Invalidate task and history queries
      queryClient.invalidateQueries({ queryKey: ["task", variables.taskId] });
      queryClient.invalidateQueries({ queryKey: ["task-history", variables.taskId] });
    },

    onError: (error) => {
      toast.error(error.message || "Failed to update checklist");
    },
  });

  return mutation;
};
