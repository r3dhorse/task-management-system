import { toast } from "sonner"
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { InferRequestType, InferResponseType } from "hono";
import { client } from "@/lib/rpc";


type ResponseType = InferResponseType<typeof client.api.tasks[":taskId"]["$delete"], 200>;
type RequestType = InferRequestType<typeof client.api.tasks[":taskId"]["$delete"]>;

export const useDeleteTask = () => {
  const queryClient = useQueryClient();


  const mutation = useMutation<
    ResponseType,
    Error,
    RequestType
  >({

    mutationFn: async ({ param }) => {
      const response = await client.api.tasks[":taskId"]["$delete"]({ param });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          const error = errorData && typeof errorData === 'object' && 'error' in errorData 
            ? (errorData as { error: string }).error 
            : "Failed to archive task";
          throw new Error(error);
        } catch {
          // If JSON parsing fails, use status text as fallback
          throw new Error(response.statusText || "Failed to archive task");
        }
      }
      return await response.json();
    },

    onError: (error) => {
      toast.error(error.message || "Failed to archive task");
    },

    onSuccess: () => {
      toast.success("Task archived successfully");
      queryClient.invalidateQueries();
    },

  });
  return mutation;
};