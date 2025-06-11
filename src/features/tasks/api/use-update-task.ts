import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";
import { useRouter } from "next/navigation";


type ResponseType = InferResponseType<typeof client.api.tasks[":taskId"]["$patch"], 200>;
type RequestType = InferRequestType<typeof client.api.tasks[":taskId"]["$patch"]>;

export const useUpdateTask = () => {
  const router = useRouter();
  const queryClient = useQueryClient();


  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({

    mutationFn: async ({ json, param }) => {
      const response = await client.api.tasks[":taskId"]["$patch"]({ json, param, });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: "Unknown error" })) as { error?: string };
        throw new Error(errorData.error || `Failed to update task (${response.status})`);
      }
      return await response.json();
    },

    onError: (error) => {
      toast.error(error.message || "Failed to update task");
    },

    onSuccess: (data, variables) => {
      router.refresh();
      toast.success("Task updated successfully");
      
      // Invalidate all queries to ensure fresh data
      queryClient.invalidateQueries();
      
      // Specifically invalidate task history to ensure activity timeline updates
      queryClient.invalidateQueries({ 
        queryKey: ["task-history", variables.param.taskId] 
      });
      
      // Also invalidate the specific task
      queryClient.invalidateQueries({ 
        queryKey: ["task", variables.param.taskId] 
      });
    },

  });
  return mutation;
};